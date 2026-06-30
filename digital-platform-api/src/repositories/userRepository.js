import { pool } from '../db/pool.js';
import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE,
  canBeResponsibleUser,
  isDepartmentOrganizationRole,
  isGlobalOrganizationRole,
  isValidBusinessDepartment,
  isValidOrganizationRole
} from '../domain/organization.js';

export function mapSafeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    account: row.account,
    name: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled),
    isPlatformAdmin: Boolean(row.is_platform_admin),
    filePlatformUserId: row.file_platform_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapUserWithPassword(row) {
  if (!row) {
    return null;
  }

  return {
    ...mapSafeUser(row),
    passwordHash: row.password_hash
  };
}

export function mapCreator(row) {
  if (!row || row.created_by_user_id === null || row.created_by_user_id === undefined) {
    return null;
  }

  return {
    id: row.created_by_user_id,
    account: row.creator_account,
    name: row.creator_display_name,
    department: row.creator_department,
    organizationRole: row.creator_organization_role,
    role: row.creator_role,
    isEnabled: row.creator_is_enabled === null ? null : Boolean(row.creator_is_enabled),
    filePlatformUserId: row.creator_file_platform_user_id
  };
}

function mapResponsibilityCandidate(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    account: row.account,
    name: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled),
    filePlatformUserId: row.file_platform_user_id
  };
}

export async function findUserByAccount(account) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE account = ? LIMIT 1', [account]);
  return mapUserWithPassword(rows[0]);
}

export async function findSafeUserById(userId) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  return mapSafeUser(rows[0]);
}

export async function listResponsibilityCandidateUsers() {
  const [rows] = await pool.execute(
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
    WHERE is_enabled = 1
      AND organization_role IN (?, ?)
      AND department IN (?, ?, ?, ?)
    ORDER BY display_name ASC, account ASC, id ASC`,
    [
      ORGANIZATION_ROLE.CENTER_MANAGER,
      ORGANIZATION_ROLE.EMPLOYEE,
      BUSINESS_DEPARTMENT.OPERATIONS_CENTER,
      BUSINESS_DEPARTMENT.MARKETING_CENTER,
      BUSINESS_DEPARTMENT.MANUFACTURING_CENTER,
      BUSINESS_DEPARTMENT.RD_CENTER
    ]
  );

  return rows.map(mapResponsibilityCandidate).filter(canBeResponsibleUser);
}

export async function upsertInitialUser(user) {
  assertValidUserOrganizationState(user);
  await pool.execute(
    `INSERT INTO users (
      account,
      display_name,
      department,
      organization_role,
      role,
      is_enabled,
      is_platform_admin,
      file_platform_user_id,
      password_hash,
      password_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      display_name = VALUES(display_name),
      department = VALUES(department),
      organization_role = VALUES(organization_role),
      role = VALUES(role),
      is_enabled = VALUES(is_enabled),
      is_platform_admin = VALUES(is_platform_admin),
      file_platform_user_id = VALUES(file_platform_user_id),
      password_hash = VALUES(password_hash),
      password_updated_at = NOW()`,
    [
      user.account,
      user.displayName,
      user.department,
      user.organizationRole,
      user.role,
      user.isEnabled ? 1 : 0,
      user.isPlatformAdmin ? 1 : 0,
      user.filePlatformUserId || null,
      user.passwordHash
    ]
  );
}

export class UserManagementError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'UserManagementError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const USER_MANAGEMENT_ERROR = {
  NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_EXISTS: 'USER_ACCOUNT_EXISTS',
  REQUIRED_FIELDS: 'USER_REQUIRED_FIELDS',
  FORBIDDEN_FIELD: 'USER_FORBIDDEN_FIELD',
  PASSWORD_REQUIRED: 'USER_PASSWORD_REQUIRED',
  INVALID_ORGANIZATION_ROLE: 'INVALID_ORGANIZATION_ROLE',
  INVALID_DEPARTMENT: 'INVALID_DEPARTMENT',
  SYSTEM_ADMIN_PLATFORM_ADMIN_REQUIRED: 'SYSTEM_ADMIN_PLATFORM_ADMIN_REQUIRED',
  PLATFORM_ADMIN_ROLE_REQUIRED: 'PLATFORM_ADMIN_ROLE_REQUIRED',
  LAST_ENABLED_SYSTEM_ADMIN_REQUIRED: 'LAST_ENABLED_SYSTEM_ADMIN_REQUIRED'
};

const SAFE_USER_COLUMNS = `
  id,
  account,
  display_name,
  department,
  organization_role,
  role,
  is_enabled,
  is_platform_admin,
  file_platform_user_id,
  created_at,
  updated_at
`;

export async function listManagedUsers() {
  const [rows] = await pool.execute(
    `SELECT ${SAFE_USER_COLUMNS}
    FROM users
    ORDER BY id ASC`
  );

  return rows.map(mapSafeUser);
}

export async function getManagedUserById(userId, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT ${SAFE_USER_COLUMNS}
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [userId]
  );

  return mapSafeUser(rows[0]);
}

function isSameUserId(left, right) {
  return String(left) === String(right);
}

function assertValidUserOrganizationState(user) {
  if (!isValidOrganizationRole(user.organizationRole)) {
    throw new UserManagementError(
      USER_MANAGEMENT_ERROR.INVALID_ORGANIZATION_ROLE,
      'Invalid organization role',
      400,
      ['organizationRole']
    );
  }

  if (isGlobalOrganizationRole(user.organizationRole) && user.department !== null) {
    throw new UserManagementError(
      USER_MANAGEMENT_ERROR.INVALID_DEPARTMENT,
      'Invalid department',
      400,
      ['department']
    );
  }

  if (isDepartmentOrganizationRole(user.organizationRole) && !isValidBusinessDepartment(user.department)) {
    throw new UserManagementError(
      USER_MANAGEMENT_ERROR.INVALID_DEPARTMENT,
      'Invalid department',
      400,
      ['department']
    );
  }

  if (user.organizationRole === ORGANIZATION_ROLE.SYSTEM_ADMIN && !user.isPlatformAdmin) {
    throw new UserManagementError(
      USER_MANAGEMENT_ERROR.SYSTEM_ADMIN_PLATFORM_ADMIN_REQUIRED,
      'System admin must be platform admin',
      400,
      ['organizationRole', 'isPlatformAdmin']
    );
  }

  if (user.isPlatformAdmin && user.organizationRole !== ORGANIZATION_ROLE.SYSTEM_ADMIN) {
    throw new UserManagementError(
      USER_MANAGEMENT_ERROR.PLATFORM_ADMIN_ROLE_REQUIRED,
      'Platform admin must use system admin organization role',
      400,
      ['organizationRole', 'isPlatformAdmin']
    );
  }
}

async function lockSystemAdminInvariantRows(connection, userId) {
  const [rows] = await connection.execute(
    `SELECT *
    FROM users
    WHERE is_platform_admin = 1
      OR organization_role = ?
      OR id = ?
    ORDER BY id
    FOR UPDATE`,
    [ORGANIZATION_ROLE.SYSTEM_ADMIN, userId]
  );

  return rows;
}

function assertKeepsEnabledSystemAdmin(lockedRows, nextUserState) {
  const existing = lockedRows.find((row) => isSameUserId(row.id, nextUserState.id));

  if (!existing) {
    throw new UserManagementError(USER_MANAGEMENT_ERROR.NOT_FOUND, 'User not found', 404);
  }

  const nextCount = lockedRows.reduce((count, row) => {
    const isTarget = isSameUserId(row.id, nextUserState.id);
    const isEnabled = isTarget ? nextUserState.isEnabled : Boolean(row.is_enabled);
    const isPlatformAdmin = isTarget ? nextUserState.isPlatformAdmin : Boolean(row.is_platform_admin);
    const organizationRole = isTarget ? nextUserState.organizationRole : row.organization_role;
    return count + (isEnabled && isPlatformAdmin && organizationRole === ORGANIZATION_ROLE.SYSTEM_ADMIN ? 1 : 0);
  }, 0);

  if (nextCount <= 0) {
    throw new UserManagementError(
      USER_MANAGEMENT_ERROR.LAST_ENABLED_SYSTEM_ADMIN_REQUIRED,
      'At least one enabled system admin with platform admin permission is required',
      409
    );
  }

  return existing;
}

export async function createManagedUser(user) {
  assertValidUserOrganizationState(user);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute('SELECT id FROM users WHERE account = ? LIMIT 1', [user.account]);
    if (existingRows.length > 0) {
      throw new UserManagementError(USER_MANAGEMENT_ERROR.ACCOUNT_EXISTS, 'User account already exists', 409);
    }

    const [result] = await connection.execute(
      `INSERT INTO users (
        account,
        display_name,
        department,
        organization_role,
        role,
        is_enabled,
        is_platform_admin,
        file_platform_user_id,
        password_hash,
        password_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        user.account,
        user.displayName,
        user.department,
        user.organizationRole,
        user.role,
        user.isEnabled ? 1 : 0,
        user.isPlatformAdmin ? 1 : 0,
        user.filePlatformUserId || null,
        user.passwordHash
      ]
    );

    const created = await getManagedUserById(result.insertId, connection);
    await connection.commit();
    return created;
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new UserManagementError(USER_MANAGEMENT_ERROR.ACCOUNT_EXISTS, 'User account already exists', 409);
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateManagedUser(userId, patch) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const lockedRows = await lockSystemAdminInvariantRows(connection, userId);
    const targetRow = lockedRows.find((row) => isSameUserId(row.id, userId));
    if (!targetRow) {
      throw new UserManagementError(USER_MANAGEMENT_ERROR.NOT_FOUND, 'User not found', 404);
    }
    const nextState = {
      id: userId,
      organizationRole:
        patch.organizationRole === undefined ? targetRow?.organization_role : patch.organizationRole,
      department: patch.department === undefined ? targetRow?.department ?? null : patch.department,
      isEnabled: patch.isEnabled === undefined ? Boolean(targetRow?.is_enabled) : Boolean(patch.isEnabled),
      isPlatformAdmin:
        patch.isPlatformAdmin === undefined ? Boolean(targetRow?.is_platform_admin) : Boolean(patch.isPlatformAdmin)
    };

    assertValidUserOrganizationState(nextState);
    const existing = assertKeepsEnabledSystemAdmin(lockedRows, nextState);

    await connection.execute(
      `UPDATE users
      SET display_name = ?,
        department = ?,
        organization_role = ?,
        role = ?,
        is_enabled = ?,
        is_platform_admin = ?,
        file_platform_user_id = ?
      WHERE id = ?`,
      [
        patch.displayName === undefined ? existing.display_name : patch.displayName,
        nextState.department,
        nextState.organizationRole,
        patch.role === undefined ? existing.role : patch.role,
        nextState.isEnabled ? 1 : 0,
        nextState.isPlatformAdmin ? 1 : 0,
        patch.filePlatformUserId === undefined ? existing.file_platform_user_id : patch.filePlatformUserId || null,
        userId
      ]
    );

    const updated = await getManagedUserById(userId, connection);
    await connection.commit();
    return updated;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setManagedUserEnabled(userId, isEnabled) {
  return updateManagedUser(userId, { isEnabled });
}

export async function resetManagedUserPassword(userId, passwordHash) {
  const [result] = await pool.execute(
    `UPDATE users
    SET password_hash = ?,
      password_updated_at = NOW()
    WHERE id = ?`,
    [passwordHash, userId]
  );

  if (result.affectedRows === 0) {
    throw new UserManagementError(USER_MANAGEMENT_ERROR.NOT_FOUND, 'User not found', 404);
  }

  return getManagedUserById(userId);
}
