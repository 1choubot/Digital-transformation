-- Persist source metadata for weekly summaries generated from daily report evidence.
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_summaries'
    AND COLUMN_NAME = 'source_type'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE weekly_report_summaries ADD COLUMN source_type ENUM(''weekly_plan'', ''ad_hoc'', ''legacy_unknown'') NOT NULL DEFAULT ''legacy_unknown'' COMMENT ''总结来源：周计划/临时新增/历史未知'' AFTER project_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_summaries'
    AND COLUMN_NAME = 'source_plan_task_key'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE weekly_report_summaries ADD COLUMN source_plan_task_key CHAR(36) NULL COMMENT ''来源周计划 task_key，临时新增为空'' AFTER source_type',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_summaries'
    AND INDEX_NAME = 'idx_weekly_report_summaries_source_task'
);

SET @ddl := IF(
  @index_exists = 0,
  'ALTER TABLE weekly_report_summaries ADD INDEX idx_weekly_report_summaries_source_task (source_plan_task_key, weekly_report_id)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Weekly summaries for in-progress and not-completed tasks do not have an actual completed date.
SET @completed_date_nullable := (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_summaries'
    AND COLUMN_NAME = 'completed_date'
);

SET @ddl := IF(
  @completed_date_nullable = 'NO',
  'ALTER TABLE weekly_report_summaries MODIFY COLUMN completed_date DATE NULL',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
