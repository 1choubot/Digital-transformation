export const ORGANIZATION_ROLE = {
  GENERAL_MANAGER: 'general_manager',
  SYSTEM_ADMIN: 'system_admin',
  GENERAL_MANAGER_ASSISTANT: 'general_manager_assistant',
  CENTER_MANAGER: 'center_manager',
  EMPLOYEE: 'employee'
};

export const BUSINESS_DEPARTMENT = {
  OPERATIONS_CENTER: 'operations_center',
  MARKETING_CENTER: 'marketing_center',
  MANUFACTURING_CENTER: 'manufacturing_center',
  RD_CENTER: 'rd_center'
};

export const PROJECT_MODE = {
  SELF_DEVELOPED: 'self_developed',
  OUTSOURCED: 'outsourced'
};

const ORGANIZATION_ROLES = new Set(Object.values(ORGANIZATION_ROLE));
const BUSINESS_DEPARTMENTS = new Set(Object.values(BUSINESS_DEPARTMENT));
const PROJECT_MODES = new Set(Object.values(PROJECT_MODE));
const GLOBAL_ROLES = new Set([
  ORGANIZATION_ROLE.GENERAL_MANAGER,
  ORGANIZATION_ROLE.SYSTEM_ADMIN,
  ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT
]);
const DEPARTMENT_ROLES = new Set([ORGANIZATION_ROLE.CENTER_MANAGER, ORGANIZATION_ROLE.EMPLOYEE]);

export function normalizeEnumText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

export function normalizeNullableEnumText(value) {
  const text = normalizeEnumText(value);
  return text === '' ? null : text;
}

export function isValidOrganizationRole(value) {
  return ORGANIZATION_ROLES.has(value);
}

export function isValidBusinessDepartment(value) {
  return BUSINESS_DEPARTMENTS.has(value);
}

export function isValidProjectMode(value) {
  return PROJECT_MODES.has(value);
}

export function isGlobalOrganizationRole(value) {
  return GLOBAL_ROLES.has(value);
}

export function isDepartmentOrganizationRole(value) {
  return DEPARTMENT_ROLES.has(value);
}

export function isSystemAdminUser(user) {
  return user?.organizationRole === ORGANIZATION_ROLE.SYSTEM_ADMIN;
}

export function isGeneralManagerUser(user) {
  return user?.organizationRole === ORGANIZATION_ROLE.GENERAL_MANAGER;
}

export function isGeneralManagerAssistantUser(user) {
  return user?.organizationRole === ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT;
}

export function isCenterManagerUser(user) {
  return user?.organizationRole === ORGANIZATION_ROLE.CENTER_MANAGER;
}

export function isEmployeeUser(user) {
  return user?.organizationRole === ORGANIZATION_ROLE.EMPLOYEE;
}

export function isDepartmentUser(user) {
  return (
    user &&
    isDepartmentOrganizationRole(user.organizationRole) &&
    isValidBusinessDepartment(user.department)
  );
}

export function canBeProjectManagerUser(user) {
  return Boolean(user?.isEnabled) && isDepartmentUser(user);
}

export function canCreateProject(user) {
  return isGeneralManagerUser(user) || isCenterManagerUser(user);
}

export function canBeResponsibleUser(user) {
  return Boolean(user?.isEnabled) && isDepartmentUser(user);
}

export function canCreateProject(user) {
  return isGeneralManagerUser(user) || isCenterManagerUser(user);
}

export function isProjectManagerForProject(user, project) {
  return (
    Boolean(user?.id) &&
    Boolean(project?.project_manager_user_id ?? project?.projectManagerUserId) &&
    String(user.id) === String(project.project_manager_user_id ?? project.projectManagerUserId)
  );
}

export function getProjectParticipatingDepartments(project) {
  const value = project?.participating_departments ?? project?.participatingDepartments;
  if (Array.isArray(value)) {
    return value.filter(isValidBusinessDepartment);
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isValidBusinessDepartment) : [];
  } catch {
    return [];
  }
}

export function isProjectRelatedToDepartment(project, department) {
  if (!isValidBusinessDepartment(department)) {
    return false;
  }

  return (
    getProjectParticipatingDepartments(project).includes(department) ||
    Boolean(project?.has_department_responsible ?? project?.hasDepartmentResponsible)
  );
}

export function getDocumentResponsibleDepartment(document) {
  return document?.responsible_department ?? document?.responsibleUser?.department ?? null;
}

export function getDocumentOwnerDepartment(document) {
  return document?.owner_department ?? document?.ownerDepartment ?? null;
}

export function getDocumentReviewDepartment(document) {
  return document?.review_department ?? document?.reviewDepartment ?? null;
}

export function isStageDocumentOwnedByDepartment(document, department) {
  return isValidBusinessDepartment(department) && getDocumentOwnerDepartment(document) === department;
}

export function isStageDocumentReviewableByDepartment(document, department) {
  return isValidBusinessDepartment(department) && getDocumentReviewDepartment(document) === department;
}

export function isStageDocumentRelatedToDepartment({ project, document, department }) {
  if (!isValidBusinessDepartment(department)) {
    return false;
  }

  const ownerDepartment = getDocumentOwnerDepartment(document);
  const reviewDepartment = getDocumentReviewDepartment(document);
  if (ownerDepartment || reviewDepartment) {
    return ownerDepartment === department || reviewDepartment === department;
  }

  const responsibleDepartment = getDocumentResponsibleDepartment(document);
  if (responsibleDepartment) {
    return responsibleDepartment === department;
  }

  return isProjectRelatedToDepartment(project, department);
}

export function canApproveStageDocument(user, { project = null, document = null } = {}) {
  if (isGeneralManagerUser(user)) {
    return true;
  }

  if (!isCenterManagerUser(user)) {
    return false;
  }

  if (isStageDocumentReviewableByDepartment(document, user.department)) {
    return true;
  }

  const responsibleDepartment = getDocumentResponsibleDepartment(document);
  return !getDocumentReviewDepartment(document) && responsibleDepartment === user.department;
}

export function canSubmitStageDocument(user, { project = null, document = null } = {}) {
  if (isGeneralManagerUser(user)) {
    return true;
  }

  if (isProjectManagerForProject(user, project)) {
    return true;
  }

  if (isCenterManagerUser(user)) {
    const responsibleDepartment = getDocumentResponsibleDepartment(document);
    return Boolean(responsibleDepartment) && responsibleDepartment === user.department;
  }

  const responsibleUserId = document?.responsible_user_id ?? document?.responsibleUserId;
  return Boolean(responsibleUserId) && String(responsibleUserId) === String(user?.id);
}

export function canManageStageDocumentApplicability(user, { project = null, document = null } = {}) {
  if (isGeneralManagerAssistantUser(user) || isSystemAdminUser(user)) {
    return false;
  }

  if (isGeneralManagerUser(user)) {
    return true;
  }

  if (!isCenterManagerUser(user) || !isValidBusinessDepartment(user.department)) {
    return false;
  }

  const ownerDepartment = getDocumentOwnerDepartment(document);
  const reviewDepartment = getDocumentReviewDepartment(document);
  if (ownerDepartment || reviewDepartment) {
    return ownerDepartment === user.department || reviewDepartment === user.department;
  }

  return getDocumentResponsibleDepartment(document) === user.department;
}

export function canManageProjectResponsibility(user, project, { document = null, targetResponsibleUser = null } = {}) {
  if (isGeneralManagerAssistantUser(user) || isSystemAdminUser(user)) {
    return false;
  }

  if (isGeneralManagerUser(user) || isProjectManagerForProject(user, project)) {
    return true;
  }

  if (!isCenterManagerUser(user)) {
    return false;
  }

  const ownerDepartment = getDocumentOwnerDepartment(document);
  const reviewDepartment = getDocumentReviewDepartment(document);
  const managesDocument = ownerDepartment
    ? ownerDepartment === user.department
    : !reviewDepartment && getDocumentResponsibleDepartment(document) === user.department;
  if (!managesDocument) {
    return false;
  }

  if (!targetResponsibleUser) {
    return true;
  }

  return targetResponsibleUser.department === user.department;
}

export function canAdvanceProjectStage(user, project) {
  if (isGeneralManagerAssistantUser(user) || isSystemAdminUser(user)) {
    return false;
  }

  if (isGeneralManagerUser(user) || isProjectManagerForProject(user, project)) {
    return true;
  }

  return isCenterManagerUser(user) && isProjectRelatedToDepartment(project, user.department);
}
