-- Backfill submission metadata columns for databases where daily_reports existed
-- before migration 017 added submitted_by_user_id/submitted_at.

SET @has_daily_report_submitted_by = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_reports'
    AND COLUMN_NAME = 'submitted_by_user_id'
);

SET @add_daily_report_submitted_by = IF(
  @has_daily_report_submitted_by = 0,
  'ALTER TABLE daily_reports ADD COLUMN submitted_by_user_id BIGINT UNSIGNED NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_report_submitted_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_daily_report_submitted_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_reports'
    AND COLUMN_NAME = 'submitted_at'
);

SET @add_daily_report_submitted_at = IF(
  @has_daily_report_submitted_at = 0,
  'ALTER TABLE daily_reports ADD COLUMN submitted_at DATETIME NULL AFTER submitted_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_report_submitted_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_daily_report_submitted_by_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_reports'
    AND CONSTRAINT_NAME = 'fk_daily_reports_submitted_by'
);

SET @add_daily_report_submitted_by_fk = IF(
  @has_daily_report_submitted_by_fk = 0,
  'ALTER TABLE daily_reports ADD CONSTRAINT fk_daily_reports_submitted_by FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_report_submitted_by_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_daily_report_submitted_at_idx = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_reports'
    AND INDEX_NAME = 'idx_daily_reports_submitted_at'
);

SET @add_daily_report_submitted_at_idx = IF(
  @has_daily_report_submitted_at_idx = 0,
  'ALTER TABLE daily_reports ADD KEY idx_daily_reports_submitted_at (submitted_at)',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_report_submitted_at_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE daily_reports
SET submitted_by_user_id = user_id,
  submitted_at = COALESCE(submitted_at, updated_at, created_at)
WHERE status = 'submitted'
  AND submitted_by_user_id IS NULL;
