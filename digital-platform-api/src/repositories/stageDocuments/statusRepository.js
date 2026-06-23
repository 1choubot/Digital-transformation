import { pool } from '../../db/pool.js';
import { assertDocumentIsApplicable } from '../../domain/stageDocumentApplicability.js';
import {
  buildDocumentStatusTransition,
  DOCUMENT_STATUS_ACTION
} from '../../domain/stageDocumentStatus.js';
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

async function applyDocumentStatusUpdate(connection, projectId, documentId, action, userId, transition) {
  if (action === DOCUMENT_STATUS_ACTION.SUBMIT) {
    await connection.execute(
      `UPDATE project_stage_documents
      SET status = ?,
        submitted_by_user_id = ?,
        submitted_at = CURRENT_TIMESTAMP,
        returned_by_user_id = NULL,
        returned_at = NULL,
        return_reason = NULL
      WHERE project_id = ?
        AND id = ?`,
      [transition.nextStatus, userId, projectId, documentId]
    );
    return;
  }

  if (action === DOCUMENT_STATUS_ACTION.CONFIRM) {
    await connection.execute(
      `UPDATE project_stage_documents
      SET status = ?,
        confirmed_by_user_id = ?,
        confirmed_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND id = ?`,
      [transition.nextStatus, userId, projectId, documentId]
    );
    return;
  }

  await connection.execute(
    `UPDATE project_stage_documents
    SET status = ?,
      returned_by_user_id = ?,
      returned_at = CURRENT_TIMESTAMP,
      return_reason = ?
    WHERE project_id = ?
      AND id = ?`,
    [transition.nextStatus, userId, transition.returnReason, projectId, documentId]
  );
}

function buildStatusOperationLogPayload({ projectId, documentId, action, userId, currentDocument, transition }) {
  const baseDetails = {
    documentId,
    documentCode: currentDocument.document_code,
    documentName: currentDocument.document_name,
    fromStatus: currentDocument.status,
    toStatus: transition.nextStatus
  };

  if (action === DOCUMENT_STATUS_ACTION.SUBMIT) {
    return {
      projectId,
      actorUserId: userId,
      actionType: OPERATION_ACTION_TYPE.DOCUMENT_SUBMITTED,
      targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
      targetId: documentId,
      summary: `手工标记资料提交：${currentDocument.document_name}`,
      details: baseDetails
    };
  }

  if (action === DOCUMENT_STATUS_ACTION.CONFIRM) {
    return {
      projectId,
      actorUserId: userId,
      actionType: OPERATION_ACTION_TYPE.DOCUMENT_CONFIRMED,
      targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
      targetId: documentId,
      summary: `手工确认资料：${currentDocument.document_name}`,
      details: baseDetails
    };
  }

  return {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.DOCUMENT_RETURNED,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: documentId,
    summary: `手工退回资料：${currentDocument.document_name}`,
    details: {
      ...baseDetails,
      returnReason: transition.returnReason
    }
  };
}

export async function updateProjectStageDocumentStatus({ projectId, documentId, action, userId, returnReason = '' }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const currentDocument = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    assertDocumentIsApplicable(
      currentDocument.is_applicable === undefined ? true : Boolean(currentDocument.is_applicable)
    );
    const transition = buildDocumentStatusTransition({
      action,
      currentStatus: currentDocument.status,
      returnReason
    });

    await applyDocumentStatusUpdate(connection, projectId, documentId, action, userId, transition);
    const updatedDocument = await selectProjectStageDocument(connection, projectId, documentId);
    await insertOperationLog(
      connection,
      buildStatusOperationLogPayload({ projectId, documentId, action, userId, currentDocument, transition })
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
