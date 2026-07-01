-- Add stable business identifiers for weekly plan rows that survive delete-and-recreate updates.
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_plans'
    AND COLUMN_NAME = 'task_key'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE weekly_report_plans ADD COLUMN task_key CHAR(36) NULL COMMENT ''计划任务稳定标识，UUID'' AFTER id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Existing rows need generated task keys before the column can be treated as required by the app.
UPDATE weekly_report_plans
SET task_key = UUID()
WHERE task_key IS NULL OR task_key = '';

SET @nullable := (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_plans'
    AND COLUMN_NAME = 'task_key'
);

SET @ddl := IF(
  @nullable = 'YES',
  'ALTER TABLE weekly_report_plans MODIFY COLUMN task_key CHAR(36) NOT NULL COMMENT ''计划任务稳定标识，UUID''',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_plans'
    AND INDEX_NAME = 'uk_weekly_report_plans_task_key'
);

SET @ddl := IF(
  @index_exists = 0,
  'ALTER TABLE weekly_report_plans ADD UNIQUE KEY uk_weekly_report_plans_task_key (task_key)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
