export const MAIN_MENU_CODES = {
  PROJECT: 'project',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  DASHBOARD: 'dashboard',
  ADMIN: 'admin'
};

export const mainMenus = [
  {
    code: MAIN_MENU_CODES.PROJECT,
    name: '项目管理',
    activeRouteNames: ['projects', 'project-overview-dashboard', 'project-create', 'project-detail'],
    visible: (user) => !canAccessUserManagement(user)
  },
  {
    code: MAIN_MENU_CODES.DAILY,
    name: '日报管理',
    activeRouteNames: ['daily-report', 'daily-reports', 'center-daily-report'],
    visible: (user) => !canAccessUserManagement(user) && (isDailyReportUser(user) || canAccessCenterDailyReport(user))
  },
  {
    code: MAIN_MENU_CODES.WEEKLY,
    name: '周报管理',
    activeRouteNames: ['weekly-report', 'weekly-reports', 'weekly-report-review', 'weekly-report-overview'],
    visible: (user) =>
      !canAccessUserManagement(user) &&
      (isWeeklyReportUser(user) || canAccessWeeklyReports(user) || canAccessWeeklyOverview(user))
  },
  {
    code: MAIN_MENU_CODES.DASHBOARD,
    name: '过程追踪看板',
    activeRouteNames: ['my-stage-document-tasks'],
    visible: (user) => !canAccessUserManagement(user)
  },
  {
    code: MAIN_MENU_CODES.ADMIN,
    name: '系统设置',
    activeRouteNames: ['users'],
    visible: (user) => canAccessUserManagement(user)
  }
];

export function canAccessUserManagement(user) {
  return Boolean(user?.isPlatformAdmin && user?.organizationRole === 'system_admin');
}

export function canCurrentUserCreateProject(user) {
  return ['general_manager', 'center_manager'].includes(user?.organizationRole);
}

export function isDailyReportUser(user) {
  return user?.organizationRole === 'employee';
}

export function isWeeklyReportUser(user) {
  return ['employee', 'center_manager'].includes(user?.organizationRole);
}

export function canAccessWeeklyReports(user) {
  return ['employee', 'center_manager', 'general_manager', 'general_manager_assistant'].includes(
    user?.organizationRole
  );
}

export function canAccessCenterDailyReport(user) {
  return ['center_manager', 'general_manager', 'general_manager_assistant', 'system_admin'].includes(
    user?.organizationRole
  );
}

export function canAccessWeeklyOverview(user) {
  return ['center_manager', 'general_manager', 'general_manager_assistant'].includes(user?.organizationRole);
}

export function canAccessNavigationRoute(route, user) {
  switch (route) {
    case '/projects/new':
      return canCurrentUserCreateProject(user);
    case '/daily-report':
    case '/daily-reports':
      return isDailyReportUser(user) || canAccessCenterDailyReport(user);
    case '/center-daily-report':
      return canAccessCenterDailyReport(user);
    case '/weekly-report':
      return isWeeklyReportUser(user);
    case '/weekly-reports':
      return canAccessWeeklyReports(user);
    case '/weekly-overview':
      return canAccessWeeklyOverview(user);
    case '/users':
      return canAccessUserManagement(user);
    default:
      return true;
  }
}
