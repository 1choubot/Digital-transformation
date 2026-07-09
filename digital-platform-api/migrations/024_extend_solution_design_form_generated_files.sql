-- Extend solution design online-form generated file metadata.
-- This migration only records template name and generated-by user for the dedicated
-- solution design analysis/review online forms. It does not add stage document items,
-- connect the file platform, generate PDF, or change the 8-stage / 71-document model.

SET @has_analysis_template_name = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_analysis_forms'
    AND COLUMN_NAME = 'generated_file_template_name'
);
SET @add_analysis_template_name = IF(
  @has_analysis_template_name = 0,
  'ALTER TABLE project_solution_design_analysis_forms ADD COLUMN generated_file_template_name VARCHAR(255) NULL AFTER generated_file_size',
  'SELECT 1'
);
PREPARE stmt FROM @add_analysis_template_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_analysis_generated_by = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_analysis_forms'
    AND COLUMN_NAME = 'generated_by_user_id'
);
SET @add_analysis_generated_by = IF(
  @has_analysis_generated_by = 0,
  'ALTER TABLE project_solution_design_analysis_forms ADD COLUMN generated_by_user_id BIGINT UNSIGNED NULL AFTER generated_at',
  'SELECT 1'
);
PREPARE stmt FROM @add_analysis_generated_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_review_template_name = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_review_forms'
    AND COLUMN_NAME = 'generated_file_template_name'
);
SET @add_review_template_name = IF(
  @has_review_template_name = 0,
  'ALTER TABLE project_solution_design_review_forms ADD COLUMN generated_file_template_name VARCHAR(255) NULL AFTER generated_file_size',
  'SELECT 1'
);
PREPARE stmt FROM @add_review_template_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_review_generated_by = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_review_forms'
    AND COLUMN_NAME = 'generated_by_user_id'
);
SET @add_review_generated_by = IF(
  @has_review_generated_by = 0,
  'ALTER TABLE project_solution_design_review_forms ADD COLUMN generated_by_user_id BIGINT UNSIGNED NULL AFTER generated_at',
  'SELECT 1'
);
PREPARE stmt FROM @add_review_generated_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_analysis_generated_by_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_analysis_forms'
    AND INDEX_NAME = 'idx_solution_design_analysis_forms_generated_by'
);
SET @add_analysis_generated_by_index = IF(
  @has_analysis_generated_by_index = 0,
  'ALTER TABLE project_solution_design_analysis_forms ADD KEY idx_solution_design_analysis_forms_generated_by (generated_by_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_analysis_generated_by_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_review_generated_by_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_review_forms'
    AND INDEX_NAME = 'idx_solution_design_review_forms_generated_by'
);
SET @add_review_generated_by_index = IF(
  @has_review_generated_by_index = 0,
  'ALTER TABLE project_solution_design_review_forms ADD KEY idx_solution_design_review_forms_generated_by (generated_by_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_review_generated_by_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_analysis_generated_by_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_analysis_forms'
    AND CONSTRAINT_NAME = 'fk_solution_design_analysis_forms_generated_by'
);
SET @add_analysis_generated_by_fk = IF(
  @has_analysis_generated_by_fk = 0,
  'ALTER TABLE project_solution_design_analysis_forms ADD CONSTRAINT fk_solution_design_analysis_forms_generated_by FOREIGN KEY (generated_by_user_id) REFERENCES users (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @add_analysis_generated_by_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_review_generated_by_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_review_forms'
    AND CONSTRAINT_NAME = 'fk_solution_design_review_forms_generated_by'
);
SET @add_review_generated_by_fk = IF(
  @has_review_generated_by_fk = 0,
  'ALTER TABLE project_solution_design_review_forms ADD CONSTRAINT fk_solution_design_review_forms_generated_by FOREIGN KEY (generated_by_user_id) REFERENCES users (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @add_review_generated_by_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
