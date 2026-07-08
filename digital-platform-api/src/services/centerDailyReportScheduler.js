import { env } from '../config/env.js';
import { CENTER_DAILY_REPORT_DEPARTMENTS } from '../domain/centerDailyReports.js';
import {
  getCenterDailyReportDto,
  getCenterDailySchedule,
  getShanghaiDateString,
  getShanghaiMinuteString,
  withCenterDailyExportLock
} from '../repositories/centerDailyReportRepository.js';

let schedulerTimer = null;

// 返回兼容旧调用方的“应生成文件名”，但不会实际创建文件。
function buildSkippedCenterDailyFileName({ department, reportDate }) {
  const departmentName = department === 'rd_center' ? '研发中心' : department;
  return `部门工作日报-${departmentName}${String(reportDate).replaceAll('-', '')}.xlsx`;
}

// 检查到点的中心日报任务，但暂停自动生成本地 Excel 文件。
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
      // 只验证数据可生成，真正的 Excel 生成保留给页面手动导出下载。
      await getCenterDailyReportDto({ department, reportDate });

      return {
        department,
        reportDate,
        fileName: buildSkippedCenterDailyFileName({ department, reportDate }),
        skipped: true,
        reason: 'local_report_storage_disabled'
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

// 启动分钟级轮询；当前轮询不会再落盘生成 Excel。
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

// 进程关闭或测试清理时停止轮询。
export function stopCenterDailyReportScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
