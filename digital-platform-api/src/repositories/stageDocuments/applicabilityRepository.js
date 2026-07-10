import { pool } from '../../db/pool.js';
import { canManageStageDocumentApplicability } from '../../domain/organization.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import {
  buildDocumentApplicabilityTransition,
  DOCUMENT_APPLICABILITY_ACTION,
  StageDocumentApplicabilityError
} from '../../domain/stageDocumentApplicability.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import { tryAutoAdvanceProjectStage } from '../projects/stageAdvanceRepository.js';
import {
  mapDocument,
  selectProjectStageDocument,
  selectProjectStageDocumentForUpdate
} from './shared.js';
import { selectProjectPermissionContext } from './permissionContext.js';

function assertUserCanManageApplicability({ user, project, currentDocument }) {
  if (project?.status === PROJECT_STATUS.ENDED) {
    throw new StageDocumentApplicabilityError(
      'PROJECT_ALREADY_ENDED',
      'Project has ended and stage document applicability cannot be changed',
      409,
      ['projectId']
    );
  }

  if (!canManageStageDocumentApplicability(user, { project, document: currentDocument })) {
    throw new StageDocumentApplicabilityError(
      'FORBIDDEN_OPERATION',
      'Current user cannot change stage document applicability',
      403,
      ['organizationRole']
    );
  }
}

async function applyDocumentApplicabilityUpdate(connection, projectId, documentId, action, userId, transition) {
  if (action === DOCUMENT_APPLICABILITY_ACTION.MARK_NOT_APPLICABLE) {
    await connection.execute(
      `UPDATE project_stage_documents
      SET is_applicable = 0,
        not_applicable_by_user_id = ?,
        not_applicable_at = CURRENT_TIMESTAMP,
        not_applicable_reason = ?,
        restored_applicable_by_user_id = NULL,
        restored_applicable_at = NULL
      WHERE project_id = ?
        AND id = ?`,
      [userId, transition.notApplicableReason, projectId, documentId]
    );
    return;
  }

  await connection.execute(
    `UPDATE project_stage_documents
    SET is_applicable = 1,
      not_applicable_by_user_id = NULL,
      not_applicable_at = NULL,
      not_applicable_reason = NULL,
      restored_applicable_by_user_id = ?,
      restored_applicable_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND id = ?`,
    [userId, projectId, documentId]
  );
}

function buildApplicabilityOperationLogPayload({
  projectId,
  documentId,
  action,
  userId,
  currentDocument,
  transition
}) {
  const baseDetails = {
    documentId,
    documentCode: currentDocument.document_code,
    documentName: currentDocument.document_name,
    fromIsApplicable: currentDocument.is_applicable === undefined ? true : Boolean(currentDocument.is_applicable),
    toIsApplicable: transition.nextIsApplicable
  };

  if (action === DOCUMENT_APPLICABILITY_ACTION.MARK_NOT_APPLICABLE) {
    return {
      projectId,
      actorUserId: userId,
      actionType: OPERATION_ACTION_TYPE.DOCUMENT_MARKED_NOT_APPLICABLE,
      targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
      targetId: documentId,
      summary: `手工标记资料不适用：${currentDocument.document_name}`,
      details: {
        ...baseDetails,
        notApplicableReason: transition.notApplicableReason
      }
    };
  }

  return {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.DOCUMENT_RESTORED_APPLICABLE,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: documentId,
    summary: `手工恢复资料适用：${currentDocument.document_name}`,
    details: baseDetails
  };
}

export async function updateProjectStageDocumentApplicability({
  projectId,
  documentId,
  action,
  user,
  notApplicableReason = ''
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const currentDocument = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    const project = await selectProjectPermissionContext(connection, projectId, user);
    assertUserCanManageApplicability({ user, project, currentDocument });
    const transition = buildDocumentApplicabilityTransition({
      action,
      isApplicable: currentDocument.is_applicable === undefined ? true : Boolean(currentDocument.is_applicable),
      notApplicableReason
    });

    await applyDocumentApplicabilityUpdate(connection, projectId, documentId, action, user.id, transition);
    const updatedDocument = await selectProjectStageDocument(connection, projectId, documentId);
    await insertOperationLog(
      connection,
      buildApplicabilityOperationLogPayload({ projectId, documentId, action, userId: user.id, currentDocument, transition })
    );
    await tryAutoAdvanceProjectStage(
      {
        projectId,
        user,
        triggerAction: action === DOCUMENT_APPLICABILITY_ACTION.MARK_NOT_APPLICABLE
          ? 'document.marked_not_applicable'
          : 'document.restored_applicable',
        expectedStageOrder: currentDocument.stage_order,
        triggerMetadata: {
          documentId,
          documentCode: currentDocument.document_code,
          stageOrder: currentDocument.stage_order,
          actionType: action
        }
      },
      connection
    );
    await connection.commit();

    return mapDocument(updatedDocument);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
