import { COMPLETION_MODE, DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import { isInitiationReviewDocumentCode } from '../../domain/initiationReview.js';
import {
  getAClassReworkCandidateCodes,
  getDesignChangeTargetDocumentCodes,
  getReworkClass
} from '../../domain/stageDocumentPreciseRework.js';
import {
  SOLUTION_DESIGN_ANALYSIS_FORM_STATUS,
  SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES,
  SOLUTION_DESIGN_GENERATED_FILE_STATUS,
  SOLUTION_DESIGN_NODE_KEY,
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_QUOTATION_FORM_STATUS,
  SOLUTION_DESIGN_QUOTATION_RESULT,
  SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS,
  SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE,
  SOLUTION_DESIGN_COST_UPLOAD_SLOT_KEYS,
  SOLUTION_DESIGN_REVIEW_FORM_STATUS,
  SOLUTION_DESIGN_UPLOAD_SLOT_KEY,
  SOLUTION_DESIGN_UPLOAD_SLOT_STATUS
} from '../../domain/solutionDesignWorkflow.js';
import {
  CONTRACT_SIGNING_NODE_KEY,
  CONTRACT_SIGNING_NODE_STATUS,
  CONTRACT_SIGNING_UPLOAD_SLOT_KEY,
  CONTRACT_SIGNING_UPLOAD_SLOT_STATUS
} from '../../domain/contractSigningWorkflow.js';

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

const SOLUTION_DESIGN_DERIVED_SOURCE = 'solution_design_workflow';
const CONTRACT_SIGNING_DERIVED_SOURCE = 'contract_signing_workflow';
const SOLUTION_DESIGN_LEGACY_DOCUMENT_CODE_BY_TARGET_CODE = Object.freeze({
  C04: '2.1',
  C05: '2.2',
  C06: '2.3',
  C07: '2.4',
  C08: '2.5',
  C09: '2.6',
  C10: '2.7',
  C11: '2.8',
  C12: '2.9',
  C13: '2.10',
  C14: '2.11',
  C15: '2.12',
  C16: '2.13',
  C17: '2.14',
  C18: '2.15'
});
const SOLUTION_DESIGN_TARGET_DOCUMENT_CODE_BY_LEGACY_CODE = new Map(
  Object.entries(SOLUTION_DESIGN_LEGACY_DOCUMENT_CODE_BY_TARGET_CODE).map(([targetCode, legacyCode]) => [
    legacyCode,
    targetCode
  ])
);
const SOLUTION_DESIGN_DOCUMENT_CODES = new Set([
  ...SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES,
  ...Object.values(SOLUTION_DESIGN_LEGACY_DOCUMENT_CODE_BY_TARGET_CODE)
]);
const CONTRACT_SIGNING_LEGACY_DOCUMENT_CODE_BY_TARGET_CODE = Object.freeze({
  C21: '3.1',
  C23: '3.2',
  C25: '4.1'
});
const CONTRACT_SIGNING_TARGET_DOCUMENT_CODE_BY_LEGACY_CODE = new Map(
  Object.entries(CONTRACT_SIGNING_LEGACY_DOCUMENT_CODE_BY_TARGET_CODE).map(([targetCode, legacyCode]) => [
    legacyCode,
    targetCode
  ])
);
const CONTRACT_SIGNING_DERIVED_DOCUMENT_CODES = Object.freeze(['C20', 'C21', 'C22', 'C23', 'C25']);
const CONTRACT_SIGNING_DOCUMENT_CODES = new Set([
  ...CONTRACT_SIGNING_DERIVED_DOCUMENT_CODES,
  ...Object.values(CONTRACT_SIGNING_LEGACY_DOCUMENT_CODE_BY_TARGET_CODE)
]);
const CONTRACT_SIGNING_DOCUMENT_SLOT_MAP = Object.freeze({
  C20: {
    nodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    blockingReason: '技术协议未审批通过，或 current 文件缺失'
  },
  C21: {
    nodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    blockingReason: '技术协议扫描件未确认线下签署结果通过，或 current 文件缺失'
  },
  C22: {
    nodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    blockingReason: '销售合同未审批通过，或 current 文件缺失'
  },
  C23: {
    nodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
    blockingReason: '销售合同扫描件未确认线下签署结果通过，或 current 文件缺失'
  },
  C25: {
    nodeKey: CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE,
    blockingReason: '项目启动通知未上传完成'
  }
});
const SOLUTION_DESIGN_WORKFLOW_ANCHOR_DOCUMENT_CODES = new Set(
  SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES.filter((documentCode) => documentCode !== 'C18' && documentCode !== 'C19')
);
const SOLUTION_DESIGN_DESIGN_OUTPUT_DOCUMENT_SLOT_MAP = Object.freeze({
  C07: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
  C08: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.LAYOUT_DIAGRAM,
  C09: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PROCESS_TIMING_DIAGRAM,
  C10: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.CYCLE_TIME_TABLE,
  C11: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.DEMO_ANIMATION,
  C12: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_FUNCTION_DIAGRAM,
  C13: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_FUNCTION_DIAGRAM,
  C14: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.SOLUTION_PPT
});
const SOLUTION_DESIGN_EXEMPTABLE_OUTPUT_SLOT_KEYS = new Set(
  Object.values(SOLUTION_DESIGN_DESIGN_OUTPUT_DOCUMENT_SLOT_MAP)
);
const SOLUTION_DESIGN_NODE_BY_DOCUMENT_CODE = Object.freeze({
  C04: SOLUTION_DESIGN_NODE_KEY.PREPARATION,
  C05: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
  C06: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
  C07: SOLUTION_DESIGN_NODE_KEY.DESIGN,
  C08: SOLUTION_DESIGN_NODE_KEY.DESIGN,
  C09: SOLUTION_DESIGN_NODE_KEY.DESIGN,
  C10: SOLUTION_DESIGN_NODE_KEY.DESIGN,
  C11: SOLUTION_DESIGN_NODE_KEY.DESIGN,
  C12: SOLUTION_DESIGN_NODE_KEY.DESIGN,
  C13: SOLUTION_DESIGN_NODE_KEY.DESIGN,
  C14: SOLUTION_DESIGN_NODE_KEY.DESIGN,
  C15: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
  C16: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
  C18: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
  C19: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
});

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

function getDocumentCode(document) {
  return String(document?.documentCode ?? document?.document_code ?? '').trim();
}

function normalizeSolutionDesignDocumentCode(documentCode) {
  return SOLUTION_DESIGN_TARGET_DOCUMENT_CODE_BY_LEGACY_CODE.get(documentCode) || documentCode;
}

function normalizeContractSigningDocumentCode(documentCode) {
  return CONTRACT_SIGNING_TARGET_DOCUMENT_CODE_BY_LEGACY_CODE.get(documentCode) || documentCode;
}

function isLegacySolutionDesignDocumentCode(documentCode) {
  return SOLUTION_DESIGN_TARGET_DOCUMENT_CODE_BY_LEGACY_CODE.has(documentCode);
}

function getSolutionDesignDerivedCompletion(document) {
  const direct = document?.solutionDesignDerivedCompletion ?? document?.solution_design_derived_completion ?? null;
  if (direct) {
    return direct;
  }

  const source = document?.derivedCompletionSource ?? document?.derived_completion_source ?? null;
  if (source !== SOLUTION_DESIGN_DERIVED_SOURCE) {
    return null;
  }

  return {
    source,
    isComplete: document?.isComplete === true || document?.is_complete === true,
    completionStatus: document?.completionStatus ?? document?.completion_status ?? null,
    derivedCompletionStatus: document?.derivedCompletionStatus ?? document?.derived_completion_status ?? null,
    derivedBlockingReasons: document?.derivedBlockingReasons ?? document?.derived_blocking_reasons ?? [],
    derivedNotApplicable: document?.derivedNotApplicable === true || document?.derived_not_applicable === true
  };
}

function getContractSigningDerivedCompletion(document) {
  const direct = document?.contractSigningDerivedCompletion ?? document?.contract_signing_derived_completion ?? null;
  if (direct) {
    return direct;
  }

  const source = document?.derivedCompletionSource ?? document?.derived_completion_source ?? null;
  if (source !== CONTRACT_SIGNING_DERIVED_SOURCE) {
    return null;
  }

  return {
    source,
    isComplete: document?.isComplete === true || document?.is_complete === true,
    completionStatus: document?.completionStatus ?? document?.completion_status ?? null,
    derivedCompletionStatus: document?.derivedCompletionStatus ?? document?.derived_completion_status ?? null,
    derivedBlockingReasons: document?.derivedBlockingReasons ?? document?.derived_blocking_reasons ?? [],
    derivedNotApplicable: document?.derivedNotApplicable === true || document?.derived_not_applicable === true
  };
}

function getWorkflowDerivedCompletion(document) {
  return getSolutionDesignDerivedCompletion(document) || getContractSigningDerivedCompletion(document);
}

export function deriveStageDocumentCompletion(document) {
  const completionMode = getDocumentCompletionMode(document);
  const status = document?.status ?? DOCUMENT_STATUS.NOT_SUBMITTED;
  const documentCode = getDocumentCode(document);
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

  const workflowDerivedCompletion = getWorkflowDerivedCompletion(document);
  if (workflowDerivedCompletion) {
    const derivedNotApplicable =
      workflowDerivedCompletion.derivedNotApplicable === true ||
      workflowDerivedCompletion.derived_not_applicable === true;
    const completionStatus = derivedNotApplicable
      ? COMPLETION_STATUS.NOT_APPLICABLE
      : workflowDerivedCompletion.completionStatus ??
        workflowDerivedCompletion.completion_status ??
        workflowDerivedCompletion.derivedCompletionStatus ??
        workflowDerivedCompletion.derived_completion_status ??
        (workflowDerivedCompletion.isComplete === true
          ? COMPLETION_STATUS.COMPLETED
          : COMPLETION_STATUS.INCOMPLETE);

    return {
      completionMode,
      isApplicable,
      isComplete: workflowDerivedCompletion.isComplete === true || derivedNotApplicable,
      completionStatus
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
  const solutionDesignDerivedCompletion = getSolutionDesignDerivedCompletion(document);
  const contractSigningDerivedCompletion = getContractSigningDerivedCompletion(document);
  const workflowDerivedCompletion = getWorkflowDerivedCompletion(document);
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
    isApplicable: document.isApplicable ?? (document.is_applicable === undefined ? true : Boolean(document.is_applicable)),
    solutionDesignDerivedCompletion,
    contractSigningDerivedCompletion,
    derivedCompletionSource: workflowDerivedCompletion?.source ?? null,
    derivedCompletionStatus: workflowDerivedCompletion?.derivedCompletionStatus ?? null,
    derivedBlockingReasons: workflowDerivedCompletion?.derivedBlockingReasons ?? [],
    derivedNotApplicable: workflowDerivedCompletion?.derivedNotApplicable === true
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
  const solutionDesignDerivedCompletion = getSolutionDesignDerivedCompletion(row);
  const contractSigningDerivedCompletion = getContractSigningDerivedCompletion(row);
  const workflowDerivedCompletion = getWorkflowDerivedCompletion(row);

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
    solutionDesignDerivedCompletion,
    contractSigningDerivedCompletion,
    derivedCompletionSource: workflowDerivedCompletion?.source ?? null,
    derivedCompletionStatus: workflowDerivedCompletion?.derivedCompletionStatus ?? null,
    derivedBlockingReasons: workflowDerivedCompletion?.derivedBlockingReasons ?? [],
    derivedNotApplicable: workflowDerivedCompletion?.derivedNotApplicable === true,
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
  const solutionDesignDerivedCompletion = getSolutionDesignDerivedCompletion(row);
  const contractSigningDerivedCompletion = getContractSigningDerivedCompletion(row);
  const workflowDerivedCompletion = getWorkflowDerivedCompletion(row);

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
    solutionDesignDerivedCompletion,
    contractSigningDerivedCompletion,
    derivedCompletionSource: workflowDerivedCompletion?.source ?? null,
    derivedCompletionStatus: workflowDerivedCompletion?.derivedCompletionStatus ?? null,
    derivedBlockingReasons: workflowDerivedCompletion?.derivedBlockingReasons ?? [],
    derivedNotApplicable: workflowDerivedCompletion?.derivedNotApplicable === true,
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
  const solutionDesignDerivedCompletion = getSolutionDesignDerivedCompletion(row);
  const contractSigningDerivedCompletion = getContractSigningDerivedCompletion(row);
  const workflowDerivedCompletion = getWorkflowDerivedCompletion(row);

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
    solutionDesignDerivedCompletion,
    contractSigningDerivedCompletion,
    derivedCompletionSource: workflowDerivedCompletion?.source ?? null,
    derivedCompletionStatus: workflowDerivedCompletion?.derivedCompletionStatus ?? null,
    derivedBlockingReasons: workflowDerivedCompletion?.derivedBlockingReasons ?? [],
    derivedNotApplicable: workflowDerivedCompletion?.derivedNotApplicable === true,
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
      derivedCompletionSource:
        document.derivedCompletionSource ??
        document.derived_completion_source ??
        getWorkflowDerivedCompletion(document)?.source ??
        null,
      derivedCompletionStatus:
        document.derivedCompletionStatus ??
        document.derived_completion_status ??
        getWorkflowDerivedCompletion(document)?.derivedCompletionStatus ??
        null,
      derivedBlockingReasons:
        document.derivedBlockingReasons ??
        document.derived_blocking_reasons ??
        getWorkflowDerivedCompletion(document)?.derivedBlockingReasons ??
        [],
      derivedNotApplicable:
        document.derivedNotApplicable === true ||
        document.derived_not_applicable === true ||
        getWorkflowDerivedCompletion(document)?.derivedNotApplicable === true,
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

function buildPlaceholders(values) {
  return values.map(() => '?').join(', ');
}

function groupByProjectId(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const projectId = Number(row.project_id ?? row.projectId);
    if (!Number.isSafeInteger(projectId)) {
      continue;
    }
    if (!grouped.has(projectId)) {
      grouped.set(projectId, []);
    }
    grouped.get(projectId).push(row);
  }
  return grouped;
}

function mapSolutionDesignDocumentCodeContextByProject(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const projectId = Number(row.project_id ?? row.projectId);
    const rawDocumentCode = getDocumentCode(row);
    const documentCode = normalizeSolutionDesignDocumentCode(rawDocumentCode);
    if (!Number.isSafeInteger(projectId) || !SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES.includes(documentCode)) {
      continue;
    }
    if (!grouped.has(projectId)) {
      grouped.set(projectId, {
        documentCodes: new Set(),
        usesLegacyCodes: false
      });
    }
    const context = grouped.get(projectId);
    context.documentCodes.add(documentCode);
    context.usesLegacyCodes = context.usesLegacyCodes || isLegacySolutionDesignDocumentCode(rawDocumentCode);
  }
  return grouped;
}

function hasSolutionDesignWorkflowAnchors(documentCodes) {
  for (const documentCode of documentCodes ?? []) {
    if (SOLUTION_DESIGN_WORKFLOW_ANCHOR_DOCUMENT_CODES.has(documentCode)) {
      return true;
    }
  }
  return false;
}

function shouldApplySolutionDesignDerivedCompletion(documentCodes) {
  return hasSolutionDesignWorkflowAnchors(documentCodes);
}

function hasSolutionDesignWorkflowContext(context) {
  return Boolean(context?.nodesByKey?.size);
}

function hasSolutionDesignWorkflowActivity(context) {
  if (!hasSolutionDesignWorkflowContext(context)) {
    return false;
  }

  for (const node of context.nodesByKey.values()) {
    if (![SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED, SOLUTION_DESIGN_NODE_STATUS.PENDING].includes(node.status)) {
      return true;
    }
  }

  for (const slot of context.slotsByKey.values()) {
    if (
      slot.current_file_id ||
      slot.is_upload_exempted ||
      [SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.UPLOADED, SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED].includes(slot.status)
    ) {
      return true;
    }
  }

  return Boolean(
    context.analysisForm ||
    context.reviewFormsByNodeKey.size > 0 ||
    context.quotationTenderFlow
  );
}

function mapRowsByProjectAndKey(rows, keyName) {
  const mapped = new Map();
  for (const row of rows) {
    const projectId = Number(row.project_id);
    const key = row[keyName];
    if (!Number.isSafeInteger(projectId) || !key) {
      continue;
    }
    if (!mapped.has(projectId)) {
      mapped.set(projectId, new Map());
    }
    mapped.get(projectId).set(key, row);
  }
  return mapped;
}

function mapQuotationTenderFlows(rows) {
  const mapped = new Map();
  for (const row of rows) {
    const projectId = Number(row.project_id);
    if (Number.isSafeInteger(projectId)) {
      mapped.set(projectId, row);
    }
  }
  return mapped;
}

function getContextNode(context, nodeKey) {
  return context.nodesByKey.get(nodeKey) || null;
}

function getContextSlot(context, slotKey) {
  return context.slotsByKey.get(slotKey) || null;
}

function getNodeRevision(node) {
  const revision = Number(node?.current_revision ?? 1);
  return Number.isSafeInteger(revision) && revision > 0 ? revision : 1;
}

function isApprovedNode(context, nodeKey) {
  return getContextNode(context, nodeKey)?.status === SOLUTION_DESIGN_NODE_STATUS.APPROVED;
}

function hasCurrentRevisionUpload(context, slotKey, expectedRevision) {
  const slot = getContextSlot(context, slotKey);
  if (!slot?.current_file_id) {
    return false;
  }

  return (
    Number(slot.revision ?? 0) === expectedRevision &&
    Number(slot.current_file_revision ?? 0) === expectedRevision &&
    [SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.UPLOADED, SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED].includes(slot.status)
  );
}

function hasCurrentUpload(context, slotKey) {
  const slot = getContextSlot(context, slotKey);
  return Boolean(slot?.current_file_id) &&
    [SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.UPLOADED, SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED].includes(slot.status);
}

function hasUploadExemption(context, slotKey) {
  const slot = getContextSlot(context, slotKey);
  return SOLUTION_DESIGN_EXEMPTABLE_OUTPUT_SLOT_KEYS.has(slotKey) && Boolean(slot?.is_upload_exempted);
}

function hasCurrentUploadOrExemption(context, slotKey) {
  return hasCurrentUpload(context, slotKey) || hasUploadExemption(context, slotKey);
}

function isCurrentSubmittedGeneratedForm(form, expectedRevision) {
  return (
    Number(form?.revision ?? 0) === expectedRevision &&
    form?.form_status === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED &&
    form?.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED
  );
}

function isCurrentSubmittedGeneratedReviewForm(form, expectedRevision) {
  return (
    Number(form?.revision ?? 0) === expectedRevision &&
    form?.form_status === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED &&
    form?.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED
  );
}

function isCurrentSubmittedGeneratedQuotationForm(form, expectedRevision) {
  return (
    Number(form?.revision ?? 0) >= expectedRevision &&
    form?.form_status === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED &&
    form?.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    Boolean(form?.generated_file_storage_key)
  );
}

function buildDerivedCompletion({
  documentCode,
  nodeKey = null,
  revision = null,
  isComplete,
  blockingReasons = [],
  notApplicable = false,
  source = SOLUTION_DESIGN_DERIVED_SOURCE
}) {
  const completionStatus = notApplicable
    ? COMPLETION_STATUS.NOT_APPLICABLE
    : isComplete
      ? COMPLETION_STATUS.COMPLETED
      : COMPLETION_STATUS.INCOMPLETE;

  return {
    source,
    documentCode,
    nodeKey,
    revision,
    isComplete: isComplete === true || notApplicable,
    completionStatus,
    derivedCompletionStatus: completionStatus,
    derivedBlockingReasons: notApplicable ? [] : blockingReasons,
    derivedNotApplicable: notApplicable
  };
}

function deriveNodeApprovedDocument(context, documentCode, nodeKey, blockingReason) {
  const node = getContextNode(context, nodeKey);
  const revision = getNodeRevision(node);
  return buildDerivedCompletion({
    documentCode,
    nodeKey,
    revision,
    isComplete: node?.status === SOLUTION_DESIGN_NODE_STATUS.APPROVED,
    blockingReasons: node ? [blockingReason] : [`${blockingReason}：节点尚未初始化`]
  });
}

function deriveUploadDocument(context, documentCode, nodeKey, slotKey, blockingReason, { allowExemption = false } = {}) {
  const node = getContextNode(context, nodeKey);
  const revision = getNodeRevision(node);
  const complete =
    node?.status === SOLUTION_DESIGN_NODE_STATUS.APPROVED &&
    (allowExemption ? hasCurrentUploadOrExemption(context, slotKey) : hasCurrentUpload(context, slotKey));

  return buildDerivedCompletion({
    documentCode,
    nodeKey,
    revision,
    isComplete: complete,
    blockingReasons: complete ? [] : [blockingReason]
  });
}

function deriveAnalysisFormDocument(context) {
  const node = getContextNode(context, SOLUTION_DESIGN_NODE_KEY.ANALYSIS);
  const revision = getNodeRevision(node);
  const complete =
    node?.status === SOLUTION_DESIGN_NODE_STATUS.APPROVED &&
    isCurrentSubmittedGeneratedForm(context.analysisForm, revision);

  return buildDerivedCompletion({
    documentCode: 'C05',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
    revision,
    isComplete: complete,
    blockingReasons: complete ? [] : ['项目方案分析节点未审批通过，或当前 revision 项目方案分析表未提交/生成成功']
  });
}

function deriveReviewFormDocument(context, { documentCode, nodeKey, form }) {
  const node = getContextNode(context, nodeKey);
  const revision = getNodeRevision(node);
  const complete =
    node?.status === SOLUTION_DESIGN_NODE_STATUS.APPROVED &&
    isCurrentSubmittedGeneratedReviewForm(form, revision);

  return buildDerivedCompletion({
    documentCode,
    nodeKey,
    revision,
    isComplete: complete,
    blockingReasons: complete ? [] : [`${documentCode} 评审节点未审批通过，或当前 revision 评审记录表未提交/生成成功`]
  });
}

function deriveCostDocument(context) {
  const nodeKeys = [
    SOLUTION_DESIGN_NODE_KEY.RD_COST,
    SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
    SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
    SOLUTION_DESIGN_NODE_KEY.FINANCE_COST
  ];
  const complete =
    nodeKeys.every((nodeKey) => isApprovedNode(context, nodeKey)) &&
    SOLUTION_DESIGN_COST_UPLOAD_SLOT_KEYS.every((slotKey) => hasCurrentUpload(context, slotKey));

  return buildDerivedCompletion({
    documentCode: 'C17',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
    revision: getNodeRevision(getContextNode(context, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST)),
    isComplete: complete,
    blockingReasons: complete ? [] : ['研发、制造、营销、财务四段成本估算尚未全部审批通过，或成本估算 current 文件缺失']
  });
}

function isCurrentQuotationTenderFlow(context) {
  const node = getContextNode(context, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  return Boolean(context.quotationTenderFlow) &&
    Number(context.quotationTenderFlow.revision ?? 0) === getNodeRevision(node);
}

function isQuotationPathComplete(context) {
  const node = getContextNode(context, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  const revision = getNodeRevision(node);
  const flow = context.quotationTenderFlow;
  return (
    node?.status === SOLUTION_DESIGN_NODE_STATUS.APPROVED &&
    isCurrentQuotationTenderFlow(context) &&
    flow?.branch_type === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION &&
    flow?.branch_status === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.ACCEPTED &&
    flow?.quotation_result === SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED &&
    isCurrentSubmittedGeneratedQuotationForm(context.quotationForm, revision)
  );
}

function isTenderPathComplete(context) {
  const node = getContextNode(context, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  const revision = getNodeRevision(node);
  const flow = context.quotationTenderFlow;
  return (
    node?.status === SOLUTION_DESIGN_NODE_STATUS.APPROVED &&
    isCurrentQuotationTenderFlow(context) &&
    flow?.branch_type === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER &&
    flow?.branch_status === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.APPROVED &&
    hasCurrentRevisionUpload(context, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE, revision) &&
    hasCurrentRevisionUpload(context, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE, revision)
  );
}

function deriveQuotationTenderDocument(context, documentCode) {
  const node = getContextNode(context, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  const revision = getNodeRevision(node);
  const flow = context.quotationTenderFlow;

  if (!flow || !isCurrentQuotationTenderFlow(context)) {
    return buildDerivedCompletion({
      documentCode,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      revision,
      isComplete: false,
      blockingReasons: ['报价/投标分支尚未按当前 revision 选择或完成']
    });
  }

  if (flow.branch_type === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION) {
    if (documentCode === 'C19') {
      return buildDerivedCompletion({
        documentCode,
        nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
        revision,
        isComplete: true,
        notApplicable: true
      });
    }

    return buildDerivedCompletion({
      documentCode,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      revision,
      isComplete: isQuotationPathComplete(context),
      blockingReasons: ['报价分支尚未完成，或当前 revision 报价单未被客户接受']
    });
  }

  if (flow.branch_type === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER) {
    if (documentCode === 'C18') {
      return buildDerivedCompletion({
        documentCode,
        nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
        revision,
        isComplete: true,
        notApplicable: true
      });
    }

    return buildDerivedCompletion({
      documentCode,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      revision,
      isComplete: isTenderPathComplete(context),
      blockingReasons: ['投标分支尚未完成，或当前 revision 商务标/技术标未审批通过']
    });
  }

  return buildDerivedCompletion({
    documentCode,
    nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
    revision,
    isComplete: false,
    blockingReasons: ['报价/投标分支类型无效']
  });
}

function deriveSolutionDesignDocumentCompletion(context, documentCode) {
  if (documentCode === 'C04') {
    return deriveNodeApprovedDocument(
      context,
      documentCode,
      SOLUTION_DESIGN_NODE_KEY.PREPARATION,
      '方案设计准备节点尚未通过'
    );
  }
  if (documentCode === 'C05') {
    return deriveAnalysisFormDocument(context);
  }
  if (documentCode === 'C06') {
    return deriveUploadDocument(
      context,
      documentCode,
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
      '项目方案分析节点未审批通过，或产品功能框图 current 文件缺失'
    );
  }
  if (SOLUTION_DESIGN_DESIGN_OUTPUT_DOCUMENT_SLOT_MAP[documentCode]) {
    return deriveUploadDocument(
      context,
      documentCode,
      SOLUTION_DESIGN_NODE_KEY.DESIGN,
      SOLUTION_DESIGN_DESIGN_OUTPUT_DOCUMENT_SLOT_MAP[documentCode],
      `${documentCode} 方案设计产出未审批通过，或上传槽 current 文件/无需上传豁免缺失`,
      { allowExemption: true }
    );
  }
  if (documentCode === 'C15') {
    return deriveReviewFormDocument(context, {
      documentCode,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      form: context.reviewFormsByNodeKey.get(SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW)
    });
  }
  if (documentCode === 'C16') {
    return deriveReviewFormDocument(context, {
      documentCode,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      form: context.reviewFormsByNodeKey.get(SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW)
    });
  }
  if (documentCode === 'C17') {
    return deriveCostDocument(context);
  }
  if (documentCode === 'C18' || documentCode === 'C19') {
    return deriveQuotationTenderDocument(context, documentCode);
  }

  return null;
}

function getContractSigningNode(context, nodeKey) {
  return context.nodesByKey.get(nodeKey) || null;
}

function getContractSigningSlot(context, slotKey) {
  return context.slotsByKey.get(slotKey) || null;
}

function getContractSigningRevision({ node, slot }) {
  const revision = Math.max(
    Number(node?.current_revision ?? 0),
    Number(slot?.revision ?? 0),
    Number(slot?.current_file_revision ?? 0)
  );
  return Number.isSafeInteger(revision) && revision > 0 ? revision : 1;
}

function isContractSigningSlotApprovedWithCurrentFile(slot) {
  return Boolean(slot?.current_file_id) &&
    slot?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED;
}

function deriveContractSigningDocumentCompletion(context, documentCode) {
  const mapping = CONTRACT_SIGNING_DOCUMENT_SLOT_MAP[documentCode];
  if (!mapping) {
    return null;
  }

  const node = getContractSigningNode(context, mapping.nodeKey);
  const slot = getContractSigningSlot(context, mapping.slotKey);
  const complete =
    node?.status === CONTRACT_SIGNING_NODE_STATUS.APPROVED &&
    isContractSigningSlotApprovedWithCurrentFile(slot);

  return buildDerivedCompletion({
    documentCode,
    nodeKey: mapping.nodeKey,
    revision: getContractSigningRevision({ node, slot }),
    isComplete: complete,
    blockingReasons: complete ? [] : [mapping.blockingReason],
    source: CONTRACT_SIGNING_DERIVED_SOURCE
  });
}

async function selectSolutionDesignDerivedContexts(executor, projectIds) {
  if (projectIds.length === 0) {
    return new Map();
  }

  const placeholders = buildPlaceholders(projectIds);
  const [nodeRows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_nodes
    WHERE project_id IN (${placeholders})
    ORDER BY project_id ASC, node_order ASC`,
    projectIds
  );
  const [slotRows] = await executor.execute(
    `SELECT
      s.*,
      f.id AS current_file_id,
      f.revision AS current_file_revision,
      f.original_file_name AS current_file_original_file_name,
      f.mime_type AS current_file_mime_type,
      f.file_size AS current_file_size,
      f.uploaded_by_user_id AS current_file_uploaded_by_user_id,
      f.uploaded_at AS current_file_uploaded_at
    FROM project_solution_design_upload_slots s
    LEFT JOIN project_solution_design_upload_files f
      ON f.slot_id = s.id AND f.is_current = 1
    WHERE s.project_id IN (${placeholders})
    ORDER BY s.project_id ASC, s.slot_order ASC`,
    projectIds
  );
  const [analysisFormRows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_analysis_forms
    WHERE project_id IN (${placeholders})
      AND is_current = 1`,
    projectIds
  );
  const [reviewFormRows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_review_forms
    WHERE project_id IN (${placeholders})
      AND is_current = 1
    ORDER BY project_id ASC, node_key ASC`,
    projectIds
  );
  const [quotationTenderFlowRows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_quotation_tender_flows
    WHERE project_id IN (${placeholders})`,
    projectIds
  );
  const [quotationFormRows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_quotation_forms
    WHERE project_id IN (${placeholders})
      AND is_current = 1`,
    projectIds
  );

  const nodesByProject = mapRowsByProjectAndKey(nodeRows, 'node_key');
  const slotsByProject = mapRowsByProjectAndKey(slotRows, 'slot_key');
  const analysisFormsByProject = new Map(
    analysisFormRows.map((row) => [Number(row.project_id), row])
  );
  const reviewFormsByProject = mapRowsByProjectAndKey(reviewFormRows, 'node_key');
  const quotationTenderFlowsByProject = mapQuotationTenderFlows(quotationTenderFlowRows);
  const quotationFormsByProject = new Map(
    quotationFormRows.map((row) => [Number(row.project_id), row])
  );

  return new Map(projectIds.map((projectId) => [
    projectId,
    {
      nodesByKey: nodesByProject.get(projectId) || new Map(),
      slotsByKey: slotsByProject.get(projectId) || new Map(),
      analysisForm: analysisFormsByProject.get(projectId) || null,
      reviewFormsByNodeKey: reviewFormsByProject.get(projectId) || new Map(),
      quotationTenderFlow: quotationTenderFlowsByProject.get(projectId) || null,
      quotationForm: quotationFormsByProject.get(projectId) || null
    }
  ]));
}

async function selectContractSigningDerivedContexts(executor, projectIds) {
  if (projectIds.length === 0) {
    return new Map();
  }

  const placeholders = buildPlaceholders(projectIds);
  const [nodeRows] = await executor.execute(
    `SELECT *
    FROM project_contract_signing_nodes
    WHERE project_id IN (${placeholders})
    ORDER BY project_id ASC, node_order ASC`,
    projectIds
  );
  const [slotRows] = await executor.execute(
    `SELECT
      s.*,
      f.id AS current_file_id,
      f.revision AS current_file_revision,
      f.original_file_name AS current_file_original_file_name,
      f.mime_type AS current_file_mime_type,
      f.file_size AS current_file_size,
      f.uploaded_by_user_id AS current_file_uploaded_by_user_id,
      f.uploaded_at AS current_file_uploaded_at
    FROM project_contract_signing_upload_slots s
    LEFT JOIN project_contract_signing_upload_files f
      ON f.slot_id = s.id AND f.is_current = 1
    WHERE s.project_id IN (${placeholders})
    ORDER BY s.project_id ASC, s.slot_order ASC`,
    projectIds
  );

  const nodesByProject = mapRowsByProjectAndKey(nodeRows, 'node_key');
  const slotsByProject = mapRowsByProjectAndKey(slotRows, 'slot_key');

  return new Map(projectIds.map((projectId) => [
    projectId,
    {
      nodesByKey: nodesByProject.get(projectId) || new Map(),
      slotsByKey: slotsByProject.get(projectId) || new Map()
    }
  ]));
}

function hasContractSigningWorkflowContext(context) {
  return Boolean(context?.nodesByKey?.size);
}

async function attachSolutionDesignDerivedCompletionOnly(executor, rows) {
  const solutionDesignRows = rows.filter((row) => SOLUTION_DESIGN_DOCUMENT_CODES.has(getDocumentCode(row)));
  if (solutionDesignRows.length === 0) {
    return rows;
  }

  const projectIds = [...groupByProjectId(solutionDesignRows).keys()];
  const solutionDesignDocumentCodeContextByProject = mapSolutionDesignDocumentCodeContextByProject(solutionDesignRows);
  const contextsByProjectId = await selectSolutionDesignDerivedContexts(executor, projectIds);

  return rows.map((row) => {
    const rawDocumentCode = getDocumentCode(row);
    const documentCode = normalizeSolutionDesignDocumentCode(rawDocumentCode);
    if (!SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES.includes(documentCode)) {
      return row;
    }

    const projectId = Number(row.project_id ?? row.projectId);
    const context = contextsByProjectId.get(projectId);
    const documentCodeContext = solutionDesignDocumentCodeContextByProject.get(projectId);
    if (!hasSolutionDesignWorkflowContext(context)) {
      return row;
    }

    if (documentCodeContext?.usesLegacyCodes && !hasSolutionDesignWorkflowActivity(context)) {
      return row;
    }

    if (!shouldApplySolutionDesignDerivedCompletion(documentCodeContext?.documentCodes)) {
      return row;
    }

    const solutionDesignDerivedCompletion = context
      ? deriveSolutionDesignDocumentCompletion(context, documentCode)
      : buildDerivedCompletion({
          documentCode,
          nodeKey: SOLUTION_DESIGN_NODE_BY_DOCUMENT_CODE[documentCode] ?? null,
          isComplete: false,
          blockingReasons: ['方案设计派生上下文缺失']
        });

    return {
      ...row,
      solutionDesignDerivedCompletion
    };
  });
}

async function attachContractSigningDerivedCompletionToStageDocumentRows(executor, rows) {
  const contractSigningRows = rows.filter((row) =>
    CONTRACT_SIGNING_DOCUMENT_CODES.has(getDocumentCode(row))
  );
  if (contractSigningRows.length === 0) {
    return rows;
  }

  const projectIds = [...groupByProjectId(contractSigningRows).keys()];
  const contextsByProjectId = await selectContractSigningDerivedContexts(executor, projectIds);

  return rows.map((row) => {
    const documentCode = normalizeContractSigningDocumentCode(getDocumentCode(row));
    if (!CONTRACT_SIGNING_DERIVED_DOCUMENT_CODES.includes(documentCode)) {
      return row;
    }

    const projectId = Number(row.project_id ?? row.projectId);
    const context = contextsByProjectId.get(projectId);
    const contractSigningDerivedCompletion = hasContractSigningWorkflowContext(context)
      ? deriveContractSigningDocumentCompletion(context, documentCode)
      : buildDerivedCompletion({
          documentCode,
          nodeKey: CONTRACT_SIGNING_DOCUMENT_SLOT_MAP[documentCode]?.nodeKey ?? null,
          isComplete: false,
          blockingReasons: ['合同签订 workflow 派生上下文缺失'],
          source: CONTRACT_SIGNING_DERIVED_SOURCE
        });

    return {
      ...row,
      contractSigningDerivedCompletion
    };
  });
}

export async function attachSolutionDesignDerivedCompletionToStageDocumentRows(executor, rows) {
  const rowsWithSolutionDesign = await attachSolutionDesignDerivedCompletionOnly(executor, rows);
  return attachContractSigningDerivedCompletionToStageDocumentRows(executor, rowsWithSolutionDesign);
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
