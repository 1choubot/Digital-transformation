import { mapCreator } from '../userRepository.js';

export class DuplicateProjectCodeError extends Error {
  constructor(projectCode) {
    super(`Project code already exists: ${projectCode}`);
    this.name = 'DuplicateProjectCodeError';
    this.statusCode = 409;
    this.projectCode = projectCode;
  }
}

export class ProjectNotFoundError extends Error {
  constructor(projectId) {
    super(`Project not found: ${projectId}`);
    this.name = 'ProjectNotFoundError';
    this.statusCode = 404;
    this.projectId = projectId;
  }
}

export class ProjectAuthorizationError extends Error {
  constructor(code = 'FORBIDDEN_OPERATION', message = 'Current user cannot access this project', details = ['projectId']) {
    super(message);
    this.name = 'ProjectAuthorizationError';
    this.statusCode = 403;
    this.code = code;
    this.details = details;
  }
}

export class ProjectStageAdvanceError extends Error {
  constructor(code, message, details = {}, statusCode = 409) {
    super(message);
    this.name = 'ProjectStageAdvanceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ProjectStageNotFoundError extends Error {
  constructor(projectId, stageId) {
    super(`Project stage not found: ${stageId} in project ${projectId}`);
    this.name = 'ProjectStageNotFoundError';
    this.statusCode = 404;
    this.projectId = projectId;
    this.stageId = stageId;
  }
}

export class ProjectApprovalError extends Error {
  constructor(code, message, statusCode = 409, details = []) {
    super(message);
    this.name = 'ProjectApprovalError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ProjectOverviewDashboardQueryError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'ProjectOverviewDashboardQueryError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ProjectCodeUpdateError extends Error {
  constructor(code, message, statusCode = 409, details = []) {
    super(message);
    this.name = 'ProjectCodeUpdateError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ProjectManagerUserError extends Error {
  constructor(code, message, statusCode = 409, details = ['projectManagerUserId']) {
    super(message);
    this.name = 'ProjectManagerUserError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ProjectResponsibleUserError extends Error {
  constructor(code, message, statusCode = 409, details = []) {
    super(message);
    this.name = 'ProjectResponsibleUserError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const PROJECT_OVERVIEW_DASHBOARD_ERROR = {
  INVALID_PROJECT_STATUS_FILTER: 'INVALID_PROJECT_STATUS_FILTER',
  INVALID_STAGE_ORDER: 'INVALID_STAGE_ORDER'
};

export const PROJECT_MANAGER_ERROR = {
  NOT_FOUND_OR_DISABLED: 'PROJECT_MANAGER_USER_NOT_FOUND_OR_DISABLED',
  ROLE_NOT_ALLOWED: 'PROJECT_MANAGER_USER_ROLE_NOT_ALLOWED'
};

export const PROJECT_RESPONSIBLE_USER_ERROR = {
  NOT_FOUND_OR_DISABLED: 'PROJECT_RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED',
  ROLE_NOT_ALLOWED: 'PROJECT_RESPONSIBLE_USER_ROLE_NOT_ALLOWED',
  DEPARTMENT_NOT_ALLOWED: 'PROJECT_RESPONSIBLE_USER_DEPARTMENT_NOT_ALLOWED'
};

function parseJsonValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function toProjectRow(project) {
  return {
    project_code: project.projectCode,
    project_name: project.projectName,
    customer_name: project.customerName,
    customer_contact_person: project.customerContactPerson || null,
    customer_contact: project.customerContact || null,
    project_mode: project.projectMode,
    project_manager: project.projectManager,
    project_manager_user_id: project.projectManagerUserId,
    business_responsible_user_id: project.businessResponsibleUserId,
    technical_responsible_user_id: project.technicalResponsibleUserId,
    participating_departments:
      project.participatingDepartments === null ? null : JSON.stringify(project.participatingDepartments),
    status: project.status,
    ended_reason: project.endedReason || null,
    ended_by_user_id: project.endedByUserId || null,
    ended_at: project.endedAt || null,
    planned_start_date: project.plannedStartDate,
    planned_end_date: project.plannedEndDate,
    remark: project.remark || null,
    created_by_user_id: project.createdByUserId || null
  };
}

export function mapProjectManagerUser(row) {
  if (row.project_manager_user_id === null || row.project_manager_user_id === undefined) {
    return null;
  }

  return {
    id: row.project_manager_user_id,
    account: row.project_manager_account,
    name: row.project_manager_display_name,
    department: row.project_manager_department,
    organizationRole: row.project_manager_organization_role,
    role: row.project_manager_role,
    isEnabled: row.project_manager_is_enabled === null ? null : Boolean(row.project_manager_is_enabled),
    filePlatformUserId: row.project_manager_file_platform_user_id
  };
}

function mapProjectResponsibleUser(row, prefix) {
  const id = row[`${prefix}_user_id`];
  if (id === null || id === undefined) {
    return null;
  }

  return {
    id,
    account: row[`${prefix}_account`],
    name: row[`${prefix}_display_name`],
    department: row[`${prefix}_department`],
    organizationRole: row[`${prefix}_organization_role`],
    role: row[`${prefix}_role`],
    isEnabled: row[`${prefix}_is_enabled`] === null ? null : Boolean(row[`${prefix}_is_enabled`]),
    filePlatformUserId: row[`${prefix}_file_platform_user_id`]
  };
}

export function mapBusinessResponsibleUser(row) {
  return mapProjectResponsibleUser(row, 'business_responsible');
}

export function mapTechnicalResponsibleUser(row) {
  return mapProjectResponsibleUser(row, 'technical_responsible');
}

export function mapProjectEndedByUser(row) {
  return mapProjectResponsibleUser(row, 'ended_by');
}

export function mapProject(row) {
  return {
    id: row.id,
    projectCode: row.project_code,
    projectName: row.project_name,
    customerName: row.customer_name,
    customerContactPerson: row.customer_contact_person ?? null,
    customerContact: row.customer_contact ?? null,
    projectMode: row.project_mode,
    projectManagerUserId: row.project_manager_user_id,
    projectManagerUser: mapProjectManagerUser(row),
    projectManager: row.project_manager_display_name || row.project_manager,
    businessResponsibleUserId: row.business_responsible_user_id,
    businessResponsibleUser: mapBusinessResponsibleUser(row),
    technicalResponsibleUserId: row.technical_responsible_user_id,
    technicalResponsibleUser: mapTechnicalResponsibleUser(row),
    participatingDepartments: parseJsonValue(row.participating_departments),
    status: row.status,
    endedReason: row.ended_reason ?? null,
    endedByUserId: row.ended_by_user_id ?? null,
    endedByUser: mapProjectEndedByUser(row),
    endedAt: row.ended_at ?? null,
    plannedStartDate: row.planned_start_date,
    plannedEndDate: row.planned_end_date,
    remark: row.remark,
    createdByUserId: row.created_by_user_id,
    createdBy: mapCreator(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapProjectListItem(row) {
  const currentStage =
    row.current_stage_key === null
      ? null
      : {
          stageOrder: row.current_stage_order,
          stageKey: row.current_stage_key,
          stageName: row.current_stage_name,
          stageStatus: row.current_stage_status
        };

  return {
    id: row.id,
    projectCode: row.project_code,
    projectName: row.project_name,
    customerName: row.customer_name,
    customerContactPerson: row.customer_contact_person ?? null,
    customerContact: row.customer_contact ?? null,
    projectMode: row.project_mode,
    projectManagerUserId: row.project_manager_user_id,
    projectManagerUser: mapProjectManagerUser(row),
    projectManager: row.project_manager_display_name || row.project_manager,
    businessResponsibleUserId: row.business_responsible_user_id,
    businessResponsibleUser: mapBusinessResponsibleUser(row),
    technicalResponsibleUserId: row.technical_responsible_user_id,
    technicalResponsibleUser: mapTechnicalResponsibleUser(row),
    status: row.status,
    endedReason: row.ended_reason ?? null,
    endedByUserId: row.ended_by_user_id ?? null,
    endedByUser: mapProjectEndedByUser(row),
    endedAt: row.ended_at ?? null,
    plannedStartDate: row.planned_start_date,
    plannedEndDate: row.planned_end_date,
    createdByUserId: row.created_by_user_id,
    createdBy: mapCreator(row),
    currentStage
  };
}

export function mapStage(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    stageOrder: row.stage_order,
    stageKey: row.stage_key,
    stageName: row.stage_name,
    stageStatus: row.stage_status,
    approvalStatus: row.approval_status ?? 'not_submitted',
    isCurrent: Boolean(row.is_current),
    startedAt: row.started_at,
    completedAt: row.completed_at
  };
}

export function buildInClause(values) {
  return values.map(() => '?').join(', ');
}

export function groupRowsBy(rows, keyName) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row[keyName];
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row);
  }

  return grouped;
}

export function selectProjectWithCreatorById(connection, projectId) {
  return connection
    .execute(
      `SELECT
        p.*,
        u.id AS created_by_user_id,
        u.account AS creator_account,
        u.display_name AS creator_display_name,
        u.department AS creator_department,
        u.organization_role AS creator_organization_role,
        u.role AS creator_role,
        u.is_enabled AS creator_is_enabled,
        u.file_platform_user_id AS creator_file_platform_user_id,
        pm.account AS project_manager_account,
        pm.display_name AS project_manager_display_name,
        pm.department AS project_manager_department,
        pm.organization_role AS project_manager_organization_role,
        pm.role AS project_manager_role,
        pm.is_enabled AS project_manager_is_enabled,
        pm.file_platform_user_id AS project_manager_file_platform_user_id,
        br.account AS business_responsible_account,
        br.display_name AS business_responsible_display_name,
        br.department AS business_responsible_department,
        br.organization_role AS business_responsible_organization_role,
        br.role AS business_responsible_role,
        br.is_enabled AS business_responsible_is_enabled,
        br.file_platform_user_id AS business_responsible_file_platform_user_id,
        tr.account AS technical_responsible_account,
        tr.display_name AS technical_responsible_display_name,
        tr.department AS technical_responsible_department,
        tr.organization_role AS technical_responsible_organization_role,
        tr.role AS technical_responsible_role,
        tr.is_enabled AS technical_responsible_is_enabled,
        tr.file_platform_user_id AS technical_responsible_file_platform_user_id,
        ended_by.account AS ended_by_account,
        ended_by.display_name AS ended_by_display_name,
        ended_by.department AS ended_by_department,
        ended_by.organization_role AS ended_by_organization_role,
        ended_by.role AS ended_by_role,
        ended_by.is_enabled AS ended_by_is_enabled,
        ended_by.file_platform_user_id AS ended_by_file_platform_user_id
      FROM projects p
      LEFT JOIN users u ON u.id = p.created_by_user_id
      LEFT JOIN users pm ON pm.id = p.project_manager_user_id
      LEFT JOIN users br ON br.id = p.business_responsible_user_id
      LEFT JOIN users tr ON tr.id = p.technical_responsible_user_id
      LEFT JOIN users ended_by ON ended_by.id = p.ended_by_user_id
      WHERE p.id = ?`,
      [projectId]
    )
    .then(([rows]) => rows);
}
