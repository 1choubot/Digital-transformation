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

export const requirePlatformAdmin = asyncHandler(async (req, res, next) => {
  if (
    !req.auth?.user?.isPlatformAdmin ||
    req.auth.user.organizationRole !== ORGANIZATION_ROLE.SYSTEM_ADMIN
  ) {
    throw new AuthError('PLATFORM_ADMIN_REQUIRED', 'Platform admin required', 403);
  }

  next();
});

// Build a small synchronous guard for report permissions after requireAuth.
function requireReportPermission(predicate, code, message) {
  return (req, res, next) => {
    const user = req.auth?.user;
    if (!predicate(user)) {
      throw new AuthError(code, message, 403);
    }

    next();
  };
}

// Daily report writes are restricted to organization_role=employee.
export const requireDailyReportWriter = requireReportPermission(
  canWriteDailyReport,
  'DAILY_REPORT_WRITER_REQUIRED',
  'Daily report writer role required'
);

// Weekly report writes are restricted to employee and center_manager roles.
export const requireWeeklyReportWriter = requireReportPermission(
  canWriteWeeklyReport,
  'WEEKLY_REPORT_WRITER_REQUIRED',
  'Weekly report writer role required'
);

// Center daily report reads are restricted to management roles.
export const requireCenterDailyReportReader = requireReportPermission(
  canReadCenterDailyReport,
  'CENTER_DAILY_REPORT_READER_REQUIRED',
  'Center daily report reader role required'
);

// Weekly rest-mode anchors can be managed by general managers and system admins.
export const requireWeeklyRestModeManager = requireReportPermission(
  canManageWeeklyRestMode,
  'WEEKLY_REST_MODE_MANAGER_REQUIRED',
  'Weekly rest mode manager role required'
);

// Center managers may only read their own center unless they have a broader role.
export function assertSameDepartmentOrAllCenters(user, department) {
  if (!canReadAllCenters(user) && getUserOrganizationRole(user) !== ORGANIZATION_ROLE.SYSTEM_ADMIN) {
    if (user?.department !== department) {
      throw new AuthError('CENTER_SCOPE_FORBIDDEN', 'Center scope forbidden', 403);
    }
  }
}
