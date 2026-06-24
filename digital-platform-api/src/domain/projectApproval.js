import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE,
  isValidBusinessDepartment
} from './organization.js';

export const PROJECT_APPROVAL_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING_CENTER_MANAGER: 'pending_center_manager',
  RETURNED_BY_CENTER_MANAGER: 'returned_by_center_manager',
  PENDING_GENERAL_MANAGER: 'pending_general_manager',
  RETURNED_BY_GENERAL_MANAGER: 'returned_by_general_manager',
  APPROVED: 'approved',
  CANCELLED: 'cancelled'
};

export const PROJECT_APPROVAL_ACTION = {
  SUBMIT: 'submit',
  CENTER_MANAGER_APPROVE: 'center_manager_approve',
  CENTER_MANAGER_RETURN: 'center_manager_return',
  GENERAL_MANAGER_APPROVE: 'general_manager_approve',
  GENERAL_MANAGER_RETURN: 'general_manager_return',
  RESUBMIT: 'resubmit'
};

export const PROJECT_APPROVAL_ERROR = {
  INVALID_APPROVAL_ACTION: 'INVALID_APPROVAL_ACTION',
  INVALID_APPROVAL_COMMENT: 'INVALID_APPROVAL_COMMENT',
  PROJECT_APPROVAL_NOT_SUBMITTABLE: 'PROJECT_APPROVAL_NOT_SUBMITTABLE',
  PROJECT_APPROVAL_NOT_PENDING: 'PROJECT_APPROVAL_NOT_PENDING',
  PROJECT_APPROVAL_NOT_APPROVED: 'PROJECT_APPROVAL_NOT_APPROVED',
  PROJECT_APPROVAL_FORBIDDEN: 'PROJECT_APPROVAL_FORBIDDEN',
  PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE: 'PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE',
  INVALID_PROJECT_STAGE_ID: 'INVALID_PROJECT_STAGE_ID',
  PROJECT_STAGE_NOT_FOUND: 'PROJECT_STAGE_NOT_FOUND'
};

const STAGES_REQUIRING_GENERAL_MANAGER = new Set(['initiation', 'contract', 'closeout']);

const STATIC_STAGE_APPROVAL_CENTERS = {
  initiation: BUSINESS_DEPARTMENT.MARKETING_CENTER,
  solution: BUSINESS_DEPARTMENT.RD_CENTER,
  contract: BUSINESS_DEPARTMENT.MARKETING_CENTER,
  detailedDesign: BUSINESS_DEPARTMENT.RD_CENTER,
  manufacturing: BUSINESS_DEPARTMENT.MANUFACTURING_CENTER,
  preAcceptance: BUSINESS_DEPARTMENT.MANUFACTURING_CENTER,
  finalAcceptance: BUSINESS_DEPARTMENT.MANUFACTURING_CENTER
};

export function isGeneralManagerApprovalStage(stageKey) {
  return STAGES_REQUIRING_GENERAL_MANAGER.has(stageKey);
}

export function getStageApprovalCenter(stage, projectManagerUser = null) {
  const stageKey = stage?.stage_key ?? stage?.stageKey;
  if (stageKey === 'closeout') {
    return projectManagerUser?.department || null;
  }

  return STATIC_STAGE_APPROVAL_CENTERS[stageKey] || null;
}

export function getStageApprovalRule(stage, projectManagerUser = null) {
  const stageKey = stage?.stage_key ?? stage?.stageKey;
  const approvalCenter = getStageApprovalCenter(stage, projectManagerUser);

  return {
    stageKey,
    approvalCenter,
    requiresGeneralManagerApproval: isGeneralManagerApprovalStage(stageKey),
    centerApprovalNode: `${stageKey}.center_manager`,
    generalApprovalNode: `${stageKey}.general_manager`
  };
}

export function isValidCloseoutApprovalCenter(rule) {
  if (rule.stageKey !== 'closeout') {
    return true;
  }

  return isValidBusinessDepartment(rule.approvalCenter);
}

export function isProjectApprovalProjectManager(user, project) {
  return (
    Boolean(user?.id) &&
    Boolean(project?.project_manager_user_id ?? project?.projectManagerUserId) &&
    String(user.id) === String(project.project_manager_user_id ?? project.projectManagerUserId)
  );
}

export function canUserSubmitStageApproval(user, project) {
  return isProjectApprovalProjectManager(user, project);
}

export function canUserApproveAsCenterManager(user, rule) {
  return (
    user?.organizationRole === ORGANIZATION_ROLE.CENTER_MANAGER &&
    isValidBusinessDepartment(user.department) &&
    user.department === rule.approvalCenter
  );
}

export function canUserApproveAsGeneralManager(user, rule) {
  return (
    user?.organizationRole === ORGANIZATION_ROLE.GENERAL_MANAGER &&
    rule.requiresGeneralManagerApproval
  );
}

export function canUserHandleStageApproval(user) {
  return (
    user?.organizationRole === ORGANIZATION_ROLE.CENTER_MANAGER ||
    user?.organizationRole === ORGANIZATION_ROLE.GENERAL_MANAGER
  );
}

export function normalizeApprovalComment(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

export function assertApprovalReturnComment(value, ErrorClass) {
  const comment = normalizeApprovalComment(value);
  if (!comment || comment.length > 1000) {
    throw new ErrorClass(
      PROJECT_APPROVAL_ERROR.INVALID_APPROVAL_COMMENT,
      'Approval return comment is required',
      400,
      ['comment']
    );
  }

  return comment;
}
