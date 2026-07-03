import { pool } from '../../db/pool.js';
import {
  BUSINESS_DEPARTMENT,
  canSubmitStageDocument,
  isCenterManagerUser,
  isGeneralManagerAssistantUser,
  isSystemAdminUser
} from '../../domain/organization.js';
import { assertDocumentIsApplicable } from '../../domain/stageDocumentApplicability.js';
import {
  buildDocumentStatusTransition,
  DOCUMENT_STATUS_ACTION,
  normalizeReturnReason,
  StageDocumentStatusError
} from '../../domain/stageDocumentStatus.js';
import { COMPLETION_MODE, DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import {
  INITIATION_NOTICE_DOCUMENT_CODE,
  isInitiationOnlineFormDocument,
  isInitiationReviewDocument
} from '../../domain/initiationReview.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import {
  DESIGN_CHANGE_SOURCE_DOCUMENT_CODE,
  DESIGN_CHANGE_TARGET_DOCUMENT_CODES,
  REWORK_CLASS,
  getAClassReworkCandidateCodes,
  getReworkClass
} from '../../domain/stageDocumentPreciseRework.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import {
  mapDocument,
  getDocumentCompletionMode,
  isRevisionRequired,
  isRevisionResubmitted,
  isReviewCompletionMode,
  isSubmitCompletionMode,
  selectProjectStageDocument,
  selectProjectStageDocumentForUpdate
} from './shared.js';
import { isStageDocumentReviewAuthority } from './accessControl.js';
import { selectProjectPermissionContext } from './permissionContext.js';
import {
  activateInitiationReviewNodesForDocument,
  assertInitiationNoticeSubmitGateReady,
  attachInitiationReviewToStageDocumentRows,
  restoreInitiationReviewNodesAfterReworkCleared
} from './initiationReviewRepository.js';

function isInitiationNoticeDocument(document) {
  return String(document?.document_code ?? document?.documentCode ?? '') === INITIATION_NOTICE_DOCUMENT_CODE;
}

function assertOnlineFormDocumentSubmitSource({ action, currentDocument, allowOnlineFormDocumentSubmit }) {
  if (
    action !== DOCUMENT_STATUS_ACTION.SUBMIT ||
    !isInitiationOnlineFormDocument(currentDocument) ||
    allowOnlineFormDocumentSubmit
  ) {
    return;
  }

  throw new StageDocumentStatusError(
    'ONLINE_FORM_SUBMISSION_REQUIRED',
    'This stage document must be submitted through the online form endpoint',
    409,
    {
      documentId: currentDocument.id,
      documentCode: currentDocument.document_code ?? currentDocument.documentCode ?? null
    }
  );
}

function assertOnlineFormDocumentRevisionCompletionSource(currentDocument) {
  if (!isInitiationOnlineFormDocument(currentDocument)) {
    return;
  }

  throw new StageDocumentStatusError(
    'ONLINE_FORM_REVISION_COMPLETION_REQUIRED',
    'This stage document revision must be completed by resubmitting the online form',
    409,
    {
      documentId: currentDocument.id,
      documentCode: currentDocument.document_code ?? currentDocument.documentCode ?? null
    }
  );
}

function assertUserCanUpdateDocumentStatus({ user, action, currentDocument, project }) {
  if (project?.status === PROJECT_STATUS.ENDED) {
    throw new StageDocumentStatusError(
      'PROJECT_ALREADY_ENDED',
      'Project has ended and stage document status cannot be updated',
      409,
      ['projectId']
    );
  }

  if (isGeneralManagerAssistantUser(user) || isSystemAdminUser(user)) {
    throw new StageDocumentStatusError(
      'FORBIDDEN_OPERATION',
      'Current user cannot update stage document status',
      403,
      ['organizationRole']
    );
  }

  if (action === DOCUMENT_STATUS_ACTION.CONFIRM || action === DOCUMENT_STATUS_ACTION.RETURN) {
    if (!isStageDocumentReviewAuthority(user, currentDocument)) {
      throw new StageDocumentStatusError(
        'FORBIDDEN_OPERATION',
        'Current user cannot approve stage document',
        403,
        ['organizationRole']
      );
    }
    return;
  }

  if (action === DOCUMENT_STATUS_ACTION.SUBMIT) {
    if (isInitiationNoticeDocument(currentDocument)) {
      if (!isCenterManagerUser(user) || user.department !== BUSINESS_DEPARTMENT.MARKETING_CENTER) {
        throw new StageDocumentStatusError(
          'FORBIDDEN_OPERATION',
          'Only marketing center manager can submit initiation notice',
          403,
          ['organizationRole']
        );
      }
      return;
    }

    if (!canSubmitStageDocument(user, { project, document: currentDocument })) {
      throw new StageDocumentStatusError(
        'FORBIDDEN_OPERATION',
        'Current user cannot submit this stage document',
        403,
        ['responsibleUserId']
      );
    }
  }
}

function assertDocumentCompletionModeAllowsAction(action, currentDocument) {
  if (
    isInitiationReviewDocument(currentDocument) &&
    (action === DOCUMENT_STATUS_ACTION.CONFIRM || action === DOCUMENT_STATUS_ACTION.RETURN)
  ) {
    throw new StageDocumentStatusError(
      'INITIATION_REVIEW_REQUIRES_DEDICATED_ENDPOINT',
      '1.2 initiation approval must use dedicated multi-node review endpoints',
      409,
      ['documentId']
    );
  }

  if (
    (action === DOCUMENT_STATUS_ACTION.CONFIRM || action === DOCUMENT_STATUS_ACTION.RETURN) &&
    !isReviewCompletionMode(getDocumentCompletionMode(currentDocument))
  ) {
    throw new StageDocumentStatusError(
      'DOCUMENT_REVIEW_NOT_REQUIRED',
      'Current document does not require review',
      409,
      ['completionMode']
    );
  }
}

function hasPayloadTargets(value) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null;
}

function normalizeDocumentIdList(value, fieldName) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new StageDocumentStatusError(
      'INVALID_REVISION_TARGETS',
      `${fieldName} must be an array`,
      400,
      [fieldName]
    );
  }

  const ids = [];
  const seen = new Set();
  for (const item of value) {
    const id = Number(item);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new StageDocumentStatusError(
        'INVALID_REVISION_TARGETS',
        `${fieldName} contains invalid document id`,
        400,
        [fieldName]
      );
    }

    if (!seen.has(id)) {
      ids.push(id);
      seen.add(id);
    }
  }

  return ids;
}

function assertReviewActionAllowedForRevision(action, currentDocument) {
  if (
    (action !== DOCUMENT_STATUS_ACTION.CONFIRM && action !== DOCUMENT_STATUS_ACTION.RETURN) ||
    !isRevisionRequired(currentDocument)
  ) {
    return;
  }

  if (!isRevisionResubmitted(currentDocument)) {
    throw new StageDocumentStatusError(
      'REVISION_RESUBMIT_REQUIRED',
      'Revision-required document must be resubmitted before review action',
      409,
      ['revisionRequired', 'revisionResubmittedAt']
    );
  }
}

function buildRevisionSubmitTransition(currentDocument, { allowOnlineFormDocumentSubmit = false } = {}) {
  if (
    isRevisionRequired(currentDocument) &&
    isReviewCompletionMode(getDocumentCompletionMode(currentDocument))
  ) {
    return {
      nextStatus: DOCUMENT_STATUS.SUBMITTED,
      returnReason: null,
      clearReturnTrace: true,
      isRevisionResubmit: true
    };
  }

  if (
    allowOnlineFormDocumentSubmit &&
    isRevisionRequired(currentDocument) &&
    isInitiationOnlineFormDocument(currentDocument) &&
    isSubmitCompletionMode(getDocumentCompletionMode(currentDocument))
  ) {
    return {
      nextStatus: DOCUMENT_STATUS.SUBMITTED,
      returnReason: null,
      clearReturnTrace: true,
      clearRevision: true,
      isRevisionCompleteBySubmit: true
    };
  }

  return null;
}

async function applyDocumentStatusUpdate(connection, projectId, documentId, action, userId, transition) {
  if (action === DOCUMENT_STATUS_ACTION.SUBMIT) {
    if (transition.clearRevision) {
      await connection.execute(
        `UPDATE project_stage_documents
        SET status = ?,
          submitted_by_user_id = ?,
          submitted_at = CURRENT_TIMESTAMP,
          revision_required = 0,
          revision_completed_by_user_id = ?,
          revision_completed_at = CURRENT_TIMESTAMP,
          revision_resubmitted_by_user_id = NULL,
          revision_resubmitted_at = NULL,
          returned_by_user_id = NULL,
          returned_at = NULL,
          return_reason = NULL
        WHERE project_id = ?
          AND id = ?`,
        [transition.nextStatus, userId, userId, projectId, documentId]
      );
      return;
    }

    if (transition.isRevisionResubmit) {
      await connection.execute(
        `UPDATE project_stage_documents
        SET status = ?,
          submitted_by_user_id = ?,
          submitted_at = CURRENT_TIMESTAMP,
          revision_resubmitted_by_user_id = ?,
          revision_resubmitted_at = CURRENT_TIMESTAMP,
          returned_by_user_id = NULL,
          returned_at = NULL,
          return_reason = NULL
        WHERE project_id = ?
          AND id = ?`,
        [transition.nextStatus, userId, userId, projectId, documentId]
      );
      return;
    }

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
    if (transition.clearRevision) {
      await connection.execute(
        `UPDATE project_stage_documents
        SET status = ?,
          confirmed_by_user_id = ?,
          confirmed_at = CURRENT_TIMESTAMP,
          revision_required = 0,
          revision_completed_by_user_id = ?,
          revision_completed_at = CURRENT_TIMESTAMP
        WHERE project_id = ?
          AND id = ?`,
        [transition.nextStatus, userId, userId, projectId, documentId]
      );
      return;
    }

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

  if (transition.clearRevisionResubmit) {
    await connection.execute(
      `UPDATE project_stage_documents
      SET status = ?,
        returned_by_user_id = ?,
        returned_at = CURRENT_TIMESTAMP,
        return_reason = ?,
        revision_resubmitted_by_user_id = NULL,
        revision_resubmitted_at = NULL
      WHERE project_id = ?
        AND id = ?`,
      [transition.nextStatus, userId, transition.returnReason, projectId, documentId]
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

async function selectRevisionTargetDocumentsForUpdate(connection, projectId, targetDocumentIds) {
  if (targetDocumentIds.length === 0) {
    return [];
  }

  const [rows] = await connection.execute(
    `SELECT *
    FROM project_stage_documents
    WHERE project_id = ?
      AND id IN (${targetDocumentIds.map(() => '?').join(', ')})
    FOR UPDATE`,
    [projectId, ...targetDocumentIds]
  );

  return rows;
}

function assertNoTargets(ids, fieldName) {
  if (ids.length > 0) {
    throw new StageDocumentStatusError(
      'REVISION_TARGETS_NOT_ALLOWED',
      `${fieldName} is not allowed for this document return`,
      400,
      [fieldName]
    );
  }
}

function assertAllSelectedTargetsFound(selectedIds, rows, fieldName) {
  if (rows.length !== selectedIds.length) {
    throw new StageDocumentStatusError(
      'INVALID_REVISION_TARGETS',
      'Selected revision target does not belong to current project',
      400,
      [fieldName]
    );
  }
}

function assertApplicableTargets(rows, fieldName) {
  const invalidRows = rows.filter((row) => row.is_applicable === 0 || row.is_applicable === false);
  if (invalidRows.length > 0) {
    throw new StageDocumentStatusError(
      'REVISION_TARGET_NOT_APPLICABLE',
      'Revision target is not applicable',
      409,
      [fieldName]
    );
  }
}

async function markRevisionTargets({
  connection,
  projectId,
  sourceDocument,
  targetDocuments,
  userId,
  revisionReason,
  requestField
}) {
  for (const targetDocument of targetDocuments) {
    await connection.execute(
      `UPDATE project_stage_documents
      SET revision_required = 1,
        revision_reason = ?,
        revision_source_document_id = ?,
        revision_requested_by_user_id = ?,
        revision_requested_at = CURRENT_TIMESTAMP,
        revision_resubmitted_by_user_id = NULL,
        revision_resubmitted_at = NULL,
        revision_completed_by_user_id = NULL,
        revision_completed_at = NULL
      WHERE project_id = ?
        AND id = ?`,
      [revisionReason, sourceDocument.id, userId, projectId, targetDocument.id]
    );
    await insertOperationLog(connection, {
      projectId,
      actorUserId: userId,
      actionType: OPERATION_ACTION_TYPE.DOCUMENT_REVISION_REQUESTED,
      targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
      targetId: targetDocument.id,
      summary: `要求资料返工：${sourceDocument.document_name} -> ${targetDocument.document_name}`,
      details: {
        sourceDocumentId: sourceDocument.id,
        sourceDocumentCode: sourceDocument.document_code,
        sourceDocumentName: sourceDocument.document_name,
        targetDocumentId: targetDocument.id,
        targetDocumentCode: targetDocument.document_code,
        targetDocumentName: targetDocument.document_name,
        revisionReason,
        requestedByUserId: userId,
        requestedAt: new Date().toISOString(),
        requestField
      }
    });
  }
}

async function markDesignChangeTargets({
  connection,
  projectId,
  sourceDocument,
  targetDocuments,
  userId,
  revisionReason
}) {
  for (const targetDocument of targetDocuments) {
    await connection.execute(
      `UPDATE project_stage_documents
      SET is_applicable = 1,
        not_applicable_by_user_id = NULL,
        not_applicable_at = NULL,
        not_applicable_reason = NULL,
        restored_applicable_by_user_id = ?,
        restored_applicable_at = CURRENT_TIMESTAMP,
        revision_required = 1,
        revision_reason = ?,
        revision_source_document_id = ?,
        revision_requested_by_user_id = ?,
        revision_requested_at = CURRENT_TIMESTAMP,
        revision_resubmitted_by_user_id = NULL,
        revision_resubmitted_at = NULL,
        revision_completed_by_user_id = NULL,
        revision_completed_at = NULL
      WHERE project_id = ?
        AND id = ?`,
      [userId, revisionReason, sourceDocument.id, userId, projectId, targetDocument.id]
    );
  }

  await markRevisionTargets({
    connection,
    projectId,
    sourceDocument,
    targetDocuments,
    userId,
    revisionReason,
    requestField: 'designChangeTargetDocumentIds'
  });
}

async function applyReturnReworkTargets({
  connection,
  projectId,
  currentDocument,
  userId,
  revisionTargetDocumentIds,
  designChangeTargetDocumentIds,
  revisionReason
}) {
  const reworkClass = getReworkClass(currentDocument.document_code);

  if (reworkClass === REWORK_CLASS.A) {
    assertNoTargets(designChangeTargetDocumentIds, 'designChangeTargetDocumentIds');
    if (revisionTargetDocumentIds.length === 0) {
      throw new StageDocumentStatusError(
        'REVISION_TARGETS_REQUIRED',
        'A-class document return requires at least one revision target',
        400,
        ['revisionTargetDocumentIds']
      );
    }

    const allowedCodes = new Set(getAClassReworkCandidateCodes(currentDocument.document_code));
    const targetDocuments = await selectRevisionTargetDocumentsForUpdate(
      connection,
      projectId,
      revisionTargetDocumentIds
    );
    assertAllSelectedTargetsFound(revisionTargetDocumentIds, targetDocuments, 'revisionTargetDocumentIds');
    const invalidRows = targetDocuments.filter((row) => !allowedCodes.has(row.document_code));
    if (invalidRows.length > 0) {
      throw new StageDocumentStatusError(
        'INVALID_REVISION_TARGETS',
        'Selected revision target is not in fixed candidate range',
        400,
        ['revisionTargetDocumentIds']
      );
    }
    assertApplicableTargets(targetDocuments, 'revisionTargetDocumentIds');
    await markRevisionTargets({
      connection,
      projectId,
      sourceDocument: currentDocument,
      targetDocuments,
      userId,
      revisionReason,
      requestField: 'revisionTargetDocumentIds'
    });
    return;
  }

  assertNoTargets(revisionTargetDocumentIds, 'revisionTargetDocumentIds');

  if (currentDocument.document_code === DESIGN_CHANGE_SOURCE_DOCUMENT_CODE) {
    if (designChangeTargetDocumentIds.length === 0) {
      throw new StageDocumentStatusError(
        'DESIGN_CHANGE_TARGETS_REQUIRED',
        '5.12 return requires at least one design change target',
        400,
        ['designChangeTargetDocumentIds']
      );
    }

    const targetDocuments = await selectRevisionTargetDocumentsForUpdate(
      connection,
      projectId,
      designChangeTargetDocumentIds
    );
    assertAllSelectedTargetsFound(designChangeTargetDocumentIds, targetDocuments, 'designChangeTargetDocumentIds');
    const allowedCodes = new Set(DESIGN_CHANGE_TARGET_DOCUMENT_CODES);
    const invalidRows = targetDocuments.filter((row) => !allowedCodes.has(row.document_code));
    if (invalidRows.length > 0) {
      throw new StageDocumentStatusError(
        'INVALID_DESIGN_CHANGE_TARGETS',
        'Design change targets must be 5.13-5.16',
        400,
        ['designChangeTargetDocumentIds']
      );
    }
    await markDesignChangeTargets({
      connection,
      projectId,
      sourceDocument: currentDocument,
      targetDocuments,
      userId,
      revisionReason
    });
    return;
  }

  assertNoTargets(designChangeTargetDocumentIds, 'designChangeTargetDocumentIds');
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
    const requiresReview = isReviewCompletionMode(getDocumentCompletionMode(currentDocument));
    return {
      projectId,
      actorUserId: userId,
      actionType: OPERATION_ACTION_TYPE.DOCUMENT_SUBMITTED,
      targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
      targetId: documentId,
      summary: `${requiresReview ? '提交资料审核' : '提交资料'}：${currentDocument.document_name}`,
      details: {
        ...baseDetails,
        completionMode: getDocumentCompletionMode(currentDocument)
      }
    };
  }

  if (action === DOCUMENT_STATUS_ACTION.CONFIRM) {
    return {
      projectId,
      actorUserId: userId,
      actionType: OPERATION_ACTION_TYPE.DOCUMENT_CONFIRMED,
      targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
      targetId: documentId,
      summary: `资料审核通过：${currentDocument.document_name}`,
      details: baseDetails
    };
  }

  return {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.DOCUMENT_RETURNED,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: documentId,
    summary: `退回资料审核：${currentDocument.document_name}`,
    details: {
      ...baseDetails,
      returnReason: transition.returnReason
    }
  };
}

function buildRevisionCompletedOperationLogPayload({ projectId, documentId, userId, currentDocument }) {
  return {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.DOCUMENT_REVISION_COMPLETED,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: documentId,
    summary: `完成资料返工：${currentDocument.document_name}`,
    details: {
      sourceDocumentId: currentDocument.revision_source_document_id,
      targetDocumentId: documentId,
      targetDocumentCode: currentDocument.document_code,
      targetDocumentName: currentDocument.document_name,
      revisionReason: currentDocument.revision_reason,
      completedByUserId: userId,
      completedAt: new Date().toISOString()
    }
  };
}

function buildTransitionForAction({ action, currentDocument, returnReason, allowOnlineFormDocumentSubmit = false }) {
  if (action === DOCUMENT_STATUS_ACTION.SUBMIT) {
    const revisionTransition = buildRevisionSubmitTransition(currentDocument, { allowOnlineFormDocumentSubmit });
    if (revisionTransition) {
      return revisionTransition;
    }
  }

  const transition = buildDocumentStatusTransition({
    action,
    currentStatus: currentDocument.status,
    returnReason
  });

  if (action === DOCUMENT_STATUS_ACTION.CONFIRM && isRevisionRequired(currentDocument)) {
    return {
      ...transition,
      clearRevision: true
    };
  }

  if (action === DOCUMENT_STATUS_ACTION.RETURN && isRevisionRequired(currentDocument)) {
    return {
      ...transition,
      clearRevisionResubmit: true
    };
  }

  return transition;
}

export async function updateProjectStageDocumentStatus({
  connection: providedConnection = null,
  projectId,
  documentId,
  action,
  user,
  allowOnlineFormDocumentSubmit = false,
  returnReason = '',
  revisionTargetDocumentIds: rawRevisionTargetDocumentIds,
  designChangeTargetDocumentIds: rawDesignChangeTargetDocumentIds
}) {
  const connection = providedConnection || (await pool.getConnection());
  const ownsConnection = !providedConnection;

  try {
    if (ownsConnection) {
      await connection.beginTransaction();
    }
    const currentDocument = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    const project = await selectProjectPermissionContext(connection, projectId, user);
    assertDocumentCompletionModeAllowsAction(action, currentDocument);
    assertOnlineFormDocumentSubmitSource({ action, currentDocument, allowOnlineFormDocumentSubmit });
    assertUserCanUpdateDocumentStatus({ user, action, currentDocument, project });
    assertReviewActionAllowedForRevision(action, currentDocument);
    assertDocumentIsApplicable(
      currentDocument.is_applicable === undefined ? true : Boolean(currentDocument.is_applicable)
    );
    const transition = buildTransitionForAction({
      action,
      currentDocument,
      returnReason,
      allowOnlineFormDocumentSubmit
    });
    if (action === DOCUMENT_STATUS_ACTION.SUBMIT && isInitiationNoticeDocument(currentDocument)) {
      await assertInitiationNoticeSubmitGateReady(connection, projectId);
    }

    if (action === DOCUMENT_STATUS_ACTION.RETURN) {
      const normalizedReason = normalizeReturnReason(returnReason);
      await applyReturnReworkTargets({
        connection,
        projectId,
        currentDocument,
        userId: user.id,
        revisionTargetDocumentIds: normalizeDocumentIdList(
          rawRevisionTargetDocumentIds,
          'revisionTargetDocumentIds'
        ),
        designChangeTargetDocumentIds: normalizeDocumentIdList(
          rawDesignChangeTargetDocumentIds,
          'designChangeTargetDocumentIds'
        ),
        revisionReason: normalizedReason
      });
    } else if (hasPayloadTargets(rawRevisionTargetDocumentIds) || hasPayloadTargets(rawDesignChangeTargetDocumentIds)) {
      throw new StageDocumentStatusError(
        'REVISION_TARGETS_NOT_ALLOWED',
        'Revision targets are only allowed on document return',
        400,
        ['revisionTargetDocumentIds', 'designChangeTargetDocumentIds']
      );
    }

    await applyDocumentStatusUpdate(connection, projectId, documentId, action, user.id, transition);
    if (action === DOCUMENT_STATUS_ACTION.SUBMIT && isInitiationReviewDocument(currentDocument)) {
      await activateInitiationReviewNodesForDocument({
        connection,
        projectId,
        document: {
          ...currentDocument,
          status: transition.nextStatus
        },
        userId: user.id
      });
    }
    const updatedDocument = await selectProjectStageDocument(connection, projectId, documentId);
    await insertOperationLog(
      connection,
      buildStatusOperationLogPayload({ projectId, documentId, action, userId: user.id, currentDocument, transition })
    );
    if (transition.clearRevision) {
      await restoreInitiationReviewNodesAfterReworkCleared({
        connection,
        projectId,
        targetDocument: currentDocument,
        userId: user.id
      });
      await insertOperationLog(
        connection,
        buildRevisionCompletedOperationLogPayload({ projectId, documentId, userId: user.id, currentDocument })
      );
    }
    if (ownsConnection) {
      await connection.commit();
    }

    const [updatedDocumentWithInitiationReview] = await attachInitiationReviewToStageDocumentRows(
      connection,
      [updatedDocument],
      user
    );
    return mapDocument(updatedDocumentWithInitiationReview);
  } catch (error) {
    if (ownsConnection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (ownsConnection) {
      connection.release();
    }
  }
}

export async function completeProjectStageDocumentRevision({ projectId, documentId, user }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const currentDocument = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    const project = await selectProjectPermissionContext(connection, projectId, user);
    const completionMode = getDocumentCompletionMode(currentDocument);

    assertOnlineFormDocumentRevisionCompletionSource(currentDocument);
    assertUserCanUpdateDocumentStatus({
      user,
      action: DOCUMENT_STATUS_ACTION.SUBMIT,
      currentDocument,
      project
    });
    assertDocumentIsApplicable(
      currentDocument.is_applicable === undefined ? true : Boolean(currentDocument.is_applicable)
    );

    if (!isRevisionRequired(currentDocument)) {
      throw new StageDocumentStatusError(
        'REVISION_NOT_REQUIRED',
        'Current document does not require revision',
        409,
        ['revisionRequired']
      );
    }

    if (!isSubmitCompletionMode(completionMode)) {
      throw new StageDocumentStatusError(
        'REVISION_COMPLETION_NOT_ALLOWED',
        'Current document revision must be completed by review confirmation',
        409,
        ['completionMode']
      );
    }

    if (![DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED].includes(currentDocument.status)) {
      throw new StageDocumentStatusError(
        'REVISION_COMPLETION_NOT_READY',
        'Current document must be submitted before completing revision',
        409,
        ['status']
      );
    }

    await connection.execute(
      `UPDATE project_stage_documents
      SET revision_required = 0,
        revision_completed_by_user_id = ?,
        revision_completed_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND id = ?`,
      [user.id, projectId, documentId]
    );
    await restoreInitiationReviewNodesAfterReworkCleared({
      connection,
      projectId,
      targetDocument: currentDocument,
      userId: user.id
    });
    await insertOperationLog(
      connection,
      buildRevisionCompletedOperationLogPayload({ projectId, documentId, userId: user.id, currentDocument })
    );
    const updatedDocument = await selectProjectStageDocument(connection, projectId, documentId);
    await connection.commit();

    const [updatedDocumentWithInitiationReview] = await attachInitiationReviewToStageDocumentRows(
      pool,
      [updatedDocument],
      user
    );
    return mapDocument(updatedDocumentWithInitiationReview);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
