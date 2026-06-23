import { pool } from '../../db/pool.js';
import {
  buildDocumentApplicabilityTransition,
  DOCUMENT_APPLICABILITY_ACTION
} from '../../domain/stageDocumentApplicability.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import {
  mapDocument,
  selectProjectStageDocument,
  selectProjectStageDocumentForUpdate
} from './shared.js';

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
  userId,
  notApplicableReason = ''
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const currentDocument = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    const transition = buildDocumentApplicabilityTransition({
      action,
      isApplicable: currentDocument.is_applicable === undefined ? true : Boolean(currentDocument.is_applicable),
      notApplicableReason
    });

    await applyDocumentApplicabilityUpdate(connection, projectId, documentId, action, userId, transition);
    const updatedDocument = await selectProjectStageDocument(connection, projectId, documentId);
    await insertOperationLog(
      connection,
      buildApplicabilityOperationLogPayload({ projectId, documentId, action, userId, currentDocument, transition })
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
