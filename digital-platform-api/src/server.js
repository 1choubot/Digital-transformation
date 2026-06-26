import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';
// 已停用中心日报“每日固定时间自动留档 Excel”，保留实时查看和手动导出。
// import { startCenterDailyReportScheduler, stopCenterDailyReportScheduler } from './services/centerDailyReportScheduler.js';

const app = createApp();
// 已停用自动调度器，避免后台按固定时间生成中心日报 Excel。
// startCenterDailyReportScheduler();

const server = app.listen(env.port, () => {
  console.log(`Digital platform API listening on port ${env.port}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down`);
  // 自动调度器未启动，因此无需在关闭时停止。
  // stopCenterDailyReportScheduler();
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
