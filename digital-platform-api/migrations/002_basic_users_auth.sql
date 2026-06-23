CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account VARCHAR(64) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  department VARCHAR(128) NOT NULL,
  role VARCHAR(64) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  file_platform_user_id VARCHAR(128) NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_updated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_account (account)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_created_by_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'created_by_user_id'
);
SET @add_created_by_user_id = IF(
  @has_created_by_user_id = 0,
  'ALTER TABLE projects ADD COLUMN created_by_user_id BIGINT UNSIGNED NULL AFTER remark',
  'SELECT 1'
);
PREPARE stmt FROM @add_created_by_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_projects_creator_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND INDEX_NAME = 'idx_projects_created_by_user_id'
);
SET @add_projects_creator_index = IF(
  @has_projects_creator_index = 0,
  'ALTER TABLE projects ADD KEY idx_projects_created_by_user_id (created_by_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_projects_creator_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_projects_creator_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND CONSTRAINT_NAME = 'fk_projects_created_by_user'
);
SET @add_projects_creator_fk = IF(
  @has_projects_creator_fk = 0,
  'ALTER TABLE projects ADD CONSTRAINT fk_projects_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @add_projects_creator_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
