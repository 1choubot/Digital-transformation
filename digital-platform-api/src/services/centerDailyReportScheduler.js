import { env } from '../config/env.js';
import { CENTER_DAILY_REPORT_DEPARTMENTS } from '../domain/centerDailyReports.js';
import {
  getCenterDailyReportDto,
  getCenterDailySchedule,
  getShanghaiDateString,
  getShanghaiMinuteString,
  withCenterDailyExportLock
} from '../repositories/centerDailyReportRepository.js';
import { generateCenterDailyReportWorkbook } from './centerDailyReportExportService.js';

let schedulerTimer = null;

// Run all center exports that are due for the current Asia/Shanghai minute.
export async function runDueCenterDailyReportExports(now = new Date()) {
  const reportDate = getShanghaiDateString(now);
  const currentMinute = getShanghaiMinuteString(now);
  const results = [];

  for (const department of CENTER_DAILY_REPORT_DEPARTMENTS) {
    const schedule = await getCenterDailySchedule({ department });
    if (!schedule.isEnabled || schedule.generateTime !== currentMinute) {
      continue;
    }

    const lockKey = `center_daily_report:${department}:${reportDate}:${currentMinute}`;
    const locked = await withCenterDailyExportLock(lockKey, async () => {
      const report = await getCenterDailyReportDto({ department, reportDate });
      const download = await generateCenterDailyReportWorkbook({
        ...report,
        generatedBy: {
          name: '系统自动生成',
          account: 'system'
        }
      });

      return {
        department,
        reportDate,
        filePath: download.filePath,
        fileName: download.fileName
      };
    });

    results.push({
      department,
      acquired: locked.acquired,
      export: locked.result
    });
  }

  return results;
}

// Start a lightweight minute poller; tests call runDueCenterDailyReportExports directly.
export function startCenterDailyReportScheduler() {
  if (!env.centerDailyScheduler.enabled || schedulerTimer) {
    return null;
  }

  schedulerTimer = setInterval(() => {
    runDueCenterDailyReportExports().catch((error) => {
      console.error('Center daily report scheduler failed', error);
    });
  }, 60 * 1000);

  schedulerTimer.unref?.();
  return schedulerTimer;
}

// Stop the poller during process shutdown or test cleanup.
export function stopCenterDailyReportScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
