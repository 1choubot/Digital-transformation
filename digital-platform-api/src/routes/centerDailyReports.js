import { Router } from 'express';
import { AuthError } from '../domain/auth.js';
import {
  CENTER_DAILY_REPORT_DEPARTMENTS,
  normalizeCenterDailyReportDate,
  normalizeCenterDailyReportDepartment,
  normalizeCenterDailyScheduleTime,
  normalizeScheduleEnabled
} from '../domain/centerDailyReports.js';
import { ORGANIZATION_ROLE } from '../domain/organization.js';
import { canReadAllCenters, getUserOrganizationRole } from '../domain/reports.js';
import {
  assertSameDepartmentOrAllCenters,
  requireAuth,
  requireCenterDailyReportReader
} from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  getCenterDailyReportDto,
  getCenterDailySchedule,
  getShanghaiDateString,
  saveCenterDailySchedule
} from '../repositories/centerDailyReportRepository.js';
import { generateCenterDailyReportWorkbook } from '../services/centerDailyReportExportService.js';
import { cleanupReportExportFile } from '../services/reportExportFile.js';

export const centerDailyReportsRouter = Router();

centerDailyReportsRouter.use(requireAuth, requireCenterDailyReportReader);

// Resolve the requested department and enforce center-manager scoping.
export function resolveReadableDepartment(req) {
  const user = req.auth.user;
  const rawDepartment = req.query.department || req.body?.department || user.department;
  const department = normalizeCenterDailyReportDepartment(rawDepartment);
  assertSameDepartmentOrAllCenters(user, department);
  return department;
}

// Only center managers can update their own center; platform admins may update every center.
function assertCanManageSchedule(user, department) {
  const role = getUserOrganizationRole(user);
  const isOwnCenterManager = role === ORGANIZATION_ROLE.CENTER_MANAGER && user.department === department;
  const isPlatformSystemAdmin = Boolean(user.isPlatformAdmin) && role === ORGANIZATION_ROLE.SYSTEM_ADMIN;

  if (!isOwnCenterManager && !isPlatformSystemAdmin) {
    throw new AuthError('CENTER_DAILY_SCHEDULE_FORBIDDEN', 'Center daily schedule update forbidden', 403);
  }
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

// Return the legal center selector values for the current user.
centerDailyReportsRouter.get(
  '/departments',
  asyncHandler(async (req, res) => {
    const user = req.auth.user;
    const departments = canReadAllCenters(user)
      ? CENTER_DAILY_REPORT_DEPARTMENTS
      : [normalizeCenterDailyReportDepartment(user.department)];

    res.json({
      data: {
        departments
      }
    });
  })
);

centerDailyReportsRouter.get(
  '/schedule',
  asyncHandler(async (req, res) => {
    const department = resolveReadableDepartment(req);
    const schedule = await getCenterDailySchedule({ department });

    res.json({
      data: {
        schedule
      }
    });
  })
);

centerDailyReportsRouter.put(
  '/schedule',
  asyncHandler(async (req, res) => {
    const department = normalizeCenterDailyReportDepartment(req.body?.department || req.auth.user.department);
    assertSameDepartmentOrAllCenters(req.auth.user, department);
    assertCanManageSchedule(req.auth.user, department);

    const schedule = await saveCenterDailySchedule({
      department,
      isEnabled: normalizeScheduleEnabled(req.body?.isEnabled),
      generateTime: normalizeCenterDailyScheduleTime(req.body?.generateTime),
      updatedByUserId: req.auth.user.id
    });

    res.json({
      data: {
        schedule
      }
    });
  })
);

centerDailyReportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const department = resolveReadableDepartment(req);
    const reportDate = req.query.date
      ? normalizeCenterDailyReportDate(req.query.date)
      : getShanghaiDateString();
    const report = await getCenterDailyReportDto({ department, reportDate });

    res.json({
      data: {
        report
      }
    });
  })
);

centerDailyReportsRouter.post(
  '/export',
  asyncHandler(async (req, res) => {
    const department = resolveReadableDepartment(req);
    const reportDate = req.body?.date ? normalizeCenterDailyReportDate(req.body.date) : getShanghaiDateString();
    const report = await getCenterDailyReportDto({ department, reportDate });
    const download = await generateCenterDailyReportWorkbook({
      ...report,
      generatedBy: req.auth.user
    });
    await streamWorkbookDownload(res, download);
  })
);
