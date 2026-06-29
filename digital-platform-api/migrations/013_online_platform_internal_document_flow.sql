ALTER TABLE projects MODIFY project_code VARCHAR(64) NULL;

UPDATE projects
SET project_code = NULL
WHERE TRIM(project_code) = '';

SET @has_template_completion_mode = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stage_document_templates'
    AND COLUMN_NAME = 'completion_mode'
);
SET @add_template_completion_mode = IF(
  @has_template_completion_mode = 0,
  'ALTER TABLE stage_document_templates ADD COLUMN completion_mode ENUM(''submit_only'', ''approval_required'', ''conditional_submit'', ''conditional_approval'') NOT NULL DEFAULT ''approval_required'' AFTER review_department',
  'SELECT 1'
);
PREPARE stmt FROM @add_template_completion_mode;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_project_completion_mode = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'completion_mode'
);
SET @add_project_completion_mode = IF(
  @has_project_completion_mode = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN completion_mode ENUM(''submit_only'', ''approval_required'', ''conditional_submit'', ''conditional_approval'') NOT NULL DEFAULT ''approval_required'' AFTER review_department',
  'SELECT 1'
);
PREPARE stmt FROM @add_project_completion_mode;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
