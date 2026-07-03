import { pool } from '../../db/pool.js';
import {
  BUSINESS_DEPARTMENT,
  canAdvanceProjectStage,
  canBeProjectManagerUser,
  canBeResponsibleUser,
  isCenterManagerUser,
  isValidBusinessDepartment
} from '../../domain/organization.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { COMPLETION_MODE, DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import { canViewProjectOperationLogs } from '../stageDocuments/accessControl.js';
import { initializeProjectStageDocuments } from '../stageDocuments/checklistRepository.js';
import { attachInitiationReviewToStageDocumentRows } from '../stageDocuments/initiationReviewRepository.js';
import { deriveStageDocumentCompletion } from '../stageDocuments/shared.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import {
  DuplicateProjectCodeError,
  ProjectAuthorizationError,
  ProjectCodeUpdateError,
  PROJECT_MANAGER_ERROR,
  PROJECT_RESPONSIBLE_USER_ERROR,
  ProjectManagerUserError,
  ProjectResponsibleUserError,
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

async function selectProjectResponsibleUser(connection, userId, expectedDepartment, fieldName, label) {
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
    [userId]
  );

  const row = rows[0];
  if (!row || !row.is_enabled) {
    throw new ProjectResponsibleUserError(
      PROJECT_RESPONSIBLE_USER_ERROR.NOT_FOUND_OR_DISABLED,
      `${label} user not found or disabled`,
      409,
      [fieldName]
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

  if (!canBeResponsibleUser(user)) {
    throw new ProjectResponsibleUserError(
      PROJECT_RESPONSIBLE_USER_ERROR.ROLE_NOT_ALLOWED,
      `${label} user role is not allowed`,
      409,
      [fieldName]
    );
  }

  if (user.department !== expectedDepartment) {
    throw new ProjectResponsibleUserError(
      PROJECT_RESPONSIBLE_USER_ERROR.DEPARTMENT_NOT_ALLOWED,
      `${label} user department is not allowed`,
      409,
      [fieldName]
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
      customer_contact,
      project_mode,
      project_manager,
      project_manager_user_id,
      business_responsible_user_id,
      technical_responsible_user_id,
      participating_departments,
      status,
      ended_reason,
      ended_by_user_id,
      ended_at,
      planned_start_date,
      planned_end_date,
      remark,
      created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.project_code,
      row.project_name,
      row.customer_name,
      row.customer_contact,
      row.project_mode,
      row.project_manager,
      row.project_manager_user_id,
      row.business_responsible_user_id,
      row.technical_responsible_user_id,
      row.participating_departments,
      row.status,
      row.ended_reason,
      row.ended_by_user_id,
      row.ended_at,
      row.planned_start_date,
      row.planned_end_date,
      row.remark,
      row.created_by_user_id
    ]
  );

  return result.insertId;
}

async function assignInitiationResponsibleUser(connection, projectId, businessResponsibleUserId, updatedByUserId) {
  await connection.execute(
    `UPDATE project_stage_documents
    SET responsible_user_id = ?,
      responsibility_updated_by_user_id = ?,
      responsibility_updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND document_code IN ('1.1', '1.2')`,
    [businessResponsibleUserId, updatedByUserId, projectId]
  );
}

export async function createProject(project, createdByUserId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const projectManagerUser = project.projectManagerUserId
      ? await selectProjectManagerUser(connection, project.projectManagerUserId)
      : null;
    const businessResponsibleUser = await selectProjectResponsibleUser(
      connection,
      project.businessResponsibleUserId,
      BUSINESS_DEPARTMENT.MARKETING_CENTER,
      'businessResponsibleUserId',
      'Business responsible'
    );
    const technicalResponsibleUser = await selectProjectResponsibleUser(
      connection,
      project.technicalResponsibleUserId,
      BUSINESS_DEPARTMENT.RD_CENTER,
      'technicalResponsibleUserId',
      'Technical responsible'
    );
    const projectId = await insertProject(connection, {
      ...project,
      projectManager: projectManagerUser?.name ?? null,
      businessResponsibleUserId: businessResponsibleUser.id,
      technicalResponsibleUserId: technicalResponsibleUser.id,
      status: PROJECT_STATUS.NORMAL,
      endedReason: null,
      endedByUserId: null,
      endedAt: null,
      createdByUserId
    });
    await insertInitialStages(connection, projectId);
    await initializeProjectStageDocuments(connection, projectId);
    await assignInitiationResponsibleUser(connection, projectId, businessResponsibleUser.id, createdByUserId);
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
        projectName: project.projectName,
        customerName: project.customerName,
        customerContact: project.customerContact,
        projectMode: project.projectMode ?? null,
        projectManagerUserId: project.projectManagerUserId ?? null,
        businessResponsibleUserId: businessResponsibleUser.id,
        technicalResponsibleUserId: technicalResponsibleUser.id,
        participatingDepartments: project.participatingDepartments ?? null,
        plannedStartDate: project.plannedStartDate ?? null,
        plannedEndDate: project.plannedEndDate ?? null
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

async function selectProjectForCodeUpdate(connection, projectId, user) {
  if (isCenterManagerUser(user) && isValidBusinessDepartment(user.department)) {
    const [rows] = await connection.execute(
      `SELECT
        p.*,
        EXISTS (
          SELECT 1
          FROM project_stage_documents d
          LEFT JOIN users u
            ON u.id = d.responsible_user_id
          WHERE d.project_id = p.id
            AND (
              d.owner_department = ?
              OR d.review_department = ?
              OR (
                d.owner_department IS NULL
                AND d.review_department IS NULL
                AND u.department = ?
              )
            )
        ) AS has_department_responsible
      FROM projects p
      WHERE p.id = ?
      LIMIT 1
      FOR UPDATE`,
      [user.department, user.department, user.department, projectId]
    );

    if (rows.length === 0) {
      throw new ProjectNotFoundError(projectId);
    }

    return rows[0];
  }

  const [rows] = await connection.execute(
    'SELECT *, 0 AS has_department_responsible FROM projects WHERE id = ? LIMIT 1 FOR UPDATE',
    [projectId]
  );

  if (rows.length === 0) {
    throw new ProjectNotFoundError(projectId);
  }

  return rows[0];
}

function assertCanUpdateProjectCode(user, projectRow) {
  if (projectRow.status === PROJECT_STATUS.ENDED) {
    throw new ProjectCodeUpdateError(
      'PROJECT_ALREADY_ENDED',
      'Project has ended and project code cannot be updated',
      409,
      ['status']
    );
  }

  if (!canAdvanceProjectStage(user, projectRow)) {
    throw new ProjectAuthorizationError(
      'FORBIDDEN_OPERATION',
      'Current user cannot update project code',
      ['projectId']
    );
  }
}

async function assertProjectCodeReady(connection, projectId) {
  const [rows] = await connection.execute(
    `SELECT
      id,
      document_code,
      document_name,
      status,
      completion_mode,
      is_applicable,
      revision_required,
      revision_reason,
      revision_source_document_id,
      revision_requested_at,
      revision_resubmitted_at
    FROM project_stage_documents
    WHERE project_id = ?
      AND document_code IN ('1.1', '1.2', '1.3')
    FOR UPDATE`,
    [projectId]
  );
  const rowsWithInitiationReview = await attachInitiationReviewToStageDocumentRows(connection, rows);
  const byCode = new Map(rowsWithInitiationReview.map((row) => [row.document_code, row]));
  const initiationApproval = byCode.get('1.2');
  const initiationRequirement = byCode.get('1.1');
  const initiationNotice = byCode.get('1.3');
  const details = [];

  if (
    !initiationApproval ||
    initiationApproval.completion_mode !== COMPLETION_MODE.APPROVAL_REQUIRED ||
    !deriveStageDocumentCompletion(initiationApproval).isComplete
  ) {
    details.push('1.2');
  }

  if (
    initiationRequirement &&
    Boolean(initiationRequirement.revision_required) &&
    String(initiationRequirement.revision_source_document_id) === String(initiationApproval?.id)
  ) {
    details.push('1.1');
  }

  if (
    !initiationNotice ||
    initiationNotice.completion_mode !== COMPLETION_MODE.SUBMIT_ONLY ||
    !Boolean(initiationNotice.is_applicable) ||
    ![DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED].includes(initiationNotice.status)
  ) {
    details.push('1.3');
  }

  if (details.length > 0) {
    throw new ProjectCodeUpdateError(
      'PROJECT_CODE_GATE_NOT_READY',
      'Project code can be updated only after initiation approval and notice completion',
      409,
      details
    );
  }
}

async function assertProjectCodeUnique(connection, projectId, projectCode) {
  const [rows] = await connection.execute(
    `SELECT id
    FROM projects
    WHERE project_code = ?
      AND id <> ?
    LIMIT 1
    FOR UPDATE`,
    [projectCode, projectId]
  );

  if (rows.length > 0) {
    throw new DuplicateProjectCodeError(projectCode);
  }
}

export async function updateProjectCode({ projectId, projectCode, user }) {
  const normalizedProjectCode = String(projectCode ?? '').trim();
  if (!normalizedProjectCode) {
    throw new ProjectCodeUpdateError(
      'PROJECT_CODE_REQUIRED',
      'Project code is required',
      400,
      ['projectCode']
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const projectRow = await selectProjectForCodeUpdate(connection, projectId, user);
    assertCanUpdateProjectCode(user, projectRow);
    await assertProjectCodeReady(connection, projectId);
    await assertProjectCodeUnique(connection, projectId, normalizedProjectCode);

    if (projectRow.project_code !== normalizedProjectCode) {
      await connection.execute('UPDATE projects SET project_code = ? WHERE id = ?', [
        normalizedProjectCode,
        projectId
      ]);
      await insertOperationLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.PROJECT_CODE_UPDATED,
        targetType: OPERATION_TARGET_TYPE.PROJECT,
        targetId: projectId,
        summary: `更新项目编号：${normalizedProjectCode}`,
        details: {
          fromProjectCode: projectRow.project_code,
          toProjectCode: normalizedProjectCode
        }
      });
    }

    const detail = await selectProjectDetailWithConnection(connection, projectId);
    await connection.commit();
    return detail;
  } catch (error) {
    await connection.rollback();
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
      business_responsible_user_id,
      technical_responsible_user_id,
      created_by_user_id,
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

  if (!canViewProjectOperationLogs(user, project)) {
    throw new ProjectAuthorizationError(
      'FORBIDDEN_OPERATION',
      'Current user cannot access project operation logs',
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
      p.customer_contact,
      p.project_mode,
      p.project_manager,
      p.project_manager_user_id,
      p.business_responsible_user_id,
      p.technical_responsible_user_id,
      p.status,
      p.ended_reason,
      p.ended_by_user_id,
      p.ended_at,
      p.planned_start_date,
      p.planned_end_date,
      p.created_by_user_id,
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
      ended_by.file_platform_user_id AS ended_by_file_platform_user_id,
      s.stage_order AS current_stage_order,
      s.stage_key AS current_stage_key,
      s.stage_name AS current_stage_name,
      s.stage_status AS current_stage_status
    FROM projects p
    LEFT JOIN users u
      ON u.id = p.created_by_user_id
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    LEFT JOIN users br
      ON br.id = p.business_responsible_user_id
    LEFT JOIN users tr
      ON tr.id = p.technical_responsible_user_id
    LEFT JOIN users ended_by
      ON ended_by.id = p.ended_by_user_id
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
    LEFT JOIN users u
      ON u.id = p.created_by_user_id
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    LEFT JOIN users br
      ON br.id = p.business_responsible_user_id
    LEFT JOIN users tr
      ON tr.id = p.technical_responsible_user_id
    LEFT JOIN users ended_by
      ON ended_by.id = p.ended_by_user_id
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
