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
  COMPLETED: 'completed',
  ENDED: 'ended'
};

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
  return normalizePositiveUserId(
    value,
    'projectManagerUserId',
    'INVALID_PROJECT_MANAGER_USER_ID',
    'Invalid project manager user id',
    false
  );
}

function normalizePositiveUserId(value, fieldName, code, message, required = true) {
  const text = normalizeEnumText(value);
  if (!text) {
    if (!required) {
      return null;
    }

    throw new ValidationError(message, [fieldName], code);
  }

  if (!/^[1-9]\d*$/.test(text)) {
    throw new ValidationError(message, [fieldName], code);
  }

  const id = Number(text);
  if (!Number.isSafeInteger(id)) {
    throw new ValidationError(message, [fieldName], code);
  }

  return id;
}

function normalizeBusinessResponsibleUserId(value) {
  return normalizePositiveUserId(
    value,
    'businessResponsibleUserId',
    'INVALID_BUSINESS_RESPONSIBLE_USER_ID',
    'Invalid business responsible user id',
    false
  );
}

function normalizeTechnicalResponsibleUserId(value) {
  return normalizePositiveUserId(
    value,
    'technicalResponsibleUserId',
    'INVALID_TECHNICAL_RESPONSIBLE_USER_ID',
    'Invalid technical responsible user id',
    false
  );
}

function normalizeOptionalProjectManagerUserId(value) {
  const text = normalizeEnumText(value);
  if (!text) {
    return null;
  }

  return normalizeProjectManagerUserId(text);
}

function normalizeCreateProjectStatus(value) {
  const status = normalizeText(value);
  if (!status) {
    return PROJECT_STATUS.NORMAL;
  }

  if (status !== PROJECT_STATUS.NORMAL) {
    throw new ValidationError(
      'Project creation status must be normal',
      ['status'],
      'INVALID_PROJECT_STATUS'
    );
  }

  return PROJECT_STATUS.NORMAL;
}

export function normalizeCreateProjectInput(payload) {
  const projectCode = normalizeText(firstValue(payload, 'projectCode', 'project_code')) || null;
  const project = {
    projectCode,
    projectName: normalizeText(firstValue(payload, 'projectName', 'project_name')),
    customerName: normalizeText(firstValue(payload, 'customerName', 'customer_name')),
    customerContact: normalizeText(firstValue(payload, 'customerContact', 'customer_contact')),
    projectMode: normalizeProjectMode(firstValue(payload, 'projectMode', 'project_mode')),
    projectManagerUserId: normalizeOptionalProjectManagerUserId(
      firstValue(payload, 'projectManagerUserId', 'project_manager_user_id')
    ),
    businessResponsibleUserId: normalizeBusinessResponsibleUserId(
      firstValue(payload, 'businessResponsibleUserId', 'business_responsible_user_id')
    ),
    technicalResponsibleUserId: normalizeTechnicalResponsibleUserId(
      firstValue(payload, 'technicalResponsibleUserId', 'technical_responsible_user_id')
    ),
    participatingDepartments: normalizeDepartments(
      firstValue(payload, 'participatingDepartments', 'participating_departments')
    ),
    status: normalizeCreateProjectStatus(firstValue(payload, 'status')),
    plannedStartDate: normalizeDate(firstValue(payload, 'plannedStartDate', 'planned_start_date')),
    plannedEndDate: normalizeDate(firstValue(payload, 'plannedEndDate', 'planned_end_date')),
    remark: normalizeText(firstValue(payload, 'remark'))
  };

  const missing = [];
  if (!project.projectName) missing.push('projectName');
  if (!project.customerName) missing.push('customerName');
  if (!project.customerContact) missing.push('customerContact');
  if (!project.businessResponsibleUserId) missing.push('businessResponsibleUserId');
  if (!project.technicalResponsibleUserId) missing.push('technicalResponsibleUserId');

  if (missing.length > 0) {
    throw new ValidationError('Missing required project fields', missing);
  }

  return project;
}
