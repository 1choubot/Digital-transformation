SET @has_revision_required = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'revision_required'
);
SET @add_revision_required = IF(
  @has_revision_required = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN revision_required TINYINT(1) NOT NULL DEFAULT 0 AFTER return_reason',
  'SELECT 1'
);
PREPARE stmt FROM @add_revision_required;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_revision_reason = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'revision_reason'
);
SET @add_revision_reason = IF(
  @has_revision_reason = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN revision_reason VARCHAR(1000) NULL AFTER revision_required',
  'SELECT 1'
);
PREPARE stmt FROM @add_revision_reason;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_revision_source_document_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'revision_source_document_id'
);
SET @add_revision_source_document_id = IF(
  @has_revision_source_document_id = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN revision_source_document_id BIGINT UNSIGNED NULL AFTER revision_reason',
  'SELECT 1'
);
PREPARE stmt FROM @add_revision_source_document_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_revision_requested_by_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'revision_requested_by_user_id'
);
SET @add_revision_requested_by_user_id = IF(
  @has_revision_requested_by_user_id = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN revision_requested_by_user_id BIGINT UNSIGNED NULL AFTER revision_source_document_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_revision_requested_by_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_revision_requested_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'revision_requested_at'
);
SET @add_revision_requested_at = IF(
  @has_revision_requested_at = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN revision_requested_at DATETIME NULL AFTER revision_requested_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_revision_requested_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_revision_completed_by_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'revision_completed_by_user_id'
);
SET @has_revision_resubmitted_by_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'revision_resubmitted_by_user_id'
);
SET @add_revision_resubmitted_by_user_id = IF(
  @has_revision_resubmitted_by_user_id = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN revision_resubmitted_by_user_id BIGINT UNSIGNED NULL AFTER revision_requested_at',
  'SELECT 1'
);
PREPARE stmt FROM @add_revision_resubmitted_by_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_revision_resubmitted_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'revision_resubmitted_at'
);
SET @add_revision_resubmitted_at = IF(
  @has_revision_resubmitted_at = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN revision_resubmitted_at DATETIME NULL AFTER revision_resubmitted_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_revision_resubmitted_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_revision_completed_by_user_id = IF(
  @has_revision_completed_by_user_id = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN revision_completed_by_user_id BIGINT UNSIGNED NULL AFTER revision_resubmitted_at',
  'SELECT 1'
);
PREPARE stmt FROM @add_revision_completed_by_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_revision_completed_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'revision_completed_at'
);
SET @add_revision_completed_at = IF(
  @has_revision_completed_at = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN revision_completed_at DATETIME NULL AFTER revision_completed_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_revision_completed_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE project_stage_documents
SET revision_required = 0
WHERE revision_required IS NULL;
