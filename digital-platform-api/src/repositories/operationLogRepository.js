import { pool } from '../db/pool.js';

const DEFAULT_OPERATION_LOG_LIMIT = 100;
const MAX_OPERATION_LOG_LIMIT = 100;

export const OPERATION_ACTION_TYPE = {
  PROJECT_CREATED: 'project.created',
  PROJECT_CODE_UPDATED: 'project.code_updated',
  DOCUMENT_SUBMITTED: 'document.submitted',
  DOCUMENT_CONFIRMED: 'document.confirmed',
  DOCUMENT_RETURNED: 'document.returned',
  DOCUMENT_REVISION_REQUESTED: 'document.revision_requested',
  DOCUMENT_REVISION_COMPLETED: 'document.revision_completed',
  DOCUMENT_MARKED_NOT_APPLICABLE: 'document.marked_not_applicable',
  DOCUMENT_RESTORED_APPLICABLE: 'document.restored_applicable',
  DOCUMENT_RESPONSIBLE_CHANGED: 'document.responsible_changed',
  DOCUMENT_ATTACHMENT_UPLOADED: 'document.attachment_uploaded',
  DOCUMENT_ATTACHMENT_DELETED: 'document.attachment_deleted',
  FORM_UPDATED: 'form.updated',
  FORM_SUBMITTED: 'form.submitted',
  APPROVAL_SUBMITTED: 'approval.submitted',
  APPROVAL_CENTER_APPROVED: 'approval.center_approved',
  APPROVAL_CENTER_RETURNED: 'approval.center_returned',
  APPROVAL_GENERAL_APPROVED: 'approval.general_approved',
  APPROVAL_GENERAL_RETURNED: 'approval.general_returned',
  APPROVAL_RESUBMITTED: 'approval.resubmitted',
  INITIATION_REVIEW_SUBMITTED: 'initiation_review.submitted',
  INITIATION_REVIEW_BUSINESS_APPROVED: 'initiation_review.business_approved',
  INITIATION_REVIEW_BUSINESS_RETURNED: 'initiation_review.business_returned',
  INITIATION_REVIEW_TECHNICAL_APPROVED: 'initiation_review.technical_approved',
  INITIATION_REVIEW_TECHNICAL_RETURNED: 'initiation_review.technical_returned',
  INITIATION_REVIEW_GENERAL_APPROVED: 'initiation_review.general_approved',
  INITIATION_REVIEW_GENERAL_RETURNED: 'initiation_review.general_returned',
  INITIATION_REVIEW_GENERAL_ACTIVATED: 'initiation_review.general_activated',
  INITIATION_REVIEW_RESTORED: 'initiation_review.restored',
  INITIATION_REVIEW_COMPLETED: 'initiation_review.completed',
  INITIATION_EVALUATION_SUBMITTED: 'initiation.evaluation.submitted',
  INITIATION_APPROVAL_APPROVED: 'initiation.approval.approved',
  INITIATION_APPROVAL_RETURNED: 'initiation.approval.returned',
  STAGE_ADVANCED: 'stage.advanced',
  PROJECT_COMPLETED: 'project.completed'
};

export const OPERATION_TARGET_TYPE = {
  PROJECT: 'project',
  STAGE: 'stage',
  APPROVAL: 'approval',
  STAGE_DOCUMENT: 'stage_document',
  INITIATION_REVIEW: 'initiation_review',
  ONLINE_FORM: 'online_form'
};

export class OperationLogLimitError extends Error {
  constructor() {
    super('Invalid operation log limit');
    this.name = 'OperationLogLimitError';
    this.statusCode = 400;
    this.code = 'INVALID_OPERATION_LOG_LIMIT';
  }
}

function parseJsonValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function assertPositiveId(value, fieldName) {
  if (!Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new Error(`${fieldName} is required for business operation log`);
  }
}

function mapActor(row) {
  return {
    id: row.actor_user_id,
    account: row.actor_account,
    name: row.actor_display_name,
    department: row.actor_department,
    organizationRole: row.actor_organization_role,
    role: row.actor_role,
    isEnabled: row.actor_is_enabled === null ? null : Boolean(row.actor_is_enabled),
    filePlatformUserId: row.actor_file_platform_user_id
  };
}

function mapOperationLog(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    actorUserId: row.actor_user_id,
    actorUser: mapActor(row),
    actionType: row.action_type,
    targetType: row.target_type,
    targetId: row.target_id,
    summary: row.summary,
    detailsJson: parseJsonValue(row.details_json),
    createdAt: row.created_at
  };
}

export function normalizeOperationLogLimit(rawLimit) {
  if (rawLimit === undefined || rawLimit === null || rawLimit === '') {
    return DEFAULT_OPERATION_LOG_LIMIT;
  }

  const text = String(rawLimit).trim();
  const limit = Number.parseInt(text, 10);

  if (String(limit) !== text || !Number.isSafeInteger(limit) || limit <= 0 || limit > MAX_OPERATION_LOG_LIMIT) {
    throw new OperationLogLimitError();
  }

  return limit;
}

export async function insertOperationLog(
  executor,
  { projectId, actorUserId, actionType, targetType, targetId = null, summary, details = null }
) {
  assertPositiveId(projectId, 'projectId');
  assertPositiveId(actorUserId, 'actorUserId');

  await executor.execute(
    `INSERT INTO business_operation_logs (
      project_id,
      actor_user_id,
      action_type,
      target_type,
      target_id,
      summary,
      details_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      actorUserId,
      actionType,
      targetType,
      targetId,
      summary,
      details === null || details === undefined ? null : JSON.stringify(details)
    ]
  );
}

export async function listProjectOperationLogs(projectId, limit = DEFAULT_OPERATION_LOG_LIMIT) {
  const safeLimit = normalizeOperationLogLimit(limit);
  const [rows] = await pool.execute(
    `SELECT
      l.*,
      u.account AS actor_account,
      u.display_name AS actor_display_name,
      u.department AS actor_department,
      u.organization_role AS actor_organization_role,
      u.role AS actor_role,
      u.is_enabled AS actor_is_enabled,
      u.file_platform_user_id AS actor_file_platform_user_id
    FROM business_operation_logs l
    LEFT JOIN users u
      ON u.id = l.actor_user_id
    WHERE l.project_id = ?
    ORDER BY l.created_at DESC, l.id DESC
    LIMIT ${safeLimit}`,
    [projectId]
  );

  return rows.map(mapOperationLog);
}
