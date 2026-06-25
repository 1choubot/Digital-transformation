SET @has_template_owner_department = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stage_document_templates'
    AND COLUMN_NAME = 'owner_department'
);
SET @add_template_owner_department = IF(
  @has_template_owner_department = 0,
  'ALTER TABLE stage_document_templates ADD COLUMN owner_department VARCHAR(64) NULL AFTER confirm_role',
  'SELECT 1'
);
PREPARE stmt FROM @add_template_owner_department;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_template_review_department = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stage_document_templates'
    AND COLUMN_NAME = 'review_department'
);
SET @add_template_review_department = IF(
  @has_template_review_department = 0,
  'ALTER TABLE stage_document_templates ADD COLUMN review_department VARCHAR(64) NULL AFTER owner_department',
  'SELECT 1'
);
PREPARE stmt FROM @add_template_review_department;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_project_owner_department = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'owner_department'
);
SET @add_project_owner_department = IF(
  @has_project_owner_department = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN owner_department VARCHAR(64) NULL AFTER confirm_role',
  'SELECT 1'
);
PREPARE stmt FROM @add_project_owner_department;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_project_review_department = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stage_documents'
    AND COLUMN_NAME = 'review_department'
);
SET @add_project_review_department = IF(
  @has_project_review_department = 0,
  'ALTER TABLE project_stage_documents ADD COLUMN review_department VARCHAR(64) NULL AFTER owner_department',
  'SELECT 1'
);
PREPARE stmt FROM @add_project_review_department;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
