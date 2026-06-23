SET @has_is_applicable = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'is_applicable'
);
SET @add_is_applicable = IF(
  @has_is_applicable = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN is_applicable TINYINT(1) NOT NULL DEFAULT 1 AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @add_is_applicable;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_not_applicable_by_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'not_applicable_by_user_id'
);
SET @add_not_applicable_by_user_id = IF(
  @has_not_applicable_by_user_id = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN not_applicable_by_user_id BIGINT UNSIGNED NULL AFTER return_reason',
  'SELECT 1'
);
PREPARE stmt FROM @add_not_applicable_by_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_not_applicable_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'not_applicable_at'
);
SET @add_not_applicable_at = IF(
  @has_not_applicable_at = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN not_applicable_at DATETIME NULL AFTER not_applicable_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_not_applicable_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_not_applicable_reason = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'not_applicable_reason'
);
SET @add_not_applicable_reason = IF(
  @has_not_applicable_reason = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN not_applicable_reason VARCHAR(1000) NULL AFTER not_applicable_at',
  'SELECT 1'
);
PREPARE stmt FROM @add_not_applicable_reason;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_restored_applicable_by_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'restored_applicable_by_user_id'
);
SET @add_restored_applicable_by_user_id = IF(
  @has_restored_applicable_by_user_id = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN restored_applicable_by_user_id BIGINT UNSIGNED NULL AFTER not_applicable_reason',
  'SELECT 1'
);
PREPARE stmt FROM @add_restored_applicable_by_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_restored_applicable_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'restored_applicable_at'
);
SET @add_restored_applicable_at = IF(
  @has_restored_applicable_at = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN restored_applicable_at DATETIME NULL AFTER restored_applicable_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_restored_applicable_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
