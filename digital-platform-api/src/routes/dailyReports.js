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
  normalizeDailyReportPayload
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
  listDailyReportAttachments,
  listDailyReports,
  updateDailyReport,
  uploadDailyReportAttachment
} from '../repositories/dailyReportRepository.js';
import { generateDailyReportWorkbook } from '../services/dailyReportExportService.js';

export const dailyReportsRouter = Router();

// All daily report endpoints require an authenticated employee.
dailyReportsRouter.use(requireAuth, requireDailyReportWriter);

function parseReportId(rawValue) {
  return parsePositiveInteger(rawValue, 'reportId', DAILY_REPORT_ERROR.INVALID_ID);
}

function parseAttachmentId(rawValue) {
  return parsePositiveInteger(rawValue, 'attachmentId', DAILY_REPORT_ERROR.ATTACHMENT_NOT_FOUND);
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
  '/:reportId/export-data',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const exportDto = await getDailyReportExportDto({ reportId, userId: req.auth.user.id });

    res.json({
      data: exportDto
    });
  })
);

dailyReportsRouter.get(
  '/:reportId/export',
  asyncHandler(async (req, res) => {
    const reportId = parseReportId(req.params.reportId);
    const exportDto = await getDailyReportExportDto({ reportId, userId: req.auth.user.id });
    const download = await generateDailyReportWorkbook(exportDto);

    // Excel files are generated on demand and then streamed through Express download.
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
