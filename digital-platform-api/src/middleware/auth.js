import { AuthError, getBearerToken } from '../domain/auth.js';
import { ORGANIZATION_ROLE } from '../domain/organization.js';
import {
  canManageWeeklyRestMode,
  canReadAllCenters,
  canReadCenterDailyReport,
  canWriteDailyReport,
  canWriteWeeklyReport,
  getUserOrganizationRole
} from '../domain/reports.js';
import { findUserBySessionToken } from '../repositories/sessionRepository.js';
import { asyncHandler } from './asyncHandler.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);
  const user = await findUserBySessionToken(token);

  if (!user) {
    throw new AuthError('UNAUTHENTICATED', 'Authentication required', 401);
  }

  if (!user.isEnabled) {
    throw new AuthError('USER_DISABLED', 'User is disabled', 403);
  }

  req.auth = {
    token,
    user
  };

  next();
});

function requireReportPermission(predicate, code, message) {
  return (req, res, next) => {
    const user = req.auth?.user;
    if (!predicate(user)) {
      throw new AuthError(code, message, 403);
    }

    next();
  };
}

export const requireDailyReportWriter = requireReportPermission(
  canWriteDailyReport,
  'DAILY_REPORT_WRITER_REQUIRED',
  'Daily report writer role required'
);

export const requireWeeklyReportWriter = requireReportPermission(
  canWriteWeeklyReport,
  'WEEKLY_REPORT_WRITER_REQUIRED',
  'Weekly report writer role required'
);

export const requireReportProjectSearchUser = requireReportPermission(
  (user) => canWriteDailyReport(user) || canWriteWeeklyReport(user),
  'REPORT_PROJECT_SEARCH_REQUIRED',
  'Report project search role required'
);

export const requireCenterDailyReportReader = requireReportPermission(
  canReadCenterDailyReport,
  'CENTER_DAILY_REPORT_READER_REQUIRED',
  'Center daily report reader role required'
);

export const requireWeeklyRestModeManager = requireReportPermission(
  canManageWeeklyRestMode,
  'WEEKLY_REST_MODE_MANAGER_REQUIRED',
  'Weekly rest mode manager required'
);

export function assertSameDepartmentOrAllCenters(user, department) {
  if (!canReadAllCenters(user) && getUserOrganizationRole(user) !== ORGANIZATION_ROLE.SYSTEM_ADMIN) {
    if (user?.department !== department) {
      throw new AuthError('CENTER_SCOPE_FORBIDDEN', 'Center scope forbidden', 403);
    }
  }
}

export const requirePlatformAdmin = asyncHandler(async (req, res, next) => {
  if (
    !req.auth?.user?.isPlatformAdmin ||
    req.auth.user.organizationRole !== ORGANIZATION_ROLE.SYSTEM_ADMIN
  ) {
    throw new AuthError('PLATFORM_ADMIN_REQUIRED', 'Platform admin required', 403);
  }

  next();
});
