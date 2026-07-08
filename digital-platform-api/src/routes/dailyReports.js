import { Router } from 'express';
import {
  requireAuth,
  requireDailyReportWriter
} from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { readMultipartFile } from '../middleware/multipartFile.js';
import {
  DAILY_REPORT_ERROR,
  parsePositiveInteger,
  normalizeDailyReportListFilters,
  normalizeDailyReportPayload,
  normalizeReportDate
} from '../domain/dailyReports.js';
import { DAILY_REPORT_ATTACHMENT_MAX_FILE_SIZE } from '../storage/dailyReportAttachmentStorage.js';
import {
  assertDailyReportAttachmentTarget,
  createDailyReport,
  deleteDailyReport,
  deleteDailyReportAttachment,
  getDailyReportAttachmentDownload,
  getDailyReportById,
  getDailyReportExportDto,
  getDailyReportPlanSuggestion,
  listAvailableWeeklyPlansForDailyReport,
  listDailyReportAttachments,
  listDailyReports,
  updateDailyReport,
  uploadDailyReportAttachment
} from '../repositories/dailyReportRepository.js';
import { generateDailyReportWorkbook } from '../services/dailyReportExportService.js';
import { cleanupReportExportFile } from '../services/reportExportFile.js';

export const dailyReportsRouter = Router();

// All daily report endpoints require an authenticated employee.
dailyReportsRouter.use(requireAuth, requireDailyReportWriter);

function parseReportId(rawValue) {
  return parsePositiveInteger(rawValue, 'reportId', DAILY_REPORT_ERROR.INVALID_ID);
}

function parseAttachmentId(rawValue) {
  return parsePositiveInteger(rawValue, 'attachmentId', DAILY_REPORT_ERROR.ATTACHMENT_NOT_FOUND);
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

dailyReportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = normalizeDailyReportListFilters(req.query);
    const reports = await listDailyReports({ userId: req.auth.user.id, filters });

    res.json({
      data: {
        reports
      }
    });
  })
);

dailyReportsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const report = normalizeDailyReportPayload(req.body || {});
    const created = await createDailyReport({ user: req.auth.user, report });

    res.status(201).json({
      data: {
        report: created
      }
    });
  })
);

dailyReportsRouter.get(
  '/available-weekly-plans',
  asyncHandler(async (req, res) => {
    const reportDate = normalizeReportDate(req.query.reportDate);
    const projectId = parsePositiveInteger(req.query.projectId, 'projectId', DAILY_REPORT_ERROR.INVALID_PROJECT_ID);
    const suggestion = await listAvailableWeeklyPlansForDailyReport({ user: req.auth.user, reportDate, projectId });

    // The response mirrors plan-suggestion naming so the daily page can switch APIs cleanly.
    res.json({
      data: {
        suggestion
      }
    });
  })
);

dailyReportsRouter.get(
  '/plan-suggestion',
  asyncHandler(async (req, res) => {
    const reportDate = normalizeReportDate(req.query.reportDate);
    const projectId = parsePositiveInteger(req.query.projectId, 'projectId', DAILY_REPORT_ERROR.INVALID_PROJECT_ID);
    const suggestion = await getDailyReportPlanSuggestion({ user: req.auth.user, reportDate, projectId });

    res.json({
      data: {
        suggestion
      }
    });
  })
);

dailyReportsRouter.get(
  '/:reportId',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const report = await getDailyReportById({ reportId, userId: req.auth.user.id });

    res.json({
      data: {
        report
      }
    });
  })
);

dailyReportsRouter.put(
  '/:reportId',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const report = normalizeDailyReportPayload(req.body || {});
    const updated = await updateDailyReport({ reportId, user: req.auth.user, report });

    res.json({
      data: {
        report: updated
      }
    });
  })
);

dailyReportsRouter.delete(
  '/:reportId',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    await deleteDailyReport({ reportId, userId: req.auth.user.id });

    res.status(204).send();
  })
);

dailyReportsRouter.get(
  '/:reportId/export',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const exportDto = await getDailyReportExportDto({ reportId, userId: req.auth.user.id });
    const download = await generateDailyReportWorkbook(exportDto);
    await streamWorkbookDownload(res, download);
  })
);

dailyReportsRouter.get(
  '/:reportId/attachments',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const attachments = await listDailyReportAttachments({ reportId, userId: req.auth.user.id });

    res.json({
      data: {
        attachments
      }
    });
  })
);

dailyReportsRouter.post(
  '/:reportId/attachments',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    await assertDailyReportAttachmentTarget({ reportId, userId: req.auth.user.id });
    const file = await readMultipartFile(req, { maxFileSize: DAILY_REPORT_ATTACHMENT_MAX_FILE_SIZE });
    const attachment = await uploadDailyReportAttachment({ reportId, userId: req.auth.user.id, file });

    res.status(201).json({
      data: {
        attachment
      }
    });
  })
);

dailyReportsRouter.get(
  '/:reportId/attachments/:attachmentId/download',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const attachmentId = parseAttachmentId(req.params.attachmentId);
    const download = await getDailyReportAttachmentDownload({ reportId, attachmentId, userId: req.auth.user.id });

    await new Promise((resolve, reject) => {
      res.download(
        download.filePath,
        download.originalFileName,
        {
          headers: {
            'Content-Type': download.mimeType,
            'Content-Length': String(download.fileSize)
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

dailyReportsRouter.delete(
  '/:reportId/attachments/:attachmentId',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const attachmentId = parseAttachmentId(req.params.attachmentId);
    await deleteDailyReportAttachment({ reportId, attachmentId, userId: req.auth.user.id });

    res.status(204).send();
  })
);
