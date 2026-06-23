import { pool } from '../../db/pool.js';
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

async function assertEnabledResponsibleUser(connection, responsibleUserId) {
  if (responsibleUserId === null) {
    return;
  }

  const [rows] = await connection.execute(
    `SELECT id
    FROM users
    WHERE id = ?
      AND is_enabled = 1
    LIMIT 1`,
    [responsibleUserId]
  );

  if (rows.length === 0) {
    throw new StageDocumentResponsibilityError(
      STAGE_DOCUMENT_RESPONSIBILITY_ERROR.RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED,
      'Responsible user not found or disabled',
      409,
      ['responsibleUserId']
    );
  }
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
  userId
}) {
  const normalizedResponsibleUserId = normalizeResponsibleUserId(responsibleUserId);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const currentDocument = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    await assertEnabledResponsibleUser(connection, normalizedResponsibleUserId);

    await connection.execute(
      `UPDATE project_stage_documents
      SET responsible_user_id = ?,
        responsibility_updated_by_user_id = ?,
        responsibility_updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND id = ?`,
      [normalizedResponsibleUserId, userId, projectId, documentId]
    );

    const updatedDocument = await selectProjectStageDocumentWithResponsibleUser(connection, projectId, documentId);
    await insertOperationLog(
      connection,
      buildResponsibleChangedOperationLogPayload({
        projectId,
        documentId,
        userId,
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
