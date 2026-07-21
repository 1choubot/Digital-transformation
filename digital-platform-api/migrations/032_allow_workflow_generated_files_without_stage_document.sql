-- Allow workflow generated files that are not bound to the 71-item stage document checklist.
-- Contract kickoff notice generation uses project_stage_document_generated_files with
-- stage_document_id = NULL and document_code = contract_kickoff_notice.

SET @has_generated_files_table = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_document_generated_files'
);

SET @has_stage_document_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_document_generated_files'
    AND CONSTRAINT_NAME = 'fk_stage_document_generated_files_stage_document'
);
SET @drop_stage_document_fk = IF(
  @has_generated_files_table > 0 AND @has_stage_document_fk > 0,
  'ALTER TABLE project_stage_document_generated_files DROP FOREIGN KEY fk_stage_document_generated_files_stage_document',
  'SELECT 1'
);
PREPARE stmt FROM @drop_stage_document_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @modify_stage_document_nullable = IF(
  @has_generated_files_table > 0,
  'ALTER TABLE project_stage_document_generated_files MODIFY COLUMN stage_document_id BIGINT UNSIGNED NULL',
  'SELECT 1'
);
PREPARE stmt FROM @modify_stage_document_nullable;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_stage_document_fk_after = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_document_generated_files'
    AND CONSTRAINT_NAME = 'fk_stage_document_generated_files_stage_document'
);
SET @add_stage_document_fk = IF(
  @has_generated_files_table > 0 AND @has_stage_document_fk_after = 0,
  'ALTER TABLE project_stage_document_generated_files ADD CONSTRAINT fk_stage_document_generated_files_stage_document FOREIGN KEY (stage_document_id) REFERENCES project_stage_documents (id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @add_stage_document_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
