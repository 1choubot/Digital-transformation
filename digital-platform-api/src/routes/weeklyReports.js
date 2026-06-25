import { Router } from 'express';
import {
  requireAuth,
  requireWeeklyReportWriter
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
  normalizeComparisonOverviewFilters,
  normalizeWeeklyFinalReviewPayload,
  normalizeWeeklyReportPayload,
  parsePositiveInteger,
  WEEKLY_REPORT_ERROR,
  WeeklyReportError
} from '../domain/weeklyReports.js';
import {
  createWeeklyReport,
  deleteWeeklyReport,
  getWeeklyReportEvaluationTarget,
  getWeeklyReportExportDto,
  getWeeklyReportComparisonTable,
  getWeeklyReportForAuthorizedRead,
  listWeeklyComparisonOverview,
  listWeeklyReports,
  saveWeeklyReportEvaluation,
  saveWeeklyReportFinalReview,
  updateWeeklyReport
} from '../repositories/weeklyReportRepository.js';
import { evaluateWeeklyReportScore } from '../services/weeklyReportEvaluationService.js';
import { generateWeeklyReportWorkbook } from '../services/weeklyReportExportService.js';

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
    const created = await createWeeklyReport({ userId: req.auth.user.id, report });

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
    const updated = await updateWeeklyReport({ reportId, userId: req.auth.user.id, report });

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
      // Tests can inject a deterministic adapter through app.locals; production uses DeepSeek.
      deepseekClient: req.app.locals.weeklyReportDeepseekClient
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
  requireWeeklyReportWriter,
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const exportDto = await getWeeklyReportExportDto({ reportId, userId: req.auth.user.id });
    const download = await generateWeeklyReportWorkbook(exportDto);

    // Stream generated workbooks without exposing the physical REPORT_EXPORT_ROOT path.
    await new Promise((resolve, reject) => {
      res.download(
        download.filePath,
        download.fileName,
        {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        },
        (error) => {
          if (error && !res.headersSent) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    });
  })
);
