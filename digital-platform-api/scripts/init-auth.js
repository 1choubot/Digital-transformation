import { env } from '../src/config/env.js';
import { pool, closePool } from '../src/db/pool.js';
import { hashPassword } from '../src/domain/auth.js';
import { ORGANIZATION_ROLE } from '../src/domain/organization.js';
import { upsertInitialUser } from '../src/repositories/userRepository.js';

// Check whether a column exists before applying compatibility DDL.
async function hasColumn(tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return Number(rows[0].count) > 0;
}

// Check whether an index exists before applying compatibility DDL.
async function hasIndex(tableName, indexName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?`,
    [tableName, indexName]
  );

  return Number(rows[0].count) > 0;
}

// Check whether a constraint exists before applying compatibility DDL.
async function hasConstraint(tableName, constraintName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?`,
    [tableName, constraintName]
  );

  return Number(rows[0].count) > 0;
}

// Keep bootstrapping compatible with fresh databases and already-migrated databases.
async function ensureSchema() {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      account VARCHAR(64) NOT NULL,
      display_name VARCHAR(128) NOT NULL,
      department VARCHAR(128) NULL,
      organization_role VARCHAR(64) NOT NULL DEFAULT 'employee',
      role VARCHAR(64) NOT NULL,
      job_title VARCHAR(100) NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      is_platform_admin TINYINT(1) NOT NULL DEFAULT 0,
      file_platform_user_id VARCHAR(128) NULL,
      password_hash VARCHAR(255) NOT NULL,
      password_updated_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_users_account (account)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  if (!(await hasColumn('users', 'is_platform_admin'))) {
    await pool.execute('ALTER TABLE users ADD COLUMN is_platform_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER is_enabled');
  }

  if (!(await hasColumn('users', 'organization_role'))) {
    await pool.execute(
      "ALTER TABLE users ADD COLUMN organization_role VARCHAR(64) NOT NULL DEFAULT 'employee' AFTER department"
    );
  }

  await pool.execute('ALTER TABLE users MODIFY COLUMN department VARCHAR(128) NULL');

  if (!(await hasColumn('users', 'job_title'))) {
    await pool.execute("ALTER TABLE users ADD COLUMN job_title VARCHAR(100) NULL DEFAULT NULL COMMENT '岗位名称' AFTER role");
  }

  await pool.execute(
    `CREATE TABLE IF NOT EXISTS auth_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_auth_sessions_token_hash (token_hash),
      KEY idx_auth_sessions_user_id (user_id),
      KEY idx_auth_sessions_expires_at (expires_at),
      CONSTRAINT fk_auth_sessions_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  if (!(await hasColumn('projects', 'created_by_user_id'))) {
    await pool.execute('ALTER TABLE projects ADD COLUMN created_by_user_id BIGINT UNSIGNED NULL AFTER remark');
  }

  if (!(await hasIndex('projects', 'idx_projects_created_by_user_id'))) {
    await pool.execute('ALTER TABLE projects ADD KEY idx_projects_created_by_user_id (created_by_user_id)');
  }

  if (!(await hasConstraint('projects', 'fk_projects_created_by_user'))) {
    await pool.execute(
      `ALTER TABLE projects
      ADD CONSTRAINT fk_projects_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL`
    );
  }
}

// Seed or update the initial system administrator.
async function seedInitialUser() {
  const initialUser = env.auth.initialUser;

  await upsertInitialUser({
    ...initialUser,
    department: null,
    organizationRole: ORGANIZATION_ROLE.SYSTEM_ADMIN,
    role: initialUser.role || '系统管理员',
    jobTitle: initialUser.jobTitle || null,
    isEnabled: true,
    isPlatformAdmin: true,
    passwordHash: hashPassword(initialUser.password)
  });

  const [adminRows] = await pool.execute(
    `SELECT COUNT(*) AS count
    FROM users
    WHERE is_enabled = 1
      AND organization_role = ?
      AND is_platform_admin = 1`,
    [ORGANIZATION_ROLE.SYSTEM_ADMIN]
  );
  if (Number(adminRows[0].count) <= 0) {
    throw new Error('Initial auth setup must leave at least one enabled system admin with platform admin permission');
  }

  console.log(`Initial user ready: ${initialUser.account}`);
}

try {
  await ensureSchema();
  await seedInitialUser();
} finally {
  await closePool();
}
