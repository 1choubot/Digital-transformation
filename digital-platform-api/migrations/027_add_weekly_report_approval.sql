-- Add an independent approval workflow for weekly reports without changing draft/submitted.

SET @has_approval_status = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND COLUMN_NAME = 'approval_status'
);
SET @add_approval_status = IF(
  @has_approval_status = 0,
  'ALTER TABLE weekly_reports ADD COLUMN approval_status ENUM(''not_submitted'', ''pending'', ''approved'', ''returned'') NOT NULL DEFAULT ''not_submitted'' COMMENT ''周报审批状态'' AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @add_approval_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_approval_comment = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND COLUMN_NAME = 'approval_comment'
);
SET @add_approval_comment = IF(
  @has_approval_comment = 0,
  'ALTER TABLE weekly_reports ADD COLUMN approval_comment TEXT NULL COMMENT ''审批意见或打回原因'' AFTER approval_status',
  'SELECT 1'
);
PREPARE stmt FROM @add_approval_comment;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_approval_reviewed_by = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND COLUMN_NAME = 'approval_reviewed_by_user_id'
);
SET @add_approval_reviewed_by = IF(
  @has_approval_reviewed_by = 0,
  'ALTER TABLE weekly_reports ADD COLUMN approval_reviewed_by_user_id BIGINT UNSIGNED NULL COMMENT ''审批人用户ID'' AFTER approval_comment',
  'SELECT 1'
);
PREPARE stmt FROM @add_approval_reviewed_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_approval_reviewed_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND COLUMN_NAME = 'approval_reviewed_at'
);
SET @add_approval_reviewed_at = IF(
  @has_approval_reviewed_at = 0,
  'ALTER TABLE weekly_reports ADD COLUMN approval_reviewed_at DATETIME NULL COMMENT ''审批时间'' AFTER approval_reviewed_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_approval_reviewed_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_approval_reviewer_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND INDEX_NAME = 'idx_weekly_reports_approval_reviewer'
);
SET @add_approval_reviewer_index = IF(
  @has_approval_reviewer_index = 0,
  'ALTER TABLE weekly_reports ADD INDEX idx_weekly_reports_approval_reviewer (approval_reviewed_by_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_approval_reviewer_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_approval_status_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND INDEX_NAME = 'idx_weekly_reports_approval_status'
);
SET @add_approval_status_index = IF(
  @has_approval_status_index = 0,
  'ALTER TABLE weekly_reports ADD INDEX idx_weekly_reports_approval_status (approval_status, week_start)',
  'SELECT 1'
);
PREPARE stmt FROM @add_approval_status_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_approval_reviewer_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND CONSTRAINT_NAME = 'fk_weekly_reports_approval_reviewer'
);
SET @add_approval_reviewer_fk = IF(
  @has_approval_reviewer_fk = 0,
  'ALTER TABLE weekly_reports ADD CONSTRAINT fk_weekly_reports_approval_reviewer FOREIGN KEY (approval_reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @add_approval_reviewer_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS weekly_report_approval_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  weekly_report_id BIGINT UNSIGNED NOT NULL,
  action ENUM('submit', 'approve', 'return', 'resubmit') NOT NULL,
  from_approval_status VARCHAR(32) NOT NULL,
  to_approval_status VARCHAR(32) NOT NULL,
  comment TEXT NULL,
  operator_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_report_approval_history_report
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_weekly_report_approval_history_operator
    FOREIGN KEY (operator_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  KEY idx_weekly_report_approval_history_report (weekly_report_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE weekly_reports
SET approval_status = CASE
    WHEN status = 'submitted' AND approval_status = 'not_submitted' THEN 'pending'
    ELSE approval_status
  END
WHERE approval_status = 'not_submitted';
