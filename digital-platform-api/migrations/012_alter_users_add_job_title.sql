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
