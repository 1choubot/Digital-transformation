-- M1: Backfill the organization-role column expected by the report permission model.
SET @has_organization_role = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'organization_role'
);
SET @add_organization_role = IF(
  @has_organization_role = 0,
  'ALTER TABLE users ADD COLUMN organization_role VARCHAR(64) NOT NULL DEFAULT ''employee'' AFTER department',
  'SELECT 1'
);
PREPARE stmt FROM @add_organization_role;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- M1: Add an optional job title used by weekly report exports.
SET @has_job_title = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'job_title'
);
SET @add_job_title = IF(
  @has_job_title = 0,
  'ALTER TABLE users ADD COLUMN job_title VARCHAR(100) NULL DEFAULT NULL COMMENT ''岗位名称'' AFTER role',
  'SELECT 1'
);
PREPARE stmt FROM @add_job_title;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
