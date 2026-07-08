import { ReportStatus } from './reports.js';

// Daily report APIs accept ISO dates only.
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Time inputs are stored as MySQL TIME values without seconds in the API contract.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Text limits keep API validation close to the database column sizes.
const TEXT_LIMITS = {
  shortText: 128,
  progress: 100,
  longText: 5000
};

// Daily completed-work rows distinguish where the task came from.
export const DailyTaskSourceType = {
  WEEKLY_PLAN: 'weekly_plan',
  AD_HOC: 'ad_hoc',
  LEGACY_UNKNOWN: 'legacy_unknown'
};

// Daily execution status is the structured source of truth for weekly rollups.
export const DailyExecutionStatus = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  NOT_COMPLETED: 'not_completed'
};

const DAILY_TASK_SOURCE_TYPES = new Set(Object.values(DailyTaskSourceType));
const DAILY_EXECUTION_STATUSES = new Set(Object.values(DailyExecutionStatus));
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DAILY_REPORT_ERROR = {
  INVALID_ID: 'INVALID_DAILY_REPORT_ID',
  INVALID_PROJECT_ID: 'INVALID_PROJECT_ID',
  INVALID_DATE: 'INVALID_REPORT_DATE',
  INVALID_STATUS: 'INVALID_DAILY_REPORT_STATUS',
  REQUIRED_FIELDS: 'DAILY_REPORT_REQUIRED_FIELDS',
  PROJECT_NOT_AVAILABLE: 'DAILY_REPORT_PROJECT_NOT_AVAILABLE',
  DUPLICATE_REPORT: 'DAILY_REPORT_DUPLICATE',
  NOT_FOUND: 'DAILY_REPORT_NOT_FOUND',
  FORBIDDEN: 'DAILY_REPORT_FORBIDDEN',
  UPDATE_SUBMITTED: 'DAILY_REPORT_UPDATE_SUBMITTED',
  DELETE_SUBMITTED: 'DAILY_REPORT_DELETE_SUBMITTED',
  INVALID_ATTACHMENT_FILE: 'DAILY_REPORT_INVALID_ATTACHMENT_FILE',
  ATTACHMENT_NOT_FOUND: 'DAILY_REPORT_ATTACHMENT_NOT_FOUND',
  ATTACHMENT_FILE_MISSING: 'DAILY_REPORT_ATTACHMENT_FILE_MISSING',
  INVALID_TASK_SOURCE: 'DAILY_REPORT_INVALID_TASK_SOURCE',
  INVALID_EXECUTION_STATUS: 'DAILY_REPORT_INVALID_EXECUTION_STATUS',
  EXPORT_FAILED: 'DAILY_REPORT_EXPORT_FAILED'
};

export class DailyReportError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'DailyReportError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function assertDailyReportEditable(status) {
  if (status === ReportStatus.SUBMITTED) {
    throw new DailyReportError(
      DAILY_REPORT_ERROR.UPDATE_SUBMITTED,
      'Submitted daily reports cannot be edited',
      409,
      ['status']
    );
  }
}

// Normalize optional text values to null for nullable database columns.
function normalizeNullableText(value, maxLength = TEXT_LIMITS.longText) {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}

// Normalize required text values and report row-specific missing fields.
function normalizeRequiredText(value, fieldName, missing) {
  const text = String(value ?? '').trim();
  if (!text) {
    missing.push(fieldName);
    return '';
  }

  return text.slice(0, TEXT_LIMITS.longText);
}

// Validate a positive integer identifier from params or payload.
export function parsePositiveInteger(value, fieldName, code = DAILY_REPORT_ERROR.INVALID_ID) {
  const text = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(text)) {
    throw new DailyReportError(code, `Invalid ${fieldName}`, 400, [fieldName]);
  }

  const id = Number(text);
  if (!Number.isSafeInteger(id)) {
    throw new DailyReportError(code, `Invalid ${fieldName}`, 400, [fieldName]);
  }

  return id;
}

// Validate ISO report dates without relying on the host timezone.
export function normalizeReportDate(value) {
  const text = String(value ?? '').trim();
  if (!ISO_DATE_PATTERN.test(text)) {
    throw new DailyReportError(DAILY_REPORT_ERROR.INVALID_DATE, 'Invalid report date', 400, ['reportDate']);
  }

  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new DailyReportError(DAILY_REPORT_ERROR.INVALID_DATE, 'Invalid report date', 400, ['reportDate']);
  }

  return text;
}

// Validate HH:mm inputs and convert them to MySQL TIME strings.
function normalizeTime(value, fieldName, missing, { required = false } = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) {
      missing.push(fieldName);
    }
    return null;
  }

  if (!TIME_PATTERN.test(text)) {
    missing.push(fieldName);
    return null;
  }

  return `${text}:00`;
}

// Normalize optional UUID task keys while preserving null for ad hoc and draft rows.
function normalizeTaskKey(value, fieldName, missing, { required = false } = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) {
      missing.push(fieldName);
    }
    return null;
  }

  if (!UUID_PATTERN.test(text)) {
    missing.push(fieldName);
    return null;
  }

  return text;
}

// Normalize the source/status pair; submit mode enforces the new structured fields.
function normalizeItemTracking(item, prefix, missing, isSubmit) {
  const rawSourceType = String(item?.sourceType ?? '').trim();
  const sourceType = rawSourceType || (isSubmit ? '' : DailyTaskSourceType.LEGACY_UNKNOWN);
  if (!sourceType || !DAILY_TASK_SOURCE_TYPES.has(sourceType)) {
    missing.push(`${prefix}.sourceType`);
  }

  const rawExecutionStatus = String(item?.executionStatus ?? '').trim();
  const executionStatus = rawExecutionStatus || null;
  if (isSubmit && !executionStatus) {
    missing.push(`${prefix}.executionStatus`);
  }
  if (executionStatus && !DAILY_EXECUTION_STATUSES.has(executionStatus)) {
    missing.push(`${prefix}.executionStatus`);
  }

  const sourcePlanTaskKey = normalizeTaskKey(
    item?.sourcePlanTaskKey,
    `${prefix}.sourcePlanTaskKey`,
    missing,
    { required: isSubmit && sourceType === DailyTaskSourceType.WEEKLY_PLAN }
  );

  if (sourceType === DailyTaskSourceType.AD_HOC && sourcePlanTaskKey) {
    missing.push(`${prefix}.sourcePlanTaskKey`);
  }

  return {
    sourceType: DAILY_TASK_SOURCE_TYPES.has(sourceType) ? sourceType : DailyTaskSourceType.LEGACY_UNKNOWN,
    sourcePlanTaskKey,
    executionStatus
  };
}

// Normalize one completed-work row.
function normalizeItem(item, index, isSubmit) {
  const missing = [];
  const prefix = `items.${index}`;
  const tracking = normalizeItemTracking(item, prefix, missing, isSubmit);

  const normalized = {
    sortOrder: index + 1,
    ...tracking,
    workContent: normalizeRequiredText(item?.workContent, `${prefix}.workContent`, missing),
    completionProgress: normalizeRequiredText(item?.completionProgress, `${prefix}.completionProgress`, missing).slice(
      0,
      TEXT_LIMITS.progress
    ),
    completedAt: normalizeTime(item?.completedAt, `${prefix}.completedAt`, missing, { required: true }),
    responsiblePerson: normalizeNullableText(item?.responsiblePerson, TEXT_LIMITS.shortText),
    deviationAndCorrectiveAction: normalizeNullableText(item?.deviationAndCorrectiveAction)
  };

  if (isSubmit && normalized.executionStatus === DailyExecutionStatus.COMPLETED && !normalized.completedAt) {
    missing.push(`${prefix}.completedAt`);
  }

  if (
    isSubmit &&
    normalized.executionStatus === DailyExecutionStatus.NOT_COMPLETED &&
    !normalized.deviationAndCorrectiveAction
  ) {
    missing.push(`${prefix}.deviationAndCorrectiveAction`);
  }

  if (isSubmit && missing.length > 0) {
    throw new DailyReportError(DAILY_REPORT_ERROR.REQUIRED_FIELDS, 'Missing daily report item fields', 400, missing);
  }

  return normalized;
}

// Normalize one next-day plan row.
function normalizePlan(plan, index) {
  return {
    sortOrder: index + 1,
    plannedWorkContent: normalizeNullableText(plan?.plannedWorkContent),
    responsiblePerson: normalizeNullableText(plan?.responsiblePerson, TEXT_LIMITS.shortText),
    plannedCompleteAt: normalizeTime(plan?.plannedCompleteAt, `plans.${index}.plannedCompleteAt`, []),
    collaboratingCenter: normalizeNullableText(plan?.collaboratingCenter, TEXT_LIMITS.shortText),
    collaborationItem: normalizeNullableText(plan?.collaborationItem)
  };
}

// Normalize create/update payloads before they reach repositories.
export function normalizeDailyReportPayload(payload = {}, { partial = false } = {}) {
  const status = payload.status || ReportStatus.DRAFT;
  if (![ReportStatus.DRAFT, ReportStatus.SUBMITTED].includes(status)) {
    throw new DailyReportError(DAILY_REPORT_ERROR.INVALID_STATUS, 'Invalid daily report status', 400, ['status']);
  }

  const isSubmit = status === ReportStatus.SUBMITTED;
  const normalized = {
    status,
    items: Array.isArray(payload.items) ? payload.items.map((item, index) => normalizeItem(item, index, isSubmit)) : [],
    plans: Array.isArray(payload.plans) ? payload.plans.map((plan, index) => normalizePlan(plan, index)) : []
  };

  if (!partial || payload.reportDate !== undefined) {
    normalized.reportDate = normalizeReportDate(payload.reportDate);
  }

  if (!partial || payload.projectId !== undefined) {
    normalized.projectId = parsePositiveInteger(payload.projectId, 'projectId', DAILY_REPORT_ERROR.INVALID_PROJECT_ID);
  }

  if (isSubmit && normalized.items.length === 0) {
    throw new DailyReportError(DAILY_REPORT_ERROR.REQUIRED_FIELDS, 'Missing daily report item fields', 400, ['items']);
  }

  return normalized;
}

// Normalize list query filters for the current user's daily report list.
export function normalizeDailyReportListFilters(query = {}) {
  const filters = {};
  if (query.dateFrom) {
    filters.dateFrom = normalizeReportDate(query.dateFrom);
  }
  if (query.dateTo) {
    filters.dateTo = normalizeReportDate(query.dateTo);
  }
  if (query.status) {
    if (![ReportStatus.DRAFT, ReportStatus.SUBMITTED].includes(query.status)) {
      throw new DailyReportError(DAILY_REPORT_ERROR.INVALID_STATUS, 'Invalid daily report status', 400, ['status']);
    }
    filters.status = query.status;
  }

  return filters;
}
