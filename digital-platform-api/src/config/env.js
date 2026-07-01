import path from 'node:path';
import dotenv from 'dotenv';
import { WeeklyRestMode } from '../domain/reports.js';

// Load local .env values before building the typed environment object.
dotenv.config();

// Parse integer environment variables with a stable fallback.
function readInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`${name} must be an integer`);
  }

  return value;
}

// Read plain string environment variables while preserving empty-string fallbacks.
function readString(name, fallback = '') {
  const raw = process.env[name];
  return raw === undefined ? fallback : raw;
}

// Keep report roots absolute so generated files are never written under cwd by accident.
function readAbsolutePath(name, fallback) {
  const value = readString(name, fallback);
  if (!path.isAbsolute(value)) {
    throw new Error(`${name} must be an absolute path`);
  }

  return value;
}

// The report plan fixes all date calculations to Asia/Shanghai.
function readAppTimezone() {
  const timezone = readString('APP_TIMEZONE', 'Asia/Shanghai');
  if (timezone !== 'Asia/Shanghai') {
    throw new Error('APP_TIMEZONE must be Asia/Shanghai');
  }

  return timezone;
}

// Validate the default weekly rest mode used before any anchor exists.
function readDefaultWeeklyRestMode() {
  const restMode = readString('REPORT_DEFAULT_WEEKLY_REST_MODE', WeeklyRestMode.DOUBLE_REST);
  if (![WeeklyRestMode.SINGLE_REST, WeeklyRestMode.DOUBLE_REST].includes(restMode)) {
    throw new Error('REPORT_DEFAULT_WEEKLY_REST_MODE must be single_rest or double_rest');
  }

  return restMode;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: readInteger('PORT', 3001),
  appTimezone: readAppTimezone(),
  attachments: {
    storageDir: process.env.STAGE_DOCUMENT_ATTACHMENT_STORAGE_DIR || ''
  },
  reports: {
    templateRoot: readAbsolutePath('REPORT_TEMPLATE_ROOT', 'E:\\Digital-transformation\\docs'),
    exportRoot: readAbsolutePath('REPORT_EXPORT_ROOT', 'E:\\Digital-transformation\\daily_and_weekly_files'),
    defaultWeeklyRestMode: readDefaultWeeklyRestMode()
  },
  deepseek: {
    apiKey: readString('DEEPSEEK_API_KEY', ''),
    apiBase: readString('DEEPSEEK_API_BASE', 'https://api.deepseek.com/v1'),
    model: readString('DEEPSEEK_MODEL', 'deepseek-chat')
  },
  centerDailyScheduler: {
    enabled: readString('CENTER_DAILY_SCHEDULER_ENABLED', 'true') !== 'false',
    pollCron: readString('CENTER_DAILY_SCHEDULER_POLL_CRON', '* * * * *')
  },
  auth: {
    sessionTtlHours: readInteger('AUTH_SESSION_TTL_HOURS', 12),
    initialUser: {
      account: process.env.INITIAL_USER_ACCOUNT || 'admin',
      password: process.env.INITIAL_USER_PASSWORD || 'Admin@123456',
      displayName: process.env.INITIAL_USER_DISPLAY_NAME || '系统管理员',
      department: process.env.INITIAL_USER_DEPARTMENT || '',
      organizationRole: process.env.INITIAL_USER_ORGANIZATION_ROLE || 'system_admin',
      role: process.env.INITIAL_USER_ROLE || '系统管理员',
      filePlatformUserId: process.env.INITIAL_USER_FILE_PLATFORM_USER_ID || ''
    }
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: readInteger('DB_PORT', 3306),
    user: process.env.DB_USER || 'digital_platform',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'digital_platform',
    connectionLimit: readInteger('DB_CONNECTION_LIMIT', 10)
  }
};
