-- M6: 为周报/日报明细行补齐项目 ID，支撑日报按项目精确带入周报计划。

SET @has_weekly_summary_project_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_summaries'
    AND COLUMN_NAME = 'project_id'
);
SET @add_weekly_summary_project_id = IF(
  @has_weekly_summary_project_id = 0,
  'ALTER TABLE weekly_report_summaries ADD COLUMN project_id BIGINT UNSIGNED NULL COMMENT ''关联项目ID'' AFTER sort_order',
  'SELECT 1'
);
PREPARE stmt FROM @add_weekly_summary_project_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_weekly_plan_project_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_plans'
    AND COLUMN_NAME = 'project_id'
);
SET @add_weekly_plan_project_id = IF(
  @has_weekly_plan_project_id = 0,
  'ALTER TABLE weekly_report_plans ADD COLUMN project_id BIGINT UNSIGNED NULL COMMENT ''关联项目ID'' AFTER sort_order',
  'SELECT 1'
);
PREPARE stmt FROM @add_weekly_plan_project_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_daily_item_project_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_items'
    AND COLUMN_NAME = 'project_id'
);
SET @add_daily_item_project_id = IF(
  @has_daily_item_project_id = 0,
  'ALTER TABLE daily_report_items ADD COLUMN project_id BIGINT UNSIGNED NULL COMMENT ''关联项目ID'' AFTER sort_order',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_item_project_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_daily_plan_project_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_plans'
    AND COLUMN_NAME = 'project_id'
);
SET @add_daily_plan_project_id = IF(
  @has_daily_plan_project_id = 0,
  'ALTER TABLE daily_report_plans ADD COLUMN project_id BIGINT UNSIGNED NULL COMMENT ''关联项目ID'' AFTER sort_order',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_plan_project_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE daily_report_items dri
INNER JOIN daily_reports dr ON dr.id = dri.daily_report_id
SET dri.project_id = dr.project_id
WHERE dri.project_id IS NULL;

UPDATE daily_report_plans drp
INNER JOIN daily_reports dr ON dr.id = drp.daily_report_id
SET drp.project_id = dr.project_id
WHERE drp.project_id IS NULL;

CREATE TEMPORARY TABLE tmp_unique_project_task_label AS
SELECT
  MIN(id) AS project_id,
  task_label
FROM (
  SELECT id, project_code AS task_label FROM projects WHERE project_code IS NOT NULL AND project_code <> ''
  UNION ALL
  SELECT id, project_name AS task_label FROM projects WHERE project_name IS NOT NULL AND project_name <> ''
  UNION ALL
  SELECT id, CONCAT(project_code, ' / ', project_name) AS task_label FROM projects WHERE project_code IS NOT NULL AND project_name IS NOT NULL
) labels
GROUP BY task_label
HAVING COUNT(DISTINCT id) = 1;

UPDATE weekly_report_summaries wrs
INNER JOIN tmp_unique_project_task_label labels ON labels.task_label = wrs.work_task
SET wrs.project_id = labels.project_id
WHERE wrs.project_id IS NULL;

UPDATE weekly_report_plans wrp
INNER JOIN tmp_unique_project_task_label labels ON labels.task_label = wrp.work_task
SET wrp.project_id = labels.project_id
WHERE wrp.project_id IS NULL;

DROP TEMPORARY TABLE tmp_unique_project_task_label;

SET @has_weekly_summary_project_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_summaries'
    AND INDEX_NAME = 'idx_weekly_report_summaries_project_planned'
);
SET @add_weekly_summary_project_index = IF(
  @has_weekly_summary_project_index = 0,
  'ALTER TABLE weekly_report_summaries ADD INDEX idx_weekly_report_summaries_project_planned (project_id, planned_date)',
  'SELECT 1'
);
PREPARE stmt FROM @add_weekly_summary_project_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_weekly_plan_project_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_plans'
    AND INDEX_NAME = 'idx_weekly_report_plans_project_planned'
);
SET @add_weekly_plan_project_index = IF(
  @has_weekly_plan_project_index = 0,
  'ALTER TABLE weekly_report_plans ADD INDEX idx_weekly_report_plans_project_planned (project_id, planned_date)',
  'SELECT 1'
);
PREPARE stmt FROM @add_weekly_plan_project_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_daily_item_project_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_items'
    AND INDEX_NAME = 'idx_daily_report_items_project'
);
SET @add_daily_item_project_index = IF(
  @has_daily_item_project_index = 0,
  'ALTER TABLE daily_report_items ADD INDEX idx_daily_report_items_project (project_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_item_project_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_daily_plan_project_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_plans'
    AND INDEX_NAME = 'idx_daily_report_plans_project'
);
SET @add_daily_plan_project_index = IF(
  @has_daily_plan_project_index = 0,
  'ALTER TABLE daily_report_plans ADD INDEX idx_daily_report_plans_project (project_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_plan_project_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_weekly_summary_project_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_summaries'
    AND CONSTRAINT_NAME = 'fk_weekly_report_summaries_project'
);
SET @add_weekly_summary_project_fk = IF(
  @has_weekly_summary_project_fk = 0,
  'ALTER TABLE weekly_report_summaries ADD CONSTRAINT fk_weekly_report_summaries_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @add_weekly_summary_project_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_weekly_plan_project_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'weekly_report_plans'
    AND CONSTRAINT_NAME = 'fk_weekly_report_plans_project'
);
SET @add_weekly_plan_project_fk = IF(
  @has_weekly_plan_project_fk = 0,
  'ALTER TABLE weekly_report_plans ADD CONSTRAINT fk_weekly_report_plans_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @add_weekly_plan_project_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_daily_item_project_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_items'
    AND CONSTRAINT_NAME = 'fk_daily_report_items_project'
);
SET @add_daily_item_project_fk = IF(
  @has_daily_item_project_fk = 0,
  'ALTER TABLE daily_report_items ADD CONSTRAINT fk_daily_report_items_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_item_project_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_daily_plan_project_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'daily_report_plans'
    AND CONSTRAINT_NAME = 'fk_daily_report_plans_project'
);
SET @add_daily_plan_project_fk = IF(
  @has_daily_plan_project_fk = 0,
  'ALTER TABLE daily_report_plans ADD CONSTRAINT fk_daily_report_plans_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @add_daily_plan_project_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
