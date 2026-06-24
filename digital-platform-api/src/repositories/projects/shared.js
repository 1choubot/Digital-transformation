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

export class ProjectStageAdvanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ProjectStageAdvanceError';
    this.statusCode = 409;
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

export const PROJECT_OVERVIEW_DASHBOARD_ERROR = {
  INVALID_PROJECT_STATUS_FILTER: 'INVALID_PROJECT_STATUS_FILTER',
  INVALID_STAGE_ORDER: 'INVALID_STAGE_ORDER'
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
    project_manager: project.projectManager,
    participating_departments:
      project.participatingDepartments === null ? null : JSON.stringify(project.participatingDepartments),
    status: project.status,
    planned_start_date: project.plannedStartDate,
    planned_end_date: project.plannedEndDate,
    remark: project.remark || null,
    created_by_user_id: project.createdByUserId || null
  };
}

export function mapProject(row) {
  return {
    id: row.id,
    projectCode: row.project_code,
    projectName: row.project_name,
    customerName: row.customer_name,
    projectManager: row.project_manager,
    participatingDepartments: parseJsonValue(row.participating_departments),
    status: row.status,
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
    projectManager: row.project_manager,
    status: row.status,
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
        u.job_title AS creator_job_title,
        u.is_enabled AS creator_is_enabled,
        u.file_platform_user_id AS creator_file_platform_user_id
      FROM projects p
      LEFT JOIN users u ON u.id = p.created_by_user_id
      WHERE p.id = ?`,
      [projectId]
    )
    .then(([rows]) => rows);
}
