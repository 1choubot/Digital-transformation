-- Store explicit source and execution state for each completed-work daily report row.
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_items'
    AND COLUMN_NAME = 'source_type'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE daily_report_items ADD COLUMN source_type ENUM(''weekly_plan'', ''ad_hoc'', ''legacy_unknown'') NOT NULL DEFAULT ''legacy_unknown'' COMMENT ''任务来源：周计划/临时新增/历史未知'' AFTER project_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_items'
    AND COLUMN_NAME = 'source_plan_task_key'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE daily_report_items ADD COLUMN source_plan_task_key CHAR(36) NULL COMMENT ''关联周计划 task_key，临时新增为空'' AFTER source_type',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_items'
    AND COLUMN_NAME = 'execution_status'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE daily_report_items ADD COLUMN execution_status ENUM(''completed'', ''in_progress'', ''not_completed'') NULL COMMENT ''实际执行状态'' AFTER source_plan_task_key',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_items'
    AND INDEX_NAME = 'idx_daily_report_items_source_task'
);

SET @ddl := IF(
  @index_exists = 0,
  'ALTER TABLE daily_report_items ADD INDEX idx_daily_report_items_source_task (source_plan_task_key, daily_report_id)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_items'
    AND INDEX_NAME = 'idx_daily_report_items_execution_status'
);

SET @ddl := IF(
  @index_exists = 0,
  'ALTER TABLE daily_report_items ADD INDEX idx_daily_report_items_execution_status (execution_status)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
