SET @has_responsible_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'responsible_user_id'
);
SET @add_responsible_user_id = IF(
  @has_responsible_user_id = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN responsible_user_id BIGINT UNSIGNED NULL AFTER is_applicable',
  'SELECT 1'
);
PREPARE stmt FROM @add_responsible_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_responsibility_updated_by_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'responsibility_updated_by_user_id'
);
SET @add_responsibility_updated_by_user_id = IF(
  @has_responsibility_updated_by_user_id = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN responsibility_updated_by_user_id BIGINT UNSIGNED NULL AFTER responsible_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_responsibility_updated_by_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_responsibility_updated_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'responsibility_updated_at'
);
SET @add_responsibility_updated_at = IF(
  @has_responsibility_updated_at = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN responsibility_updated_at DATETIME NULL AFTER responsibility_updated_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_responsibility_updated_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
