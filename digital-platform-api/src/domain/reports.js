import { ORGANIZATION_ROLE, BUSINESS_DEPARTMENT } from './organization.js';

// Report statuses are shared by daily and weekly report persistence.
export const ReportStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted'
};

// Re-export the main organization model names expected by report modules.
export const OrganizationRole = ORGANIZATION_ROLE;

// Re-export business departments so report code does not define a parallel department model.
export const DepartmentLabels = BUSINESS_DEPARTMENT;

// Weekly rest modes determine whether Saturday is counted as an expected workday.
export const WeeklyRestMode = {
  SINGLE_REST: 'single_rest',
  DOUBLE_REST: 'double_rest'
};

// Daily reports are employee-only write workflows in P0.
const DAILY_REPORT_WRITER_ROLES = new Set([ORGANIZATION_ROLE.EMPLOYEE]);

// Weekly reports are writable by employees and center managers.
const WEEKLY_REPORT_WRITER_ROLES = new Set([ORGANIZATION_ROLE.EMPLOYEE, ORGANIZATION_ROLE.CENTER_MANAGER]);

// Center daily reports are visible to management roles and platform admins.
const CENTER_DAILY_REPORT_READER_ROLES = new Set([
  ORGANIZATION_ROLE.CENTER_MANAGER,
  ORGANIZATION_ROLE.GENERAL_MANAGER,
  ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT,
  ORGANIZATION_ROLE.SYSTEM_ADMIN
]);

// Rest-mode anchors are managed only by general managers or platform admins.
const WEEKLY_REST_MODE_MANAGER_ROLES = new Set([ORGANIZATION_ROLE.GENERAL_MANAGER, ORGANIZATION_ROLE.SYSTEM_ADMIN]);

// These roles can read cross-center summaries instead of being scoped to one center.
const ALL_CENTER_READER_ROLES = new Set([
  ORGANIZATION_ROLE.GENERAL_MANAGER,
  ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT,
  ORGANIZATION_ROLE.SYSTEM_ADMIN
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

// Center-report reads allow platform admins only when they also satisfy main's system-admin model.
export function canReadCenterDailyReport(user) {
  return CENTER_DAILY_REPORT_READER_ROLES.has(getUserOrganizationRole(user));
}

// Center managers are scoped to their own department; broader management sees all centers.
export function canReadAllCenters(user) {
  return ALL_CENTER_READER_ROLES.has(getUserOrganizationRole(user));
}
