// Report statuses are shared by daily and weekly report pages.
export const ReportStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted'
};

// Weekly approval statuses are independent from draft/submitted report status.
export const WeeklyApprovalStatus = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING: 'pending',
  APPROVED: 'approved',
  RETURNED: 'returned'
};

// Organization roles mirror the backend organization model for page-level guards.
export const OrganizationRole = {
  GENERAL_MANAGER: 'general_manager',
  CENTER_MANAGER: 'center_manager',
  EMPLOYEE: 'employee',
  GENERAL_MANAGER_ASSISTANT: 'general_manager_assistant',
  SYSTEM_ADMIN: 'system_admin'
};

// Weekly rest modes match report_weekly_rest_mode_anchors.rest_mode.
export const WeeklyRestMode = {
  SINGLE_REST: 'single_rest',
  DOUBLE_REST: 'double_rest'
};
