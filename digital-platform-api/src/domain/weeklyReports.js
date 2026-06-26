import { ReportStatus } from './reports.js';
import { formatIsoDate, getWeekStart, parseIsoDate } from './reportWorkdays.js';

// Weekly report APIs keep their own error codes so clients can branch safely.
export const WEEKLY_REPORT_ERROR = {
  INVALID_ID: 'INVALID_WEEKLY_REPORT_ID',
  INVALID_WEEK: 'INVALID_WEEKLY_REPORT_WEEK',
  INVALID_STATUS: 'INVALID_WEEKLY_REPORT_STATUS',
  REQUIRED_FIELDS: 'WEEKLY_REPORT_REQUIRED_FIELDS',
  DUPLICATE_REPORT: 'WEEKLY_REPORT_DUPLICATE',
  NOT_FOUND: 'WEEKLY_REPORT_NOT_FOUND',
  FORBIDDEN: 'WEEKLY_REPORT_FORBIDDEN',
  DELETE_SUBMITTED: 'WEEKLY_REPORT_DELETE_SUBMITTED',
  EVALUATE_SUBMITTED_ONLY: 'WEEKLY_REPORT_EVALUATE_SUBMITTED_ONLY',
  INVALID_FINAL_REVIEW: 'WEEKLY_REPORT_INVALID_FINAL_REVIEW'
};

// Completion status values mirror weekly_report_summaries.completion_status.
export const WeeklyCompletionStatus = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  NOT_COMPLETED: 'not_completed',
  ADDED: 'added'
};

const WEEKLY_COMPLETION_STATUSES = new Set(Object.values(WeeklyCompletionStatus));
// 最终评审等级只允许使用固定的 A-E 档位。
const FINAL_REVIEW_GRADES = new Set(['A', 'B', 'C', 'D', 'E']);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export class WeeklyReportError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'WeeklyReportError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Validate numeric identifiers from params and query strings.
export function parsePositiveInteger(value, fieldName, code = WEEKLY_REPORT_ERROR.INVALID_ID) {
  const text = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(text)) {
    throw new WeeklyReportError(code, `Invalid ${fieldName}`, 400, [fieldName]);
  }

  const id = Number(text);
  if (!Number.isSafeInteger(id)) {
    throw new WeeklyReportError(code, `Invalid ${fieldName}`, 400, [fieldName]);
  }

  return id;
}

// Return YYYY-MM-DD for valid ISO dates and reject impossible calendar dates.
export function normalizeIsoDate(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!ISO_DATE_PATTERN.test(text)) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.INVALID_WEEK, `Invalid ${fieldName}`, 400, [fieldName]);
  }

  try {
    return formatIsoDate(parseIsoDate(text));
  } catch {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.INVALID_WEEK, `Invalid ${fieldName}`, 400, [fieldName]);
  }
}

// Validate that the submitted period is exactly one natural Monday-Sunday week.
export function normalizeWeeklyPeriod(payload = {}) {
  const weekStart = normalizeIsoDate(payload.weekStart, 'weekStart');
  const weekEnd = normalizeIsoDate(payload.weekEnd, 'weekEnd');
  const startDate = parseIsoDate(weekStart);
  const expectedEnd = new Date(startDate.getTime() + 6 * DAY_MS);

  if (getWeekStart(weekStart) !== weekStart || formatIsoDate(expectedEnd) !== weekEnd) {
    throw new WeeklyReportError(
      WEEKLY_REPORT_ERROR.INVALID_WEEK,
      'Weekly report period must be a natural Monday-Sunday week',
      400,
      ['weekStart', 'weekEnd']
    );
  }

  return { weekStart, weekEnd };
}

// Compute the previous natural week for a supplied business date.
export function getPreviousWeeklyPeriod(businessDate) {
  const currentWeekStart = parseIsoDate(getWeekStart(normalizeIsoDate(businessDate, 'businessDate')));
  const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * DAY_MS);
  const previousWeekEnd = new Date(previousWeekStart.getTime() + 6 * DAY_MS);

  return {
    weekStart: formatIsoDate(previousWeekStart),
    weekEnd: formatIsoDate(previousWeekEnd)
  };
}

// Trim optional text while preserving null for nullable database columns.
function normalizeNullableText(value, maxLength = 5000) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : null;
}

// Track missing fields without throwing until the row has been fully inspected.
function normalizeRequiredText(value, fieldName, missing, maxLength = 5000) {
  const text = String(value ?? '').trim();
  if (!text) {
    missing.push(fieldName);
    return '';
  }

  return text.slice(0, maxLength);
}

// Empty draft rows are ignored so drafts can be saved progressively.
function isEmptyRow(row) {
  return Object.values(row || {}).every((value) => String(value ?? '').trim() === '');
}

// Normalize one weekly summary row before repository persistence.
function normalizeSummaryRow(row, index, isSubmit) {
  const missing = [];
  const prefix = `summaries.${index}`;
  const normalized = {
    sortOrder: index + 1,
    workTask: normalizeRequiredText(row?.workTask, `${prefix}.workTask`, missing, 500),
    workTarget: normalizeRequiredText(row?.workTarget, `${prefix}.workTarget`, missing),
    plannedDate: normalizeIsoDate(row?.plannedDate, `${prefix}.plannedDate`),
    completionStatus: String(row?.completionStatus || '').trim(),
    completionDescription: normalizeRequiredText(row?.completionDescription, `${prefix}.completionDescription`, missing, 500),
    completedDate: normalizeIsoDate(row?.completedDate, `${prefix}.completedDate`)
  };

  if (!WEEKLY_COMPLETION_STATUSES.has(normalized.completionStatus)) {
    missing.push(`${prefix}.completionStatus`);
  }

  if (isSubmit && missing.length > 0) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.REQUIRED_FIELDS, 'Missing weekly summary fields', 400, missing);
  }

  if (missing.length > 0) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.REQUIRED_FIELDS, 'Incomplete weekly summary row', 400, missing);
  }

  return normalized;
}

// Normalize one next-week plan row before repository persistence.
function normalizePlanRow(row, index, isSubmit) {
  const missing = [];
  const prefix = `plans.${index}`;
  const normalized = {
    sortOrder: index + 1,
    workTask: normalizeRequiredText(row?.workTask, `${prefix}.workTask`, missing, 500),
    workTarget: normalizeRequiredText(row?.workTarget, `${prefix}.workTarget`, missing),
    plannedDate: normalizeIsoDate(row?.plannedDate, `${prefix}.plannedDate`),
    responsiblePerson: normalizeNullableText(row?.responsiblePerson, 128)
  };

  if (isSubmit && missing.length > 0) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.REQUIRED_FIELDS, 'Missing weekly plan fields', 400, missing);
  }

  if (missing.length > 0) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.REQUIRED_FIELDS, 'Incomplete weekly plan row', 400, missing);
  }

  return normalized;
}

// Normalize create/update payloads for the weekly report repository.
export function normalizeWeeklyReportPayload(payload = {}) {
  const status = payload.status || ReportStatus.DRAFT;
  if (![ReportStatus.DRAFT, ReportStatus.SUBMITTED].includes(status)) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.INVALID_STATUS, 'Invalid weekly report status', 400, ['status']);
  }

  const period = normalizeWeeklyPeriod(payload);
  const isSubmit = status === ReportStatus.SUBMITTED;
  const rawSummaries = Array.isArray(payload.summaries) ? payload.summaries.filter((row) => !isEmptyRow(row)) : [];
  const rawPlans = Array.isArray(payload.plans) ? payload.plans.filter((row) => !isEmptyRow(row)) : [];

  if (isSubmit && rawSummaries.length === 0) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.REQUIRED_FIELDS, 'Weekly report summaries are required', 400, ['summaries']);
  }

  if (isSubmit && rawPlans.length === 0) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.REQUIRED_FIELDS, 'Weekly report plans are required', 400, ['plans']);
  }

  return {
    ...period,
    status,
    summaries: rawSummaries.map((row, index) => normalizeSummaryRow(row, index, isSubmit)),
    plans: rawPlans.map((row, index) => normalizePlanRow(row, index, isSubmit))
  };
}

// Normalize comparison overview query values before authorization is applied.
export function normalizeComparisonOverviewFilters(query = {}) {
  const filters = {
    weekStart: normalizeIsoDate(query.weekStart, 'weekStart')
  };

  if (query.department) {
    filters.department = String(query.department).trim();
  }

  return filters;
}

// Normalize final manual review input before persisting evaluator decisions.
export function normalizeWeeklyFinalReviewPayload(payload = {}) {
  const finalScore = Number(payload.finalScore);
  if (!Number.isFinite(finalScore) || finalScore < 0 || finalScore > 100) {
    throw new WeeklyReportError(
      WEEKLY_REPORT_ERROR.INVALID_FINAL_REVIEW,
      'Final score must be between 0 and 100',
      400,
      ['finalScore']
    );
  }
  const finalGrade = normalizeNullableText(payload.finalGrade, 20);
  if (finalGrade && !FINAL_REVIEW_GRADES.has(finalGrade)) {
    throw new WeeklyReportError(
      WEEKLY_REPORT_ERROR.INVALID_FINAL_REVIEW,
      'Final grade must be A, B, C, D, or E',
      400,
      ['finalGrade']
    );
  }

  return {
    finalScore: Math.round(finalScore * 100) / 100,
    finalGrade,
    finalComment: normalizeNullableText(payload.finalComment, 5000)
  };
}
