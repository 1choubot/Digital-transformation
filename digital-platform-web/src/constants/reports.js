// Organization roles mirror the backend report permission model.
export const OrganizationRole = {
  GENERAL_MANAGER: 'general_manager',
  CENTER_MANAGER: 'center_manager',
  EMPLOYEE: 'employee',
  GENERAL_MANAGER_ASSISTANT: 'general_manager_assistant',
  SYSTEM_ADMIN: 'system_admin'
};

// Department labels are centralized for report navigation and export screens.
export const DepartmentLabels = {
  sales_center: '营销中心',
  rd_center: '研发中心',
  manufacturing_center: '制造中心',
  operations_center: '运营中心'
};

// Report statuses are shared by daily and weekly report pages.
export const ReportStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted'
};

// Weekly rest modes match report_weekly_rest_mode_anchors.rest_mode.
export const WeeklyRestMode = {
  SINGLE_REST: 'single_rest',
  DOUBLE_REST: 'double_rest'
};
