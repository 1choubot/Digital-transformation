import { pool } from '../db/pool.js';

const DEFAULT_OPERATION_LOG_LIMIT = 100;
const MAX_OPERATION_LOG_LIMIT = 100;

export const OPERATION_ACTION_TYPE = {
  PROJECT_CREATED: 'project.created',
  PROJECT_CODE_UPDATED: 'project.code_updated',
  PROJECT_ENDED: 'project.ended',
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
  FORM_IMAGE_UPLOADED: 'form.image_uploaded',
  FORM_IMAGE_DELETED: 'form.image_deleted',
  TEMPLATE_FILE_GENERATED: 'template_file.generated',
  TEMPLATE_FILE_FAILED: 'template_file.failed',
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
  INITIATION_PROJECT_EXECUTION_MODE_SELECTED: 'initiation.project_execution_mode_selected',
  INITIATION_REVIEW_RESTORED: 'initiation_review.restored',
  INITIATION_REVIEW_COMPLETED: 'initiation_review.completed',
  INITIATION_EVALUATION_SUBMITTED: 'initiation.evaluation.submitted',
  INITIATION_APPROVAL_APPROVED: 'initiation.approval.approved',
  INITIATION_APPROVAL_RETURNED: 'initiation.approval.returned',
  SOLUTION_DESIGN_ROLES_ASSIGNED: 'solution_design.roles_assigned',
  SOLUTION_DESIGN_WORK_PLAN_UPLOADED: 'solution_design.work_plan_uploaded',
  SOLUTION_DESIGN_WORK_PLAN_SUBMITTED: 'solution_design.work_plan_submitted',
  SOLUTION_DESIGN_ANALYSIS_FORM_SAVED: 'solution_design.analysis_form_saved',
  SOLUTION_DESIGN_ANALYSIS_FORM_SUBMITTED: 'solution_design.analysis_form_submitted',
  SOLUTION_DESIGN_ANALYSIS_FORM_GENERATED: 'solution_design.analysis_form_generated',
  SOLUTION_DESIGN_ANALYSIS_FORM_GENERATION_FAILED: 'solution_design.analysis_form_generation_failed',
  SOLUTION_DESIGN_PRODUCT_FUNCTION_DIAGRAM_UPLOADED: 'solution_design.product_function_diagram_uploaded',
  SOLUTION_DESIGN_ANALYSIS_SUBMITTED: 'solution_design.analysis_submitted',
  SOLUTION_DESIGN_ANALYSIS_APPROVED: 'solution_design.analysis_approved',
  SOLUTION_DESIGN_ANALYSIS_RETURNED: 'solution_design.analysis_returned',
  SOLUTION_DESIGN_DESIGN_OUTPUT_UPLOADED: 'solution_design.design_output_uploaded',
  SOLUTION_DESIGN_DESIGN_OUTPUT_EXEMPTED: 'solution_design.design_output_exempted',
  SOLUTION_DESIGN_DESIGN_OUTPUT_EXEMPTION_CANCELLED:
    'solution_design.design_output_exemption_cancelled',
  SOLUTION_DESIGN_DESIGN_OUTPUT_EXEMPTION_CANCELLED_BY_UPLOAD:
    'solution_design.design_output_exemption_cancelled_by_upload',
  SOLUTION_DESIGN_DESIGN_OUTPUTS_SUBMITTED: 'solution_design.design_outputs_submitted',
  SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_SAVED: 'solution_design.internal_review_form_saved',
  SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_SUBMITTED: 'solution_design.internal_review_form_submitted',
  SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_GENERATED:
    'solution_design.internal_review_form_generated',
  SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_GENERATION_FAILED:
    'solution_design.internal_review_form_generation_failed',
  SOLUTION_DESIGN_INTERNAL_REVIEW_SUBMITTED: 'solution_design.internal_review_submitted',
  SOLUTION_DESIGN_INTERNAL_REVIEW_APPROVED: 'solution_design.internal_review_approved',
  SOLUTION_DESIGN_INTERNAL_REVIEW_RETURNED: 'solution_design.internal_review_returned',
  SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_SAVED: 'solution_design.customer_review_form_saved',
  SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_SUBMITTED: 'solution_design.customer_review_form_submitted',
  SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_GENERATED:
    'solution_design.customer_review_form_generated',
  SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_GENERATION_FAILED:
    'solution_design.customer_review_form_generation_failed',
  SOLUTION_DESIGN_CUSTOMER_REVIEW_SUBMITTED: 'solution_design.customer_review_submitted',
  SOLUTION_DESIGN_CUSTOMER_REVIEW_APPROVED: 'solution_design.customer_review_approved',
  SOLUTION_DESIGN_CUSTOMER_REVIEW_RETURNED: 'solution_design.customer_review_returned',
  SOLUTION_DESIGN_RD_COST_FILE_UPLOADED: 'solution_design.rd_cost_file_uploaded',
  SOLUTION_DESIGN_RD_COST_SUBMITTED: 'solution_design.rd_cost_submitted',
  SOLUTION_DESIGN_RD_COST_APPROVED: 'solution_design.rd_cost_approved',
  SOLUTION_DESIGN_RD_COST_RETURNED: 'solution_design.rd_cost_returned',
  SOLUTION_DESIGN_MANUFACTURING_COST_FILE_UPLOADED: 'solution_design.manufacturing_cost_file_uploaded',
  SOLUTION_DESIGN_MANUFACTURING_COST_SUBMITTED: 'solution_design.manufacturing_cost_submitted',
  SOLUTION_DESIGN_MANUFACTURING_COST_APPROVED: 'solution_design.manufacturing_cost_approved',
  SOLUTION_DESIGN_MANUFACTURING_COST_RETURNED: 'solution_design.manufacturing_cost_returned',
  SOLUTION_DESIGN_MARKETING_COST_FILE_UPLOADED: 'solution_design.marketing_cost_file_uploaded',
  SOLUTION_DESIGN_MARKETING_COST_SUBMITTED: 'solution_design.marketing_cost_submitted',
  SOLUTION_DESIGN_MARKETING_COST_APPROVED: 'solution_design.marketing_cost_approved',
  SOLUTION_DESIGN_MARKETING_COST_RETURNED: 'solution_design.marketing_cost_returned',
  SOLUTION_DESIGN_FINANCE_COST_FILE_UPLOADED: 'solution_design.finance_cost_file_uploaded',
  SOLUTION_DESIGN_FINANCE_COST_SUBMITTED: 'solution_design.finance_cost_submitted',
  SOLUTION_DESIGN_FINANCE_COST_FINANCE_APPROVED: 'solution_design.finance_cost_finance_approved',
  SOLUTION_DESIGN_FINANCE_COST_FINANCE_RETURNED: 'solution_design.finance_cost_finance_returned',
  SOLUTION_DESIGN_FINANCE_COST_GENERAL_APPROVED: 'solution_design.finance_cost_general_approved',
  SOLUTION_DESIGN_FINANCE_COST_GENERAL_RETURNED: 'solution_design.finance_cost_general_returned',
  SOLUTION_DESIGN_QUOTATION_BRANCH_SELECTED: 'solution_design.quotation_branch_selected',
  SOLUTION_DESIGN_TENDER_BRANCH_SELECTED: 'solution_design.tender_branch_selected',
  SOLUTION_DESIGN_QUOTATION_FILE_UPLOADED: 'solution_design.quotation_file_uploaded',
  SOLUTION_DESIGN_QUOTATION_SUBMITTED: 'solution_design.quotation_submitted',
  SOLUTION_DESIGN_QUOTATION_ACCEPTED: 'solution_design.quotation_accepted',
  SOLUTION_DESIGN_QUOTATION_REJECTED_RETURN_RD_COST:
    'solution_design.quotation_rejected_return_rd_cost',
  SOLUTION_DESIGN_QUOTATION_REJECTED_PROJECT_ENDED:
    'solution_design.quotation_rejected_project_ended',
  SOLUTION_DESIGN_TENDER_BUSINESS_FILE_UPLOADED: 'solution_design.tender_business_file_uploaded',
  SOLUTION_DESIGN_TENDER_TECHNICAL_FILE_UPLOADED: 'solution_design.tender_technical_file_uploaded',
  SOLUTION_DESIGN_TENDER_SUBMITTED: 'solution_design.tender_submitted',
  SOLUTION_DESIGN_TENDER_APPROVED: 'solution_design.tender_approved',
  SOLUTION_DESIGN_TENDER_RETURNED: 'solution_design.tender_returned',
  SOLUTION_DESIGN_READY_FOR_CONTRACT: 'solution_design.ready_for_contract',
  CONTRACT_SIGNING_TECHNICAL_AGREEMENT_UPLOADED: 'contract_signing.technical_agreement_uploaded',
  CONTRACT_SIGNING_TECHNICAL_AGREEMENT_APPROVED: 'contract_signing.technical_agreement_approved',
  CONTRACT_SIGNING_TECHNICAL_AGREEMENT_RETURNED: 'contract_signing.technical_agreement_returned',
  CONTRACT_SIGNING_SALES_CONTRACT_UPLOADED: 'contract_signing.sales_contract_uploaded',
  CONTRACT_SIGNING_SALES_CONTRACT_APPROVED: 'contract_signing.sales_contract_approved',
  CONTRACT_SIGNING_SALES_CONTRACT_RETURNED: 'contract_signing.sales_contract_returned',
  CONTRACT_SIGNING_TECHNICAL_AGREEMENT_SCAN_UPLOADED: 'contract_signing.technical_agreement_scan_uploaded',
  CONTRACT_SIGNING_TECHNICAL_AGREEMENT_SCAN_CONFIRMED: 'contract_signing.technical_agreement_scan_confirmed',
  CONTRACT_SIGNING_TECHNICAL_AGREEMENT_SCAN_RETURNED: 'contract_signing.technical_agreement_scan_returned',
  CONTRACT_SIGNING_SALES_CONTRACT_SCAN_UPLOADED: 'contract_signing.sales_contract_scan_uploaded',
  CONTRACT_SIGNING_SALES_CONTRACT_SCAN_CONFIRMED: 'contract_signing.sales_contract_scan_confirmed',
  CONTRACT_SIGNING_SALES_CONTRACT_SCAN_RETURNED: 'contract_signing.sales_contract_scan_returned',
  CONTRACT_SIGNING_ADVANCE_PAYMENT_COMPLETED: 'contract_signing.advance_payment_completed',
  CONTRACT_SIGNING_ADVANCE_PAYMENT_RELEASE_REQUESTED: 'contract_signing.advance_payment_release_requested',
  CONTRACT_SIGNING_ADVANCE_PAYMENT_RELEASE_APPROVED: 'contract_signing.advance_payment_release_approved',
  CONTRACT_SIGNING_PROJECT_KICKOFF_NOTICE_UPLOADED: 'contract_signing.project_kickoff_notice_uploaded',
  STAGE_ADVANCED: 'stage.advanced',
  PROJECT_COMPLETED: 'project.completed'
};

export const OPERATION_TARGET_TYPE = {
  PROJECT: 'project',
  STAGE: 'stage',
  APPROVAL: 'approval',
  STAGE_DOCUMENT: 'stage_document',
  INITIATION_REVIEW: 'initiation_review',
  ONLINE_FORM: 'online_form',
  SOLUTION_DESIGN_WORKFLOW: 'solution_design_workflow',
  CONTRACT_SIGNING_WORKFLOW: 'contract_signing_workflow'
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

export function sanitizeOperationLogDetails(details, { includeFinanceApprovalComments = true } = {}) {
  if (!details || typeof details !== 'object' || includeFinanceApprovalComments) return details;
  if (details.nodeKey !== 'finance_cost_estimation' || !Object.hasOwn(details, 'approvalComment')) return details;

  const sanitized = { ...details };
  delete sanitized.approvalComment;
  return sanitized;
}

function mapOperationLog(row, options = {}) {
  const details = parseJsonValue(row.details_json);
  return {
    id: row.id,
    projectId: row.project_id,
    actorUserId: row.actor_user_id,
    actorUser: mapActor(row),
    actionType: row.action_type,
    targetType: row.target_type,
    targetId: row.target_id,
    summary: row.summary,
    detailsJson: sanitizeOperationLogDetails(details, options),
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

export async function listProjectOperationLogs(projectId, limit = DEFAULT_OPERATION_LOG_LIMIT, options = {}) {
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

  return rows.map((row) => mapOperationLog(row, options));
}
