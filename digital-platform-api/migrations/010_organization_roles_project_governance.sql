SET @has_user_organization_role = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'organization_role'
);
SET @add_user_organization_role = IF(
  @has_user_organization_role = 0,
  'ALTER TABLE users ADD COLUMN organization_role VARCHAR(64) NOT NULL DEFAULT ''employee'' AFTER department',
  'SELECT 1'
);
PREPARE stmt FROM @add_user_organization_role;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE users MODIFY COLUMN department VARCHAR(128) NULL;

UPDATE users
SET organization_role = 'system_admin',
  department = NULL,
  is_platform_admin = 1,
  role = CASE WHEN role = 'system_admin' THEN '系统管理员' ELSE role END
WHERE is_platform_admin = 1;

UPDATE users
SET department = CASE department
  WHEN '运营中心' THEN 'operations_center'
  WHEN '营销中心' THEN 'marketing_center'
  WHEN '制造中心' THEN 'manufacturing_center'
  WHEN '研发中心' THEN 'rd_center'
  ELSE department
END
WHERE organization_role IN ('center_manager', 'employee');

SET @has_project_mode = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'project_mode'
);
SET @add_project_mode = IF(
  @has_project_mode = 0,
  'ALTER TABLE projects ADD COLUMN project_mode VARCHAR(32) NOT NULL DEFAULT ''self_developed'' AFTER customer_name',
  'SELECT 1'
);
PREPARE stmt FROM @add_project_mode;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_project_manager_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'project_manager_user_id'
);
SET @add_project_manager_user_id = IF(
  @has_project_manager_user_id = 0,
  'ALTER TABLE projects ADD COLUMN project_manager_user_id BIGINT UNSIGNED NULL AFTER project_manager',
  'SELECT 1'
);
PREPARE stmt FROM @add_project_manager_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_projects_manager_user_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND INDEX_NAME = 'idx_projects_project_manager_user_id'
);
SET @add_projects_manager_user_index = IF(
  @has_projects_manager_user_index = 0,
  'ALTER TABLE projects ADD KEY idx_projects_project_manager_user_id (project_manager_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_projects_manager_user_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_projects_manager_user_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND CONSTRAINT_NAME = 'fk_projects_project_manager_user'
);
SET @add_projects_manager_user_fk = IF(
  @has_projects_manager_user_fk = 0,
  'ALTER TABLE projects ADD CONSTRAINT fk_projects_project_manager_user FOREIGN KEY (project_manager_user_id) REFERENCES users (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @add_projects_manager_user_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
