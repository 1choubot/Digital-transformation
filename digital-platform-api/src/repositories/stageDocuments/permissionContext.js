import {
  isCenterManagerUser,
  isValidBusinessDepartment
} from '../../domain/organization.js';

export async function selectProjectPermissionContext(connection, projectId, user) {
  if (isCenterManagerUser(user) && isValidBusinessDepartment(user.department)) {
    const [rows] = await connection.execute(
      `SELECT
        p.id,
        p.project_manager_user_id,
        p.business_responsible_user_id,
        p.technical_responsible_user_id,
        p.created_by_user_id,
        p.participating_departments,
        p.status,
        p.ended_reason,
        p.ended_by_user_id,
        p.ended_at,
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
      LIMIT 1`,
      [user.department, user.department, user.department, projectId]
    );

    return rows[0] || null;
  }

  const [rows] = await connection.execute(
    `SELECT
      id,
      project_manager_user_id,
      business_responsible_user_id,
      technical_responsible_user_id,
      created_by_user_id,
      participating_departments,
      status,
      ended_reason,
      ended_by_user_id,
      ended_at,
      0 AS has_department_responsible
    FROM projects
    WHERE id = ?
    LIMIT 1`,
    [projectId]
  );

  return rows[0] || null;
}

export async function selectResponsibleUserPermissionContext(connection, userId) {
  if (userId === null || userId === undefined) {
    return null;
  }

  const [rows] = await connection.execute(
    `SELECT
      id,
      display_name,
      department,
      organization_role,
      role,
      is_enabled
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [userId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled)
  };
}
