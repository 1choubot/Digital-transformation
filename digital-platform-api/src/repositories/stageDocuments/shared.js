import { COMPLETION_MODE, DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import { isInitiationReviewDocumentCode } from '../../domain/initiationReview.js';
import {
  getAClassReworkCandidateCodes,
  getDesignChangeTargetDocumentCodes,
  getReworkClass
} from '../../domain/stageDocumentPreciseRework.js';

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

export const COMPLETION_STATUS = {
  INCOMPLETE: 'incomplete',
  PENDING_REVIEW: 'pending_review',
  REVISION_REQUIRED: 'revision_required',
  COMPLETED: 'completed',
  NOT_APPLICABLE: 'not_applicable'
};

const REVIEW_COMPLETION_MODES = new Set([
  COMPLETION_MODE.APPROVAL_REQUIRED,
  COMPLETION_MODE.CONDITIONAL_APPROVAL
]);
const SUBMIT_COMPLETION_MODES = new Set([
  COMPLETION_MODE.SUBMIT_ONLY,
  COMPLETION_MODE.CONDITIONAL_SUBMIT
]);

export function getDocumentCompletionMode(document) {
  return document?.completionMode ?? document?.completion_mode ?? COMPLETION_MODE.APPROVAL_REQUIRED;
}

export function isReviewCompletionMode(completionMode) {
  return REVIEW_COMPLETION_MODES.has(completionMode);
}

export function isSubmitCompletionMode(completionMode) {
  return SUBMIT_COMPLETION_MODES.has(completionMode);
}

export function isRevisionRequired(document) {
  const value = document?.revisionRequired ?? document?.revision_required;
  return value === true || value === 1 || value === '1';
}

export function isRevisionResubmitted(document) {
  if (!isRevisionRequired(document)) {
    return false;
  }

  const status = document?.status ?? DOCUMENT_STATUS.NOT_SUBMITTED;
  if (status !== DOCUMENT_STATUS.SUBMITTED) {
    return false;
  }

  if (typeof document?.revisionResubmitted === 'boolean') {
    return document.revisionResubmitted;
  }

  return Boolean(document?.revisionResubmittedAt ?? document?.revision_resubmitted_at);
}

export function deriveStageDocumentCompletion(document) {
  const completionMode = getDocumentCompletionMode(document);
  const status = document?.status ?? DOCUMENT_STATUS.NOT_SUBMITTED;
  const documentCode = document?.documentCode ?? document?.document_code ?? null;
  const isApplicableValue = document?.isApplicable ?? document?.is_applicable;
  const isApplicable = isApplicableValue === undefined ? true : Boolean(isApplicableValue);

  if (!isApplicable) {
    return {
      completionMode,
      isApplicable,
      isComplete: true,
      completionStatus: COMPLETION_STATUS.NOT_APPLICABLE
    };
  }

  if (isInitiationReviewDocumentCode(documentCode)) {
    const initiationReview = document?.initiationReview ?? document?.initiation_review ?? null;
    const isComplete = initiationReview?.isComplete === true;
    const blockedByRework =
      initiationReview?.blockedByRework === true ||
      initiationReview?.reworkBlocked === true ||
      initiationReview?.rework_blocked === true;

    return {
      completionMode,
      isApplicable,
      isComplete,
      completionStatus: isComplete
        ? COMPLETION_STATUS.COMPLETED
        : blockedByRework
          ? COMPLETION_STATUS.REVISION_REQUIRED
          : [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED].includes(status)
            ? COMPLETION_STATUS.PENDING_REVIEW
            : COMPLETION_STATUS.INCOMPLETE
    };
  }

  if (isRevisionRequired(document)) {
    return {
      completionMode,
      isApplicable,
      isComplete: false,
      completionStatus:
        isReviewCompletionMode(completionMode) && isRevisionResubmitted(document)
          ? COMPLETION_STATUS.PENDING_REVIEW
          : COMPLETION_STATUS.REVISION_REQUIRED
    };
  }

  if (status === DOCUMENT_STATUS.RETURNED) {
    return {
      completionMode,
      isApplicable,
      isComplete: false,
      completionStatus: COMPLETION_STATUS.INCOMPLETE
    };
  }

  if (SUBMIT_COMPLETION_MODES.has(completionMode)) {
    const isComplete = status === DOCUMENT_STATUS.SUBMITTED || status === DOCUMENT_STATUS.CONFIRMED;
    return {
      completionMode,
      isApplicable,
      isComplete,
      completionStatus: isComplete ? COMPLETION_STATUS.COMPLETED : COMPLETION_STATUS.INCOMPLETE
    };
  }

  if (REVIEW_COMPLETION_MODES.has(completionMode)) {
    if (status === DOCUMENT_STATUS.CONFIRMED) {
      return {
        completionMode,
        isApplicable,
        isComplete: true,
        completionStatus: COMPLETION_STATUS.COMPLETED
      };
    }

    return {
      completionMode,
      isApplicable,
      isComplete: false,
      completionStatus:
        status === DOCUMENT_STATUS.SUBMITTED
          ? COMPLETION_STATUS.PENDING_REVIEW
          : COMPLETION_STATUS.INCOMPLETE
    };
  }

  return {
    completionMode,
    isApplicable,
    isComplete: false,
    completionStatus: COMPLETION_STATUS.INCOMPLETE
  };
}

export function isStageDocumentComplete(document) {
  return deriveStageDocumentCompletion(document).isComplete;
}

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

function mapRevisionSourceDocument(row) {
  if (!row.revision_source_document_id) {
    return null;
  }

  return {
    id: row.revision_source_document_id,
    documentCode: row.revision_source_document_code ?? null,
    documentName: row.revision_source_document_name ?? null
  };
}

export function mapReworkCandidate(document) {
  return {
    id: document.id,
    documentCode: document.documentCode ?? document.document_code,
    documentName: document.documentName ?? document.document_name,
    responsibleUserId: document.responsibleUserId ?? document.responsible_user_id ?? null,
    responsibleUser: document.responsibleUser ?? mapResponsibleUser(document),
    status: document.status,
    completionMode: getDocumentCompletionMode(document),
    completionStatus: deriveStageDocumentCompletion(document).completionStatus,
    isComplete: deriveStageDocumentCompletion(document).isComplete,
    isApplicable: document.isApplicable ?? (document.is_applicable === undefined ? true : Boolean(document.is_applicable))
  };
}

export function attachReworkCandidatesToDocuments(documents) {
  const byCode = new Map(documents.map((document) => [document.documentCode, document]));

  return documents.map((document) => {
    const reworkClass = getReworkClass(document.documentCode);
    const reworkCandidates = getAClassReworkCandidateCodes(document.documentCode)
      .map((code) => byCode.get(code))
      .filter((candidate) => candidate && candidate.isApplicable !== false)
      .map(mapReworkCandidate);
    const designChangeCandidates = getDesignChangeTargetDocumentCodes(document.documentCode)
      .map((code) => byCode.get(code))
      .filter(Boolean)
      .map(mapReworkCandidate);

    return {
      ...document,
      reworkClass,
      reworkCandidates,
      designChangeCandidates
    };
  });
}

export function mapDocument(row) {
  const completion = deriveStageDocumentCompletion(row);
  const revisionRequired = isRevisionRequired(row);

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
    ownerDepartment: row.owner_department ?? null,
    reviewDepartment: row.review_department ?? null,
    completionMode: completion.completionMode,
    submitMode: row.submit_mode,
    targetFolderPath: row.target_folder_path,
    targetFolderId: row.target_folder_id,
    status: row.status,
    initiationReview: row.initiationReview ?? row.initiation_review ?? null,
    isComplete: completion.isComplete,
    completionStatus: completion.completionStatus,
    revisionRequired,
    revisionReason: row.revision_reason ?? null,
    revisionSourceDocumentId: row.revision_source_document_id ?? null,
    revisionSourceDocument: mapRevisionSourceDocument(row),
    revisionRequestedByUserId: row.revision_requested_by_user_id ?? null,
    revisionRequestedAt: row.revision_requested_at ?? null,
    revisionResubmittedByUserId: row.revision_resubmitted_by_user_id ?? null,
    revisionResubmittedAt: row.revision_resubmitted_at ?? null,
    revisionCompletedByUserId: row.revision_completed_by_user_id ?? null,
    revisionCompletedAt: row.revision_completed_at ?? null,
    revisionResubmitted: isRevisionResubmitted(row),
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
  const completion = deriveStageDocumentCompletion(row);
  const revisionRequired = isRevisionRequired(row);

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
    ownerDepartment: row.owner_department ?? null,
    reviewDepartment: row.review_department ?? null,
    status: row.status,
    initiationReview: row.initiationReview ?? row.initiation_review ?? null,
    completionMode: completion.completionMode,
    isComplete: completion.isComplete,
    completionStatus: completion.completionStatus,
    revisionRequired,
    revisionReason: row.revision_reason ?? null,
    revisionSourceDocumentId: row.revision_source_document_id ?? null,
    revisionSourceDocument: mapRevisionSourceDocument(row),
    revisionRequestedAt: row.revision_requested_at ?? null,
    revisionResubmittedByUserId: row.revision_resubmitted_by_user_id ?? null,
    revisionResubmittedAt: row.revision_resubmitted_at ?? null,
    revisionCompletedAt: row.revision_completed_at ?? null,
    revisionResubmitted: isRevisionResubmitted(row),
    isApplicable: row.is_applicable === undefined ? true : Boolean(row.is_applicable),
    returnReason: row.return_reason,
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at,
    returnedAt: row.returned_at,
    responsibilityUpdatedAt: row.responsibility_updated_at
  };
}

export function mapGateDocument(row) {
  const completion = deriveStageDocumentCompletion(row);
  const revisionRequired = isRevisionRequired(row);

  return {
    id: row.id,
    documentCode: row.document_code,
    documentName: row.document_name,
    isRequired: Boolean(row.is_required),
    isApplicable: row.is_applicable === undefined ? true : Boolean(row.is_applicable),
    status: row.status,
    initiationReview: row.initiationReview ?? row.initiation_review ?? null,
    completionMode: completion.completionMode,
    isComplete: completion.isComplete,
    completionStatus: completion.completionStatus,
    revisionRequired,
    revisionReason: row.revision_reason ?? null,
    revisionSourceDocumentId: row.revision_source_document_id ?? null,
    revisionSourceDocument: mapRevisionSourceDocument(row),
    revisionRequestedAt: row.revision_requested_at ?? null,
    revisionResubmittedByUserId: row.revision_resubmitted_by_user_id ?? null,
    revisionResubmittedAt: row.revision_resubmitted_at ?? null,
    revisionResubmitted: isRevisionResubmitted(row)
  };
}

export function buildStageCompletenessSummary(documents) {
  const applicableDocuments = documents.filter((document) => document.isApplicable !== false);
  const incompleteRequiredDocuments = applicableDocuments
    .filter((document) => !isStageDocumentComplete(document))
    .map((document) => ({
      id: document.id,
      documentCode: document.documentCode,
      documentName: document.documentName,
      status: document.status,
      initiationReview: document.initiationReview ?? document.initiation_review ?? null,
      completionMode: getDocumentCompletionMode(document),
      isComplete: false,
      completionStatus: deriveStageDocumentCompletion(document).completionStatus,
      revisionRequired: isRevisionRequired(document),
      revisionReason: document.revisionReason ?? document.revision_reason ?? null,
      revisionSourceDocumentId: document.revisionSourceDocumentId ?? document.revision_source_document_id ?? null,
      revisionSourceDocument: document.revisionSourceDocument ?? mapRevisionSourceDocument(document),
      revisionResubmittedByUserId:
        document.revisionResubmittedByUserId ?? document.revision_resubmitted_by_user_id ?? null,
      revisionResubmittedAt: document.revisionResubmittedAt ?? document.revision_resubmitted_at ?? null,
      revisionResubmitted: isRevisionResubmitted(document)
    }));
  const requiredTotal = applicableDocuments.length;
  const incompleteRequiredCount = incompleteRequiredDocuments.length;
  const completedRequiredCount = requiredTotal - incompleteRequiredCount;
  const completionPercent =
    requiredTotal > 0 ? Math.round((completedRequiredCount / requiredTotal) * 100) : 100;

  return {
    requiredTotal,
    completedRequiredCount,
    confirmedRequiredCount: completedRequiredCount,
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
