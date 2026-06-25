import { BUSINESS_DEPARTMENT, isValidBusinessDepartment } from './organization.js';

export const CENTER_DAILY_REPORT_ERROR = {
  INVALID_DATE: 'CENTER_DAILY_REPORT_INVALID_DATE',
  INVALID_DEPARTMENT: 'CENTER_DAILY_REPORT_INVALID_DEPARTMENT',
  INVALID_TIME: 'CENTER_DAILY_REPORT_INVALID_TIME'
};

export class CenterDailyReportError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'CenterDailyReportError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Keep the center selector aligned with the existing organization model.
export const CENTER_DAILY_REPORT_DEPARTMENTS = Object.values(BUSINESS_DEPARTMENT);

// Center daily reports are natural-day reports and accept strict ISO dates only.
export function normalizeCenterDailyReportDate(value, fieldName = 'date') {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new CenterDailyReportError(
      CENTER_DAILY_REPORT_ERROR.INVALID_DATE,
      `${fieldName} must be YYYY-MM-DD`,
      400,
      [fieldName]
    );
  }

  return text;
}

// Department values must come from the platform's fixed business center codes.
export function normalizeCenterDailyReportDepartment(value) {
  const department = String(value || '').trim();
  if (!isValidBusinessDepartment(department)) {
    throw new CenterDailyReportError(
      CENTER_DAILY_REPORT_ERROR.INVALID_DEPARTMENT,
      'Invalid center department',
      400,
      ['department']
    );
  }

  return department;
}

// Schedule times are stored as HH:mm so center managers cannot submit seconds or dates.
export function normalizeCenterDailyScheduleTime(value) {
  const text = String(value || '').trim();
  if (!/^\d{2}:\d{2}$/.test(text)) {
    throw new CenterDailyReportError(
      CENTER_DAILY_REPORT_ERROR.INVALID_TIME,
      'generateTime must be HH:mm',
      400,
      ['generateTime']
    );
  }

  const [hour, minute] = text.split(':').map(Number);
  if (hour > 23 || minute > 59) {
    throw new CenterDailyReportError(
      CENTER_DAILY_REPORT_ERROR.INVALID_TIME,
      'generateTime must be a valid HH:mm time',
      400,
      ['generateTime']
    );
  }

  return text;
}

// Parse a boolean-ish value while preserving the enabled-by-default business rule.
export function normalizeScheduleEnabled(value) {
  if (value === undefined || value === null || value === '') {
    return true;
  }

  return value === true || value === 'true' || value === 1 || value === '1';
}
