import { pool } from '../../db/pool.js';
import { COMPLETION_MODE, DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import {
  mapStageDocumentTask,
  STAGE_DOCUMENT_TASK_ERROR,
  StageDocumentTaskQueryError
} from './shared.js';

const STAGE_DOCUMENT_TASK_STATUS_FILTERS = {
  [DOCUMENT_STATUS.NOT_SUBMITTED]: [DOCUMENT_STATUS.NOT_SUBMITTED],
  [DOCUMENT_STATUS.SUBMITTED]: [DOCUMENT_STATUS.SUBMITTED],
  [DOCUMENT_STATUS.RETURNED]: [DOCUMENT_STATUS.RETURNED],
  [DOCUMENT_STATUS.CONFIRMED]: [DOCUMENT_STATUS.CONFIRMED],
  pending: [DOCUMENT_STATUS.NOT_SUBMITTED, DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.RETURNED],
  all: [
    DOCUMENT_STATUS.NOT_SUBMITTED,
    DOCUMENT_STATUS.SUBMITTED,
    DOCUMENT_STATUS.RETURNED,
    DOCUMENT_STATUS.CONFIRMED
  ]
};

function normalizeTaskStatus(rawStatus) {
  if (rawStatus === undefined || rawStatus === null) {
    return 'pending';
  }

  if (Array.isArray(rawStatus)) {
    throw new StageDocumentTaskQueryError(
      STAGE_DOCUMENT_TASK_ERROR.INVALID_STAGE_DOCUMENT_TASK_STATUS,
      'Invalid stage document task status',
      400,
      ['status']
    );
  }

  const status = String(rawStatus).trim();
  if (!status || !Object.prototype.hasOwnProperty.call(STAGE_DOCUMENT_TASK_STATUS_FILTERS, status)) {
    throw new StageDocumentTaskQueryError(
      STAGE_DOCUMENT_TASK_ERROR.INVALID_STAGE_DOCUMENT_TASK_STATUS,
      'Invalid stage document task status',
      400,
      ['status']
    );
  }

  return status;
}

function normalizeTaskProjectId(rawProjectId) {
  if (rawProjectId === undefined || rawProjectId === null) {
    return null;
  }

  if (Array.isArray(rawProjectId)) {
    throw new StageDocumentTaskQueryError(
      STAGE_DOCUMENT_TASK_ERROR.INVALID_PROJECT_ID,
      'Invalid project id',
      400,
      ['projectId']
    );
  }

  const text = String(rawProjectId).trim();
  if (!/^[1-9]\d*$/.test(text)) {
    throw new StageDocumentTaskQueryError(
      STAGE_DOCUMENT_TASK_ERROR.INVALID_PROJECT_ID,
      'Invalid project id',
      400,
      ['projectId']
    );
  }

  const projectId = Number(text);
  if (!Number.isSafeInteger(projectId)) {
    throw new StageDocumentTaskQueryError(
      STAGE_DOCUMENT_TASK_ERROR.INVALID_PROJECT_ID,
      'Invalid project id',
      400,
      ['projectId']
    );
  }

  return projectId;
}

export function normalizeStageDocumentTaskFilters(query = {}) {
  const status = normalizeTaskStatus(query.status);
  const projectId = normalizeTaskProjectId(query.projectId);

  return {
    status,
    projectId,
    statuses: STAGE_DOCUMENT_TASK_STATUS_FILTERS[status]
  };
}

export async function listMyStageDocumentTasks(userId, filters) {
  const params = [userId, ...filters.statuses];
  const projectFilter = filters.projectId === null ? '' : 'AND d.project_id = ?';
  const statusFilter =
    filters.status === 'pending'
      ? `AND (
          (
            d.status IN (${filters.statuses.map(() => '?').join(', ')})
            OR d.revision_required = 1
          )
          AND NOT (
            d.revision_required = 1
            AND d.completion_mode IN (?, ?)
            AND d.status = ?
            AND d.revision_resubmitted_at IS NOT NULL
          )
        )`
      : `AND d.status IN (${filters.statuses.map(() => '?').join(', ')})`;

  if (filters.status === 'pending') {
    params.push(
      COMPLETION_MODE.APPROVAL_REQUIRED,
      COMPLETION_MODE.CONDITIONAL_APPROVAL,
      DOCUMENT_STATUS.SUBMITTED
    );
  }

  if (filters.projectId !== null) {
    params.push(filters.projectId);
  }

  const [rows] = await pool.execute(
    `SELECT
      d.id AS document_id,
      d.project_id,
      p.project_code,
      p.project_name,
      s.id AS stage_id,
      d.stage_name,
      d.stage_order,
      d.document_order,
      d.document_code,
      d.document_name,
      d.is_required,
      d.owner_department,
      d.review_department,
      d.completion_mode,
      d.status,
      d.is_applicable,
      d.return_reason,
      d.revision_required,
      d.revision_reason,
      d.revision_source_document_id,
      source.document_code AS revision_source_document_code,
      source.document_name AS revision_source_document_name,
      d.revision_requested_at,
      d.revision_resubmitted_by_user_id,
      d.revision_resubmitted_at,
      d.revision_completed_at,
      d.submitted_at,
      d.confirmed_at,
      d.returned_at,
      d.responsibility_updated_at
    FROM project_stage_documents d
    INNER JOIN projects p
      ON p.id = d.project_id
    LEFT JOIN project_stage_documents source
      ON source.id = d.revision_source_document_id
    LEFT JOIN project_stages s
      ON s.project_id = d.project_id
      AND s.stage_order = d.stage_order
    WHERE d.responsible_user_id = ?
      ${statusFilter}
      AND d.is_applicable = 1
      ${projectFilter}
    ORDER BY
      CASE d.status
        WHEN 'returned' THEN 1
        WHEN 'not_submitted' THEN 2
        WHEN 'submitted' THEN 3
        WHEN 'confirmed' THEN 4
        ELSE 5
      END ASC,
      CASE WHEN d.responsibility_updated_at IS NULL THEN 1 ELSE 0 END ASC,
      d.responsibility_updated_at DESC,
      p.project_code ASC,
      d.stage_order ASC,
      d.document_order ASC,
      d.id ASC`,
    params
  );

  const tasks = rows.map(mapStageDocumentTask);
  return filters.status === 'pending' ? tasks.filter((task) => !task.isComplete) : tasks;
}
