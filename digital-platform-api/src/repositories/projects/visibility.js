import {
  isCenterManagerUser,
  isEmployeeUser,
  isGeneralManagerAssistantUser,
  isGeneralManagerUser,
  isSystemAdminUser,
  isValidBusinessDepartment
} from '../../domain/organization.js';

export function buildProjectVisibilityCondition(user, projectAlias = 'p') {
  if (isGeneralManagerUser(user) || isGeneralManagerAssistantUser(user)) {
    return {
      sql: '1 = 1',
      params: []
    };
  }

  if (isSystemAdminUser(user)) {
    return {
      sql: '1 = 0',
      params: []
    };
  }

  const projectManagerCondition = `${projectAlias}.project_manager_user_id = ?`;
  const responsibleUserCondition = `EXISTS (
    SELECT 1
    FROM project_stage_documents visible_user_documents
    WHERE visible_user_documents.project_id = ${projectAlias}.id
      AND visible_user_documents.responsible_user_id = ?
  )`;

  if (isCenterManagerUser(user) && isValidBusinessDepartment(user.department)) {
    return {
      sql: `(
        ${projectManagerCondition}
        OR ${responsibleUserCondition}
        OR JSON_CONTAINS(COALESCE(${projectAlias}.participating_departments, JSON_ARRAY()), JSON_QUOTE(?), '$')
        OR EXISTS (
          SELECT 1
          FROM project_stage_documents visible_department_documents
          INNER JOIN users visible_department_users
            ON visible_department_users.id = visible_department_documents.responsible_user_id
          WHERE visible_department_documents.project_id = ${projectAlias}.id
            AND visible_department_users.department = ?
        )
      )`,
      params: [user.id, user.id, user.department, user.department]
    };
  }

  if (isEmployeeUser(user)) {
    return {
      sql: `(${projectManagerCondition} OR ${responsibleUserCondition})`,
      params: [user.id, user.id]
    };
  }

  return {
    sql: '1 = 0',
    params: []
  };
}

export function buildProjectVisibilityWhereClause(user, projectAlias = 'p') {
  const visibility = buildProjectVisibilityCondition(user, projectAlias);
  return {
    whereClause: `WHERE ${visibility.sql}`,
    params: visibility.params
  };
}

export async function canViewProject(connection, user, projectId) {
  const visibility = buildProjectVisibilityCondition(user, 'p');
  const [rows] = await connection.execute(
    `SELECT p.id
    FROM projects p
    WHERE p.id = ?
      AND ${visibility.sql}
    LIMIT 1`,
    [projectId, ...visibility.params]
  );

  return rows.length > 0;
}
