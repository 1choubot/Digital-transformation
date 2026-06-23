export const PROJECT_STATUS = {
  NORMAL: 'normal',
  RISK: 'risk',
  PAUSED: 'paused',
  DELAYED: 'delayed',
  COMPLETED: 'completed'
};

const ALLOWED_STATUSES = new Set(Object.values(PROJECT_STATUS));

export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
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
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  return [normalizeText(value)].filter(Boolean);
}

export function normalizeCreateProjectInput(payload) {
  const project = {
    projectCode: normalizeText(firstValue(payload, 'projectCode', 'project_code')),
    projectName: normalizeText(firstValue(payload, 'projectName', 'project_name')),
    customerName: normalizeText(firstValue(payload, 'customerName', 'customer_name')),
    projectManager: normalizeText(firstValue(payload, 'projectManager', 'project_manager')),
    participatingDepartments: normalizeDepartments(
      firstValue(payload, 'participatingDepartments', 'participating_departments')
    ),
    status: normalizeText(firstValue(payload, 'status')) || PROJECT_STATUS.NORMAL,
    plannedStartDate: normalizeDate(firstValue(payload, 'plannedStartDate', 'planned_start_date')),
    plannedEndDate: normalizeDate(firstValue(payload, 'plannedEndDate', 'planned_end_date')),
    remark: normalizeText(firstValue(payload, 'remark'))
  };

  const missing = [];
  if (!project.projectCode) missing.push('projectCode');
  if (!project.projectName) missing.push('projectName');
  if (!project.customerName) missing.push('customerName');
  if (!project.projectManager) missing.push('projectManager');

  if (missing.length > 0) {
    throw new ValidationError('Missing required project fields', missing);
  }

  if (!ALLOWED_STATUSES.has(project.status)) {
    throw new ValidationError('Invalid project status', ['status']);
  }

  return project;
}
