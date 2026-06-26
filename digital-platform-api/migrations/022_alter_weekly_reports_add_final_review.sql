-- M5-R1: Store the evaluator's final manual review separately from AI/reference scoring.
-- Keep this migration idempotent because some environments may have partially added these columns manually.

SET @has_final_score = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND COLUMN_NAME = 'final_score'
);
SET @add_final_score = IF(
  @has_final_score = 0,
  'ALTER TABLE weekly_reports ADD COLUMN final_score DECIMAL(5,2) NULL COMMENT ''考核人最终评分，以人工填写为准'' AFTER ai_evaluation_error',
  'SELECT 1'
);
PREPARE stmt FROM @add_final_score;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_final_grade = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND COLUMN_NAME = 'final_grade'
);
SET @add_final_grade = IF(
  @has_final_grade = 0,
  'ALTER TABLE weekly_reports ADD COLUMN final_grade VARCHAR(20) NULL COMMENT ''按最终评分或人工口径确认的等级'' AFTER final_score',
  'SELECT 1'
);
PREPARE stmt FROM @add_final_grade;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_final_comment = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND COLUMN_NAME = 'final_comment'
);
SET @add_final_comment = IF(
  @has_final_comment = 0,
  'ALTER TABLE weekly_reports ADD COLUMN final_comment TEXT NULL COMMENT ''考核人最终评语'' AFTER final_grade',
  'SELECT 1'
);
PREPARE stmt FROM @add_final_comment;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_final_reviewed_by_user_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND COLUMN_NAME = 'final_reviewed_by_user_id'
);
SET @add_final_reviewed_by_user_id = IF(
  @has_final_reviewed_by_user_id = 0,
  'ALTER TABLE weekly_reports ADD COLUMN final_reviewed_by_user_id BIGINT UNSIGNED NULL COMMENT ''最终评分人用户ID'' AFTER final_comment',
  'SELECT 1'
);
PREPARE stmt FROM @add_final_reviewed_by_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_final_reviewed_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND COLUMN_NAME = 'final_reviewed_at'
);
SET @add_final_reviewed_at = IF(
  @has_final_reviewed_at = 0,
  'ALTER TABLE weekly_reports ADD COLUMN final_reviewed_at DATETIME NULL COMMENT ''最终评分确认时间'' AFTER final_reviewed_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_final_reviewed_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_final_reviewer_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND INDEX_NAME = 'idx_weekly_reports_final_reviewer'
);
SET @add_final_reviewer_index = IF(
  @has_final_reviewer_index = 0,
  'ALTER TABLE weekly_reports ADD INDEX idx_weekly_reports_final_reviewer (final_reviewed_by_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_final_reviewer_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_final_reviewer_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_reports'
    AND CONSTRAINT_NAME = 'fk_weekly_reports_final_reviewer'
);
SET @add_final_reviewer_fk = IF(
  @has_final_reviewer_fk = 0,
  'ALTER TABLE weekly_reports ADD CONSTRAINT fk_weekly_reports_final_reviewer FOREIGN KEY (final_reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @add_final_reviewer_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
