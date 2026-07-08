import { Router } from 'express';
import {
  requireAuth,
  requireWeeklyReportWriter,
  requireWeeklyRestModeManager
} from '../middleware/auth.js';
import { AuthError } from '../domain/auth.js';
import {
  canReadWeeklyReviewOverview,
  getUserOrganizationRole,
  OrganizationRole
} from '../domain/reports.js';
import { isValidBusinessDepartment } from '../domain/organization.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  normalizeWeeklyApprovalPayload,
  normalizeComparisonOverviewFilters,
  normalizeWeeklyReportPayload,
  normalizeIsoDate,
  parsePositiveInteger,
  WEEKLY_REPORT_ERROR,
  WeeklyReportError
} from '../domain/weeklyReports.js';
import {
  createWeeklyReport,
  deleteWeeklyReport,
  getWeeklyReportComparisonTable,
  getWeeklyReportForAuthorizedRead,
  listWeeklyComparisonOverview,
  listWeeklyReports,
  reviewWeeklyReportApproval,
  updateWeeklyReport
} from '../repositories/weeklyReportRepository.js';
import { buildWeeklyReportPrefillSuggestion } from '../services/weeklyReportPrefillService.js';
import { upsertWeeklyRestModeAnchor, findLatestWeeklyRestModeAnchor } from '../repositories/reportSettingsRepository.js';
import { resolveWeeklyRestMode, getWeekStart } from '../domain/reportWorkdays.js';
import { WeeklyRestMode } from '../domain/reports.js';
import { env } from '../config/env.js';

export const weeklyReportsRouter = Router();

// All weekly report routes require a valid session; individual routes add role checks.
weeklyReportsRouter.use(requireAuth);

function parseReportId(rawValue) {
  return parsePositiveInteger(rawValue, 'reportId', WEEKLY_REPORT_ERROR.INVALID_ID);
}

// Weekly review overview has a narrower business matrix than center daily report overview.
function resolveWeeklyReviewOverviewScope(user, requestedDepartment) {
  if (!canReadWeeklyReviewOverview(user)) {
    throw new AuthError('WEEKLY_REVIEW_OVERVIEW_FORBIDDEN', 'Weekly review overview forbidden', 403);
  }

  if (requestedDepartment && !isValidBusinessDepartment(requestedDepartment)) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.FORBIDDEN, 'Invalid department', 400, ['department']);
  }

  if (getUserOrganizationRole(user) === OrganizationRole.CENTER_MANAGER) {
    if (!user?.department) {
      throw new AuthError('CENTER_SCOPE_FORBIDDEN', 'Center scope forbidden', 403);
    }

    if (requestedDepartment && requestedDepartment !== user.department) {
      throw new AuthError('CENTER_SCOPE_FORBIDDEN', 'Center scope forbidden', 403);
    }

    return {
      department: user.department,
      subjectRole: OrganizationRole.EMPLOYEE
    };
  }

  return {
    department: requestedDepartment || null,
    subjectRole: OrganizationRole.CENTER_MANAGER
  };
}

// ── Rest-mode anchor endpoints ──

// GET /api/weekly-reports/rest-mode?weekStart=YYYY-MM-DD
// Returns the resolved rest mode for the specified (or current) week and the closest anchor.
weeklyReportsRouter.get(
  '/rest-mode',
  asyncHandler(async (req, res) => {
    const rawWeekStart = req.query.weekStart || getWeekStart(new Date().toISOString().slice(0, 10));
    const weekStart = String(rawWeekStart);
    const anchor = await findLatestWeeklyRestModeAnchor(weekStart);
    const resolvedRestMode = resolveWeeklyRestMode({
      targetWeekStart: weekStart,
      latestAnchor: anchor,
      defaultMode: env.reports.defaultWeeklyRestMode
    });

    res.json({
      data: {
        weekStart,
        resolvedRestMode,
        anchor
      }
    });
  })
);

// PUT /api/weekly-reports/rest-mode
// Creates or updates the rest-mode anchor for a specific week start.
// Only general_manager and system_admin (platform admin) may call this.
weeklyReportsRouter.put(
  '/rest-mode',
  requireWeeklyRestModeManager,
  asyncHandler(async (req, res) => {
    const { weekStart, restMode } = req.body || {};
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(String(weekStart)) || getWeekStart(String(weekStart)) !== String(weekStart)) {
      throw new WeeklyReportError(WEEKLY_REPORT_ERROR.FORBIDDEN, 'weekStart must be a valid Monday date', 400, ['weekStart']);
    }
    if (![WeeklyRestMode.SINGLE_REST, WeeklyRestMode.DOUBLE_REST].includes(restMode)) {
      throw new WeeklyReportError(WEEKLY_REPORT_ERROR.FORBIDDEN, 'restMode must be single_rest or double_rest', 400, ['restMode']);
    }

    const anchor = await upsertWeeklyRestModeAnchor({
      weekStart: String(weekStart),
      restMode,
      userId: req.auth.user.id
    });
    const resolvedRestMode = resolveWeeklyRestMode({
      targetWeekStart: String(weekStart),
      latestAnchor: anchor,
      defaultMode: env.reports.defaultWeeklyRestMode
    });

    res.json({
      data: {
        anchor,
        resolvedRestMode
      }
    });
  })
);

// ── Comparison overview ──

weeklyReportsRouter.get(
  '/prefill-suggestion',
  requireWeeklyReportWriter,
  asyncHandler(async (req, res) => {
    const weekStart = normalizeIsoDate(req.query.weekStart, 'weekStart');
    if (getWeekStart(weekStart) !== weekStart) {
      throw new WeeklyReportError(WEEKLY_REPORT_ERROR.INVALID_WEEK, 'weekStart must be a Monday', 400, ['weekStart']);
    }
    const force = req.query.force === 'true';
    const suggestion = await buildWeeklyReportPrefillSuggestion({ user: req.auth.user, weekStart, force });

    // Prefill is a read-only suggestion and never creates or updates weekly report rows.
    res.json({
      data: {
        suggestion
      }
    });
  })
);

weeklyReportsRouter.get(
  '/comparison-overview',
  asyncHandler(async (req, res) => {
    const filters = normalizeComparisonOverviewFilters(req.query);
    const scope = resolveWeeklyReviewOverviewScope(req.auth.user, filters.department);
    const reports = await listWeeklyComparisonOverview({
      weekStart: filters.weekStart,
      department: scope.department,
      subjectRole: scope.subjectRole
    });

    res.json({
      data: {
        reports
      }
    });
  })
);

weeklyReportsRouter.get(
  '/',
  requireWeeklyReportWriter,
  asyncHandler(async (req, res) => {
    const reports = await listWeeklyReports({
      userId: req.auth.user.id,
      filters: req.query.weekStart ? { weekStart: String(req.query.weekStart) } : {}
    });

    res.json({
      data: {
        reports
      }
    });
  })
);

weeklyReportsRouter.post(
  '/',
  requireWeeklyReportWriter,
  asyncHandler(async (req, res) => {
    const report = normalizeWeeklyReportPayload(req.body || {});
    const created = await createWeeklyReport({ user: req.auth.user, report });

    res.status(201).json({
      data: {
        report: created
      }
    });
  })
);

weeklyReportsRouter.get(
  '/:reportId',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const target = await getWeeklyReportForAuthorizedRead({ reportId, requesterUser: req.auth.user });

    res.json({
      data: {
        report: target.report,
        targetUser: target.user
      }
    });
  })
);

weeklyReportsRouter.get(
  '/:reportId/comparison-table',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const comparison = await getWeeklyReportComparisonTable({ reportId, requesterUser: req.auth.user });

    res.json({
      data: {
        report: comparison.report,
        targetUser: comparison.targetUser,
        rows: comparison.rows
      }
    });
  })
);

weeklyReportsRouter.put(
  '/:reportId',
  requireWeeklyReportWriter,
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const report = normalizeWeeklyReportPayload(req.body || {});
    const updated = await updateWeeklyReport({ reportId, user: req.auth.user, report });

    res.json({
      data: {
        report: updated
      }
    });
  })
);

weeklyReportsRouter.delete(
  '/:reportId',
  requireWeeklyReportWriter,
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    await deleteWeeklyReport({ reportId, userId: req.auth.user.id });

    res.status(204).send();
  })
);

weeklyReportsRouter.put(
  '/:reportId/approval',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const approval = normalizeWeeklyApprovalPayload(req.body || {});
    const report = await reviewWeeklyReportApproval({
      reportId,
      evaluatorUser: req.auth.user,
      approval
    });

    // Approval is independent of final score and returns the refreshed report row.
    res.json({
      data: {
        report
      }
    });
  })
);
