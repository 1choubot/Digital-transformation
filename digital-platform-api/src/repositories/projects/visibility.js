import {
  isCenterManagerUser,
  isEmployeeUser,
  isGeneralManagerAssistantUser,
  isGeneralManagerUser,
  isSystemAdminUser
} from '../../domain/organization.js';

function isGlobalBusinessViewer(user) {
  return isGeneralManagerUser(user) || isGeneralManagerAssistantUser(user) || isCenterManagerUser(user);
}

export function buildProjectVisibilityCondition(user, projectAlias = 'p') {
  if (isSystemAdminUser(user)) {
    return {
      sql: '1 = 0',
      params: []
    };
  }

  if (isGlobalBusinessViewer(user)) {
    return {
      sql: '1 = 1',
      params: []
    };
  }

  if (!isEmployeeUser(user)) {
    return {
      sql: '1 = 0',
      params: []
    };
  }

  const projectCreatorCondition = `${projectAlias}.created_by_user_id = ?`;
  const projectManagerCondition = `${projectAlias}.project_manager_user_id = ?`;
  const businessResponsibleCondition = `${projectAlias}.business_responsible_user_id = ?`;
  const technicalResponsibleCondition = `${projectAlias}.technical_responsible_user_id = ?`;
  const solutionDesignRoleCondition = `EXISTS (
    SELECT 1
    FROM project_solution_design_roles visible_solution_design_roles
    WHERE visible_solution_design_roles.project_id = ${projectAlias}.id
      AND ? IN (
        visible_solution_design_roles.technical_owner_user_id,
        visible_solution_design_roles.business_owner_user_id,
        visible_solution_design_roles.procurement_owner_user_id,
        visible_solution_design_roles.finance_accountant_user_id,
        visible_solution_design_roles.finance_owner_user_id
      )
  )`;
  const detailedDesignRoleCondition = `EXISTS (
    SELECT 1
    FROM project_detailed_design_roles visible_detailed_design_roles
    WHERE visible_detailed_design_roles.project_id = ${projectAlias}.id
      AND ? IN (
        visible_detailed_design_roles.project_manager_user_id,
        visible_detailed_design_roles.business_owner_user_id,
        visible_detailed_design_roles.technical_owner_user_id,
        visible_detailed_design_roles.procurement_owner_user_id,
        visible_detailed_design_roles.finance_accountant_user_id,
        visible_detailed_design_roles.drawing_review_owner_user_id
      )
  )`;
  const detailedDesignProfessionalGroupCondition = `EXISTS (
    SELECT 1
    FROM project_detailed_design_professional_group_members visible_detailed_design_group_members
    WHERE visible_detailed_design_group_members.project_id = ${projectAlias}.id
      AND visible_detailed_design_group_members.is_active = 1
      AND visible_detailed_design_group_members.user_id = ?
  )`;
  const responsibleUserCondition = `EXISTS (
    SELECT 1
    FROM project_stage_documents visible_user_documents
    WHERE visible_user_documents.project_id = ${projectAlias}.id
      AND visible_user_documents.responsible_user_id = ?
  )`;

  return {
    sql: `(${projectCreatorCondition} OR ${projectManagerCondition} OR ${businessResponsibleCondition} OR ${technicalResponsibleCondition} OR ${solutionDesignRoleCondition} OR ${detailedDesignRoleCondition} OR ${detailedDesignProfessionalGroupCondition} OR ${responsibleUserCondition})`,
    params: [user.id, user.id, user.id, user.id, user.id, user.id, user.id, user.id]
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
