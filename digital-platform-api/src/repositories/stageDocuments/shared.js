import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';

export class StageDocumentNotFoundError extends Error {
  constructor(projectId, documentId) {
    super(`Stage document not found: ${documentId} in project ${projectId}`);
    this.name = 'StageDocumentNotFoundError';
    this.statusCode = 404;
    this.projectId = projectId;
    this.documentId = documentId;
  }
}

export class StageDocumentResponsibilityError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'StageDocumentResponsibilityError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class StageDocumentTaskQueryError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'StageDocumentTaskQueryError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const STAGE_DOCUMENT_RESPONSIBILITY_ERROR = {
  INVALID_RESPONSIBLE_USER_ID: 'INVALID_RESPONSIBLE_USER_ID',
  RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED: 'RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED'
};

export const STAGE_DOCUMENT_TASK_ERROR = {
  INVALID_STAGE_DOCUMENT_TASK_STATUS: 'INVALID_STAGE_DOCUMENT_TASK_STATUS',
  INVALID_PROJECT_ID: 'INVALID_PROJECT_ID'
};

function mapResponsibleUser(row) {
  if (row.responsible_user_id === null || row.responsible_user_id === undefined) {
    return null;
  }

  return {
    id: row.responsible_user_id,
    account: row.responsible_account,
    name: row.responsible_display_name,
    department: row.responsible_department,
    organizationRole: row.responsible_organization_role,
    role: row.responsible_role,
    isEnabled: row.responsible_is_enabled === null ? null : Boolean(row.responsible_is_enabled),
    filePlatformUserId: row.responsible_file_platform_user_id
  };
}

export function mapDocument(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    templateVersion: row.template_version,
    stageOrder: row.stage_order,
    stageKey: row.stage_key,
    stageName: row.stage_name,
    documentCode: row.document_code,
    documentOrder: row.document_order,
    documentName: row.document_name,
    isRequired: Boolean(row.is_required),
    defaultResponsibilityRole: row.default_responsibility_role,
    confirmRole: row.confirm_role,
    submitMode: row.submit_mode,
    targetFolderPath: row.target_folder_path,
    targetFolderId: row.target_folder_id,
    status: row.status,
    responsibleUserId: row.responsible_user_id,
    responsibleUser: mapResponsibleUser(row),
    responsibilityUpdatedByUserId: row.responsibility_updated_by_user_id,
    responsibilityUpdatedAt: row.responsibility_updated_at,
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at,
    confirmedByUserId: row.confirmed_by_user_id,
    confirmedAt: row.confirmed_at,
    returnedByUserId: row.returned_by_user_id,
    returnedAt: row.returned_at,
    returnReason: row.return_reason,
    isApplicable: row.is_applicable === undefined ? true : Boolean(row.is_applicable),
    notApplicableByUserId: row.not_applicable_by_user_id,
    notApplicableAt: row.not_applicable_at,
    notApplicableReason: row.not_applicable_reason,
    restoredApplicableByUserId: row.restored_applicable_by_user_id,
    restoredApplicableAt: row.restored_applicable_at
  };
}

export function mapStageDocumentTask(row) {
  return {
    documentId: row.document_id,
    projectId: row.project_id,
    projectCode: row.project_code,
    projectName: row.project_name,
    stageId: row.stage_id,
    stageName: row.stage_name,
    stageOrder: row.stage_order,
    documentCode: row.document_code,
    documentName: row.document_name,
    isRequired: Boolean(row.is_required),
    status: row.status,
    isApplicable: row.is_applicable === undefined ? true : Boolean(row.is_applicable),
    returnReason: row.return_reason,
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at,
    returnedAt: row.returned_at,
    responsibilityUpdatedAt: row.responsibility_updated_at
  };
}

export function mapGateDocument(row) {
  return {
    id: row.id,
    documentCode: row.document_code,
    documentName: row.document_name,
    isRequired: Boolean(row.is_required),
    isApplicable: row.is_applicable === undefined ? true : Boolean(row.is_applicable),
    status: row.status
  };
}

export function buildStageCompletenessSummary(documents) {
  const requiredDocuments = documents.filter((document) => document.isRequired && document.isApplicable !== false);
  const incompleteRequiredDocuments = requiredDocuments
    .filter((document) => document.status !== DOCUMENT_STATUS.CONFIRMED)
    .map((document) => ({
      id: document.id,
      documentCode: document.documentCode,
      documentName: document.documentName,
      status: document.status
    }));
  const requiredTotal = requiredDocuments.length;
  const incompleteRequiredCount = incompleteRequiredDocuments.length;
  const confirmedRequiredCount = requiredTotal - incompleteRequiredCount;
  const completionPercent =
    requiredTotal > 0 ? Math.round((confirmedRequiredCount / requiredTotal) * 100) : 100;

  return {
    requiredTotal,
    confirmedRequiredCount,
    incompleteRequiredCount,
    completionPercent,
    incompleteRequiredDocuments
  };
}

export async function selectProjectStageDocumentForUpdate(connection, projectId, documentId) {
  const [rows] = await connection.execute(
    `SELECT
      d.*,
      u.account AS responsible_account,
      u.display_name AS responsible_display_name,
      u.department AS responsible_department,
      u.organization_role AS responsible_organization_role,
      u.role AS responsible_role,
      u.is_enabled AS responsible_is_enabled,
      u.file_platform_user_id AS responsible_file_platform_user_id
    FROM project_stage_documents d
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.project_id = ?
      AND d.id = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, documentId]
  );

  if (rows.length === 0) {
    throw new StageDocumentNotFoundError(projectId, documentId);
  }

  return rows[0];
}

export async function selectProjectStageDocument(connection, projectId, documentId) {
  return selectProjectStageDocumentWithResponsibleUser(connection, projectId, documentId);
}

export async function selectProjectStageDocumentWithResponsibleUser(connection, projectId, documentId) {
  const [rows] = await connection.execute(
    `SELECT
      d.*,
      u.account AS responsible_account,
      u.display_name AS responsible_display_name,
      u.department AS responsible_department,
      u.organization_role AS responsible_organization_role,
      u.role AS responsible_role,
      u.is_enabled AS responsible_is_enabled,
      u.file_platform_user_id AS responsible_file_platform_user_id
    FROM project_stage_documents d
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.project_id = ?
      AND d.id = ?
    LIMIT 1`,
    [projectId, documentId]
  );

  if (rows.length === 0) {
    throw new StageDocumentNotFoundError(projectId, documentId);
  }

  return rows[0];
}
