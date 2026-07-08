import dotenv from 'dotenv';
import { WeeklyRestMode } from '../domain/reports.js';

dotenv.config();

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

function readString(name, fallback = '') {
  const raw = process.env[name];
  return raw === undefined ? fallback : raw;
}

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
  attachments: {
    storageDir: process.env.STAGE_DOCUMENT_ATTACHMENT_STORAGE_DIR || ''
  },
  onlineFormImages: {
    storageDir: process.env.STAGE_DOCUMENT_ONLINE_FORM_IMAGE_STORAGE_DIR || ''
  },
  dailyReportAttachments: {
    storageDir: process.env.DAILY_REPORT_ATTACHMENT_STORAGE_DIR || ''
  },
  reports: {
    defaultWeeklyRestMode: readDefaultWeeklyRestMode()
  },
  centerDailyScheduler: {
    enabled: readString('CENTER_DAILY_SCHEDULER_ENABLED', 'false') === 'true'
  },
  auth: {
    sessionTtlHours: readInteger('AUTH_SESSION_TTL_HOURS', 12),
    initialUser: {
      account: process.env.INITIAL_USER_ACCOUNT || 'admin',
      password: process.env.INITIAL_USER_PASSWORD || 'Admin@123456',
      displayName: process.env.INITIAL_USER_DISPLAY_NAME || '系统管理员',
      department: process.env.INITIAL_USER_DEPARTMENT || '',
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
