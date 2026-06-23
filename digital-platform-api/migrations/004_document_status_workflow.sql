SET @has_returned_by_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'returned_by_user_id'
);
SET @add_returned_by_user_id = IF(
  @has_returned_by_user_id = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN returned_by_user_id BIGINT UNSIGNED NULL AFTER confirmed_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_returned_by_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_return_reason = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'return_reason'
);
SET @add_return_reason = IF(
  @has_return_reason = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN return_reason VARCHAR(1000) NULL AFTER returned_at',
  'SELECT 1'
);
PREPARE stmt FROM @add_return_reason;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
