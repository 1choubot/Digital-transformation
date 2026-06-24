// Report statuses are shared by daily and weekly report persistence.
export const ReportStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted'
};

// Organization roles come from users.organization_role and drive report permissions.
export const OrganizationRole = {
  GENERAL_MANAGER: 'general_manager',
  CENTER_MANAGER: 'center_manager',
  EMPLOYEE: 'employee',
  GENERAL_MANAGER_ASSISTANT: 'general_manager_assistant',
  SYSTEM_ADMIN: 'system_admin'
};

// Department labels are centralized so API, exports, and frontend can stay aligned.
export const DepartmentLabels = {
  sales_center: '营销中心',
  rd_center: '研发中心',
  manufacturing_center: '制造中心',
  operations_center: '运营中心'
};

// Weekly rest modes determine whether Saturday is counted as an expected workday.
export const WeeklyRestMode = {
  SINGLE_REST: 'single_rest',
  DOUBLE_REST: 'double_rest'
};

// Daily reports are employee-only write workflows in P0.
export const DAILY_REPORT_WRITER_ROLES = new Set([OrganizationRole.EMPLOYEE]);

// Weekly reports are writable by employees and center managers.
export const WEEKLY_REPORT_WRITER_ROLES = new Set([
  OrganizationRole.EMPLOYEE,
  OrganizationRole.CENTER_MANAGER
]);

// Center daily reports are visible to management roles and platform admins.
export const CENTER_DAILY_REPORT_READER_ROLES = new Set([
  OrganizationRole.CENTER_MANAGER,
  OrganizationRole.GENERAL_MANAGER,
  OrganizationRole.GENERAL_MANAGER_ASSISTANT,
  OrganizationRole.SYSTEM_ADMIN
]);

// Rest-mode anchors are managed only by general managers or platform admins.
export const WEEKLY_REST_MODE_MANAGER_ROLES = new Set([
  OrganizationRole.GENERAL_MANAGER,
  OrganizationRole.SYSTEM_ADMIN
]);

// These roles can read cross-center summaries instead of being scoped to one center.
export const ALL_CENTER_READER_ROLES = new Set([
  OrganizationRole.GENERAL_MANAGER,
  OrganizationRole.GENERAL_MANAGER_ASSISTANT,
  OrganizationRole.SYSTEM_ADMIN
]);

// Prefer organizationRole, but keep role as a compatibility fallback for old sessions.
export function getUserOrganizationRole(user) {
  return user?.organizationRole || user?.role || '';
}

// Platform admin is a privileged switch for management-only report actions.
export function canManageWeeklyRestMode(user) {
  return Boolean(user?.isPlatformAdmin) || WEEKLY_REST_MODE_MANAGER_ROLES.has(getUserOrganizationRole(user));
}

// Daily report creation is intentionally not granted through platform admin.
export function canWriteDailyReport(user) {
  return DAILY_REPORT_WRITER_ROLES.has(getUserOrganizationRole(user));
}

// Weekly report creation is intentionally not granted through platform admin.
export function canWriteWeeklyReport(user) {
  return WEEKLY_REPORT_WRITER_ROLES.has(getUserOrganizationRole(user));
}

// Center-report reads allow platform admins even when organizationRole is not system_admin.
export function canReadCenterDailyReport(user) {
  return Boolean(user?.isPlatformAdmin) || CENTER_DAILY_REPORT_READER_ROLES.has(getUserOrganizationRole(user));
}

// Center managers are scoped to their own department; broader management sees all centers.
export function canReadAllCenters(user) {
  return Boolean(user?.isPlatformAdmin) || ALL_CENTER_READER_ROLES.has(getUserOrganizationRole(user));
}
