import { pool } from '../../db/pool.js';
import { initializeProjectStageDocuments } from '../stageDocuments/checklistRepository.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import {
  DuplicateProjectCodeError,
  mapProject,
  mapProjectListItem,
  mapStage,
  ProjectNotFoundError,
  selectProjectWithCreatorById,
  toProjectRow
} from './shared.js';
import { insertInitialStages, selectProjectStages } from './stageRepository.js';

async function insertProject(connection, project) {
  const row = toProjectRow(project);
  const [result] = await connection.execute(
    `INSERT INTO projects (
      project_code,
      project_name,
      customer_name,
      project_manager,
      participating_departments,
      status,
      planned_start_date,
      planned_end_date,
      remark,
      created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.project_code,
      row.project_name,
      row.customer_name,
      row.project_manager,
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
    const projectId = await insertProject(connection, {
      ...project,
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

export async function listProjects() {
  const [rows] = await pool.execute(
    `SELECT
      p.id,
      p.project_code,
      p.project_name,
      p.customer_name,
      p.project_manager,
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
      s.stage_order AS current_stage_order,
      s.stage_key AS current_stage_key,
      s.stage_name AS current_stage_name,
      s.stage_status AS current_stage_status
    FROM projects p
    LEFT JOIN users u
      ON u.id = p.created_by_user_id
    LEFT JOIN project_stages s
      ON s.project_id = p.id AND s.is_current = 1
    ORDER BY p.created_at DESC, p.id DESC`
  );

  return rows.map(mapProjectListItem);
}

export async function getProjectDetail(projectId) {
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
      u.file_platform_user_id AS creator_file_platform_user_id
    FROM projects p
    LEFT JOIN users u
      ON u.id = p.created_by_user_id
    WHERE p.id = ?`,
    [projectId]
  );
  const projectRow = projectRows[0];

  if (!projectRow) {
    throw new ProjectNotFoundError(projectId);
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
