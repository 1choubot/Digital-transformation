import { pool } from '../../db/pool.js';
import { canBeProjectManagerUser } from '../../domain/organization.js';
import { canViewCompleteProjectAudit } from '../stageDocuments/accessControl.js';
import { initializeProjectStageDocuments } from '../stageDocuments/checklistRepository.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import {
  DuplicateProjectCodeError,
  ProjectAuthorizationError,
  PROJECT_MANAGER_ERROR,
  ProjectManagerUserError,
  mapProject,
  mapProjectListItem,
  mapStage,
  ProjectNotFoundError,
  selectProjectWithCreatorById,
  toProjectRow
} from './shared.js';
import { insertInitialStages, selectProjectStages } from './stageRepository.js';
import { buildProjectVisibilityWhereClause, canViewProject } from './visibility.js';

async function selectProjectManagerUser(connection, projectManagerUserId) {
  const [rows] = await connection.execute(
    `SELECT
      id,
      account,
      display_name,
      department,
      organization_role,
      role,
      is_enabled,
      file_platform_user_id
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [projectManagerUserId]
  );

  const row = rows[0];
  if (!row || !row.is_enabled) {
    throw new ProjectManagerUserError(
      PROJECT_MANAGER_ERROR.NOT_FOUND_OR_DISABLED,
      'Project manager user not found or disabled'
    );
  }

  const user = {
    id: row.id,
    account: row.account,
    name: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled),
    filePlatformUserId: row.file_platform_user_id
  };

  if (!canBeProjectManagerUser(user)) {
    throw new ProjectManagerUserError(
      PROJECT_MANAGER_ERROR.ROLE_NOT_ALLOWED,
      'Project manager user role is not allowed'
    );
  }

  return user;
}

async function insertProject(connection, project) {
  const row = toProjectRow(project);
  const [result] = await connection.execute(
    `INSERT INTO projects (
      project_code,
      project_name,
      customer_name,
      project_mode,
      project_manager,
      project_manager_user_id,
      participating_departments,
      status,
      planned_start_date,
      planned_end_date,
      remark,
      created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.project_code,
      row.project_name,
      row.customer_name,
      row.project_mode,
      row.project_manager,
      row.project_manager_user_id,
      row.participating_departments,
      row.status,
      row.planned_start_date,
      row.planned_end_date,
      row.remark,
      row.created_by_user_id
    ]
  );

  return result.insertId;
}

export async function createProject(project, createdByUserId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const projectManagerUser = await selectProjectManagerUser(connection, project.projectManagerUserId);
    const projectId = await insertProject(connection, {
      ...project,
      projectManager: projectManagerUser.name,
      createdByUserId
    });
    await insertInitialStages(connection, projectId);
    await initializeProjectStageDocuments(connection, projectId);
    await insertOperationLog(connection, {
      projectId,
      actorUserId: createdByUserId,
      actionType: OPERATION_ACTION_TYPE.PROJECT_CREATED,
      targetType: OPERATION_TARGET_TYPE.PROJECT,
      targetId: projectId,
      summary: `创建项目：${project.projectName}`,
      details: {
        projectId,
        projectCode: project.projectCode,
        projectName: project.projectName
      }
    });
    await connection.commit();

    const [projectRows, stageRows] = await Promise.all([
      selectProjectWithCreatorById(connection, projectId),
      selectProjectStages(connection, projectId)
    ]);

    return {
      project: mapProject(projectRows[0]),
      stages: stageRows.map(mapStage)
    };
  } catch (error) {
    await connection.rollback();

    if (error && error.code === 'ER_DUP_ENTRY') {
      throw new DuplicateProjectCodeError(project.projectCode);
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function projectExists(projectId) {
  const [rows] = await pool.execute('SELECT id FROM projects WHERE id = ? LIMIT 1', [projectId]);
  return rows.length > 0;
}

export async function assertProjectViewable(projectId, user) {
  if (!(await projectExists(projectId))) {
    throw new ProjectNotFoundError(projectId);
  }

  if (!(await canViewProject(pool, user, projectId))) {
    throw new ProjectAuthorizationError(
      'FORBIDDEN_OPERATION',
      'Current user cannot access this project',
      ['projectId']
    );
  }
}

export async function assertProjectAuditViewable(projectId, user) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      project_manager_user_id,
      participating_departments
    FROM projects
    WHERE id = ?
    LIMIT 1`,
    [projectId]
  );
  const project = rows[0];

  if (!project) {
    throw new ProjectNotFoundError(projectId);
  }

  if (!canViewCompleteProjectAudit(user, project)) {
    throw new ProjectAuthorizationError(
      'FORBIDDEN_OPERATION',
      'Current user cannot access complete project audit history',
      ['projectId']
    );
  }
}

export async function listProjects(user) {
  const visibility = buildProjectVisibilityWhereClause(user, 'p');
  const [rows] = await pool.execute(
    `SELECT
      p.id,
      p.project_code,
      p.project_name,
      p.customer_name,
      p.project_mode,
      p.project_manager,
      p.project_manager_user_id,
      p.status,
      p.planned_start_date,
      p.planned_end_date,
      p.created_by_user_id,
      u.account AS creator_account,
      u.display_name AS creator_display_name,
      u.department AS creator_department,
      u.organization_role AS creator_organization_role,
      u.role AS creator_role,
      u.job_title AS creator_job_title,
      u.is_enabled AS creator_is_enabled,
      u.file_platform_user_id AS creator_file_platform_user_id,
      pm.account AS project_manager_account,
      pm.display_name AS project_manager_display_name,
      pm.department AS project_manager_department,
      pm.organization_role AS project_manager_organization_role,
      pm.role AS project_manager_role,
      pm.is_enabled AS project_manager_is_enabled,
      pm.file_platform_user_id AS project_manager_file_platform_user_id,
      s.stage_order AS current_stage_order,
      s.stage_key AS current_stage_key,
      s.stage_name AS current_stage_name,
      s.stage_status AS current_stage_status
    FROM projects p
    LEFT JOIN users u
      ON u.id = p.created_by_user_id
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    LEFT JOIN project_stages s
      ON s.project_id = p.id AND s.is_current = 1
    ${visibility.whereClause}
    ORDER BY p.created_at DESC, p.id DESC`
    ,
    visibility.params
  );

  return rows.map(mapProjectListItem);
}

export async function getProjectDetail(projectId, user) {
  const [projectRows] = await pool.execute(
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
      u.file_platform_user_id AS creator_file_platform_user_id,
      pm.account AS project_manager_account,
      pm.display_name AS project_manager_display_name,
      pm.department AS project_manager_department,
      pm.organization_role AS project_manager_organization_role,
      pm.role AS project_manager_role,
      pm.is_enabled AS project_manager_is_enabled,
      pm.file_platform_user_id AS project_manager_file_platform_user_id
    FROM projects p
    LEFT JOIN users u
      ON u.id = p.created_by_user_id
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    WHERE p.id = ?`,
    [projectId]
  );
  const projectRow = projectRows[0];

  if (!projectRow) {
    throw new ProjectNotFoundError(projectId);
  }

  if (!(await canViewProject(pool, user, projectId))) {
    throw new ProjectAuthorizationError(
      'FORBIDDEN_OPERATION',
      'Current user cannot access this project',
      ['projectId']
    );
  }

  const stageRows = await selectProjectStages(pool, projectId);
  const stages = stageRows.map(mapStage);

  return {
    project: mapProject(projectRow),
    stages,
    currentStage: stages.find((stage) => stage.isCurrent) || null
  };
}

export async function selectProjectDetailWithConnection(connection, projectId) {
  const [projectRows, stageRows] = await Promise.all([
    selectProjectWithCreatorById(connection, projectId),
    selectProjectStages(connection, projectId)
  ]);
  const stages = stageRows.map(mapStage);

  return {
    project: mapProject(projectRows[0]),
    stages,
    currentStage: stages.find((stage) => stage.isCurrent) || null
  };
}
