import { pool } from '../../db/pool.js';
import {
  canBeResponsibleUser,
  canManageProjectResponsibility
} from '../../domain/organization.js';
import {
  INITIATION_NOTICE_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  INITIATION_REWORK_TARGET_DOCUMENT_CODE,
  isInitiationOnlineFormDocument
} from '../../domain/initiationReview.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import {
  mapDocument,
  selectProjectStageDocumentForUpdate,
  selectProjectStageDocumentWithResponsibleUser,
  STAGE_DOCUMENT_RESPONSIBILITY_ERROR,
  StageDocumentResponsibilityError
} from './shared.js';
import {
  selectProjectPermissionContext,
  selectResponsibleUserPermissionContext
} from './permissionContext.js';
import { canManageInitiationOnlineFormResponsibility } from './accessControl.js';

function normalizeResponsibleUserId(value) {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new StageDocumentResponsibilityError(
      STAGE_DOCUMENT_RESPONSIBILITY_ERROR.INVALID_RESPONSIBLE_USER_ID,
      'Invalid responsible user id',
      400,
      ['responsibleUserId']
    );
  }

  return value;
}

function assertUserCanManageResponsibility({ user, project, currentDocument, targetResponsibleUser }) {
  if ([INITIATION_REWORK_TARGET_DOCUMENT_CODE, INITIATION_REVIEW_DOCUMENT_CODE].includes(currentDocument.document_code)) {
    if (!canManageInitiationOnlineFormResponsibility(user, currentDocument)) {
      throw new StageDocumentResponsibilityError(
        'FORBIDDEN_OPERATION',
        'Only marketing center manager can assign initiation stage document responsibility',
        403,
        ['organizationRole']
      );
    }
    return;
  }

  if (currentDocument.document_code === INITIATION_NOTICE_DOCUMENT_CODE || isInitiationOnlineFormDocument(currentDocument)) {
    throw new StageDocumentResponsibilityError(
      'FORBIDDEN_OPERATION',
      'Initiation notice does not support separate stage document responsibility assignment',
      403,
      ['documentId']
    );
  }

  if (!canManageProjectResponsibility(user, project, {
    document: currentDocument,
    targetResponsibleUser
  })) {
    throw new StageDocumentResponsibilityError(
      'FORBIDDEN_OPERATION',
      'Current user cannot manage stage document responsibility',
      403,
      ['organizationRole']
    );
  }
}

async function assertEnabledResponsibleUser(connection, responsibleUserId) {
  if (responsibleUserId === null) {
    return null;
  }

  const user = await selectResponsibleUserPermissionContext(connection, responsibleUserId);

  if (!canBeResponsibleUser(user)) {
    throw new StageDocumentResponsibilityError(
      STAGE_DOCUMENT_RESPONSIBILITY_ERROR.RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED,
      'Responsible user not found or disabled',
      409,
      ['responsibleUserId']
    );
  }

  return user;
}

function buildResponsibleChangedOperationLogPayload({
  projectId,
  documentId,
  userId,
  currentDocument,
  responsibleUserId
}) {
  return {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.DOCUMENT_RESPONSIBLE_CHANGED,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: documentId,
    summary:
      responsibleUserId === null
        ? `手工清空资料责任人：${currentDocument.document_name}`
        : `手工分配资料责任人：${currentDocument.document_name}`,
    details: {
      documentId,
      documentCode: currentDocument.document_code,
      documentName: currentDocument.document_name,
      fromResponsibleUserId: currentDocument.responsible_user_id,
      toResponsibleUserId: responsibleUserId
    }
  };
}

export async function updateProjectStageDocumentResponsibleUser({
  projectId,
  documentId,
  responsibleUserId,
  user
}) {
  const normalizedResponsibleUserId = normalizeResponsibleUserId(responsibleUserId);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const currentDocument = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    const project = await selectProjectPermissionContext(connection, projectId, user);
    const targetResponsibleUser = await assertEnabledResponsibleUser(connection, normalizedResponsibleUserId);
    assertUserCanManageResponsibility({ user, project, currentDocument, targetResponsibleUser });

    await connection.execute(
      `UPDATE project_stage_documents
      SET responsible_user_id = ?,
        responsibility_updated_by_user_id = ?,
        responsibility_updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND id = ?`,
      [normalizedResponsibleUserId, user.id, projectId, documentId]
    );

    const updatedDocument = await selectProjectStageDocumentWithResponsibleUser(connection, projectId, documentId);
    await insertOperationLog(
      connection,
      buildResponsibleChangedOperationLogPayload({
        projectId,
        documentId,
        userId: user.id,
        currentDocument,
        responsibleUserId: normalizedResponsibleUserId
      })
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
