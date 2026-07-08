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
  normalizeWeeklyFinalReviewPayload,
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
  getWeeklyReportEvaluationTarget,
  getWeeklyReportExportDtoForAuthorizedRead,
  getWeeklyReportForAuthorizedRead,
  listWeeklyComparisonOverview,
  listWeeklyReports,
  reviewWeeklyReportApproval,
  saveWeeklyReportEvaluation,
  saveWeeklyReportFinalReview,
  updateWeeklyReport
} from '../repositories/weeklyReportRepository.js';
import { evaluateWeeklyReportScore } from '../services/weeklyReportEvaluationService.js';
import {
  composeWeeklyPrefillWithAi,
  getWeeklyReportAiCapability
} from '../services/weeklyReportPrefillAiService.js';
import { buildWeeklyReportPrefillSuggestion } from '../services/weeklyReportPrefillService.js';
import { generateWeeklyReportWorkbook } from '../services/weeklyReportExportService.js';
import { cleanupReportExportFile } from '../services/reportExportFile.js';
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

async function streamWorkbookDownload(res, download) {
  await new Promise((resolve, reject) => {
    res.download(
      download.filePath,
      download.fileName,
      {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Length': String(download.fileSize || 0)
        }
      },
      (error) => {
        cleanupReportExportFile(download.filePath);
        if (error && !res.headersSent) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
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
  '/ai-capability',
  asyncHandler(async (req, res) => {
    res.json({
      data: {
        capability: getWeeklyReportAiCapability()
      }
    });
  })
);

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

weeklyReportsRouter.post(
  '/prefill-suggestion/ai-compose',
  requireWeeklyReportWriter,
  asyncHandler(async (req, res) => {
    const weekStart = normalizeIsoDate(req.body?.weekStart, 'weekStart');
    if (getWeekStart(weekStart) !== weekStart) {
      throw new WeeklyReportError(WEEKLY_REPORT_ERROR.INVALID_WEEK, 'weekStart must be a Monday', 400, ['weekStart']);
    }

    const currentSuggestion = await buildWeeklyReportPrefillSuggestion({ user: req.auth.user, weekStart });
    if (String(req.body?.basisHash || '') !== String(currentSuggestion.basisHash || '')) {
      res.status(409).json({
        error: {
          code: WEEKLY_REPORT_ERROR.PREFILL_BASIS_CHANGED,
          message: 'Weekly prefill basis changed'
        },
        data: {
          suggestion: currentSuggestion
        }
      });
      return;
    }

    const suggestion = await composeWeeklyPrefillWithAi(
      currentSuggestion,
      req.app.locals.weeklyReportPrefillAiClient
    );

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

weeklyReportsRouter.post(
  '/:reportId/evaluate',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const force = req.query.force === 'true' || req.body?.force === true;
    const target = await getWeeklyReportEvaluationTarget({ reportId, evaluatorUser: req.auth.user, force });

    if (target.cached) {
      res.json({
        data: {
          report: target.report,
          cached: true
        }
      });
      return;
    }

    const evaluated = await evaluateWeeklyReportScore({
      weeklyReport: target.report,
      dailyEvidence: target.dailyEvidence,
      comparisonRows: target.comparisonRows,
      expectedWorkdates: target.workdayContext.expectedWorkdates,
      workdayContext: target.workdayContext,
      aiClient: req.app.locals.weeklyReportEvaluationAiClient
    });
    const report = await saveWeeklyReportEvaluation({
      reportId,
      score: evaluated.score,
      source: evaluated.source,
      error: evaluated.error
    });

    res.json({
      data: {
        report,
        cached: false
      }
    });
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

weeklyReportsRouter.put(
  '/:reportId/final-review',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const finalReview = normalizeWeeklyFinalReviewPayload(req.body || {});
    const report = await saveWeeklyReportFinalReview({
      reportId,
      evaluatorUser: req.auth.user,
      finalReview
    });

    res.json({
      data: {
        report
      }
    });
  })
);

weeklyReportsRouter.post(
  '/:reportId/export',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const exportDto = await getWeeklyReportExportDtoForAuthorizedRead({ reportId, requesterUser: req.auth.user });
    const download = await generateWeeklyReportWorkbook(exportDto);
    await streamWorkbookDownload(res, download);
  })
);
