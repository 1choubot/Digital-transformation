import {
  isValidBusinessDepartment,
  PROJECT_MODE,
  isValidProjectMode,
  normalizeEnumText
} from './organization.js';

export const PROJECT_STATUS = {
  NORMAL: 'normal',
  RISK: 'risk',
  PAUSED: 'paused',
  DELAYED: 'delayed',
  COMPLETED: 'completed'
};

const ALLOWED_STATUSES = new Set(Object.values(PROJECT_STATUS));

export class ValidationError extends Error {
  constructor(message, details = [], code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
    this.code = code;
  }
}

function firstValue(source, ...keys) {
  for (const key of keys) {
    if (source[key] !== undefined) {
      return source[key];
    }
  }
  return undefined;
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function normalizeDate(value) {
  const text = normalizeText(value);
  return text === '' ? null : text;
}

function normalizeDepartments(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    if (normalizeText(value) === '') {
      return null;
    }

    throw new ValidationError(
      'Invalid participating department',
      ['participatingDepartments'],
      'INVALID_PARTICIPATING_DEPARTMENT'
    );
  }

  const normalized = [];
  const seen = new Set();

  for (const item of value) {
    const department = normalizeEnumText(item);
    if (!isValidBusinessDepartment(department)) {
      throw new ValidationError(
        'Invalid participating department',
        ['participatingDepartments'],
        'INVALID_PARTICIPATING_DEPARTMENT'
      );
    }

    if (!seen.has(department)) {
      seen.add(department);
      normalized.push(department);
    }
  }

  return normalized.length > 0 ? normalized : null;
}

function normalizeProjectMode(value) {
  const text = normalizeEnumText(value);
  if (!text) {
    return null;
  }

  const projectMode = text;
  if (!isValidProjectMode(projectMode)) {
    throw new ValidationError('Invalid project mode', ['projectMode'], 'INVALID_PROJECT_MODE');
  }

  return projectMode;
}

function normalizeProjectManagerUserId(value) {
  const text = normalizeEnumText(value);
  if (!text) {
    return null;
  }

  if (!/^[1-9]\d*$/.test(text)) {
    throw new ValidationError(
      'Invalid project manager user id',
      ['projectManagerUserId'],
      'INVALID_PROJECT_MANAGER_USER_ID'
    );
  }

  const id = Number(text);
  if (!Number.isSafeInteger(id)) {
    throw new ValidationError(
      'Invalid project manager user id',
      ['projectManagerUserId'],
      'INVALID_PROJECT_MANAGER_USER_ID'
    );
  }

  return id;
}

export function normalizeCreateProjectInput(payload) {
  const projectCode = normalizeText(firstValue(payload, 'projectCode', 'project_code')) || null;
  const project = {
    projectCode,
    projectName: normalizeText(firstValue(payload, 'projectName', 'project_name')),
    customerName: normalizeText(firstValue(payload, 'customerName', 'customer_name')),
    customerContact: normalizeText(firstValue(payload, 'customerContact', 'customer_contact')),
    projectMode: normalizeProjectMode(firstValue(payload, 'projectMode', 'project_mode')),
    projectManagerUserId: normalizeProjectManagerUserId(
      firstValue(payload, 'projectManagerUserId', 'project_manager_user_id')
    ),
    participatingDepartments: normalizeDepartments(
      firstValue(payload, 'participatingDepartments', 'participating_departments')
    ),
    status: normalizeText(firstValue(payload, 'status')) || PROJECT_STATUS.NORMAL,
    plannedStartDate: normalizeDate(firstValue(payload, 'plannedStartDate', 'planned_start_date')),
    plannedEndDate: normalizeDate(firstValue(payload, 'plannedEndDate', 'planned_end_date')),
    remark: normalizeText(firstValue(payload, 'remark'))
  };

  const missing = [];
  if (!project.projectName) missing.push('projectName');
  if (!project.customerName) missing.push('customerName');
  if (!project.customerContact) missing.push('customerContact');

  if (missing.length > 0) {
    throw new ValidationError('Missing required project fields', missing);
  }

  if (!ALLOWED_STATUSES.has(project.status)) {
    throw new ValidationError('Invalid project status', ['status']);
  }

  return project;
}
