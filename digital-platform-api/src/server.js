import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';
import { startCenterDailyReportScheduler, stopCenterDailyReportScheduler } from './services/centerDailyReportScheduler.js';

const app = createApp();
startCenterDailyReportScheduler();

const server = app.listen(env.port, () => {
  console.log(`Digital platform API listening on port ${env.port}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down`);
  stopCenterDailyReportScheduler();
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
