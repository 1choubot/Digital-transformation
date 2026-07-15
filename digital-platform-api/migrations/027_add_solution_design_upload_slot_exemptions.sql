-- Add solution design output upload exemption metadata.
-- This migration records per-slot C07-C14 "no upload required" state on the
-- existing solution design upload slot table. It does not add stage document
-- items, change template counts, or alter the 8-stage / 71-document model.

SET @has_upload_exempted = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_upload_slots'
    AND COLUMN_NAME = 'is_upload_exempted'
);
SET @add_upload_exempted = IF(
  @has_upload_exempted = 0,
  'ALTER TABLE project_solution_design_upload_slots ADD COLUMN is_upload_exempted TINYINT(1) NOT NULL DEFAULT 0 AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @add_upload_exempted;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_exemption_reason = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_upload_slots'
    AND COLUMN_NAME = 'exemption_reason'
);
SET @add_exemption_reason = IF(
  @has_exemption_reason = 0,
  'ALTER TABLE project_solution_design_upload_slots ADD COLUMN exemption_reason VARCHAR(1000) NULL AFTER is_upload_exempted',
  'SELECT 1'
);
PREPARE stmt FROM @add_exemption_reason;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_exempted_by = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_upload_slots'
    AND COLUMN_NAME = 'exempted_by_user_id'
);
SET @add_exempted_by = IF(
  @has_exempted_by = 0,
  'ALTER TABLE project_solution_design_upload_slots ADD COLUMN exempted_by_user_id BIGINT UNSIGNED NULL AFTER exemption_reason',
  'SELECT 1'
);
PREPARE stmt FROM @add_exempted_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_exempted_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_upload_slots'
    AND COLUMN_NAME = 'exempted_at'
);
SET @add_exempted_at = IF(
  @has_exempted_at = 0,
  'ALTER TABLE project_solution_design_upload_slots ADD COLUMN exempted_at DATETIME NULL AFTER exempted_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_exempted_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_exempted_by_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_upload_slots'
    AND INDEX_NAME = 'idx_solution_design_upload_slots_exempted_by'
);
SET @add_exempted_by_index = IF(
  @has_exempted_by_index = 0,
  'ALTER TABLE project_solution_design_upload_slots ADD KEY idx_solution_design_upload_slots_exempted_by (exempted_by_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_exempted_by_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_exempted_by_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_solution_design_upload_slots'
    AND CONSTRAINT_NAME = 'fk_solution_design_upload_slots_exempted_by'
);
SET @add_exempted_by_fk = IF(
  @has_exempted_by_fk = 0,
  'ALTER TABLE project_solution_design_upload_slots ADD CONSTRAINT fk_solution_design_upload_slots_exempted_by FOREIGN KEY (exempted_by_user_id) REFERENCES users (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @add_exempted_by_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
