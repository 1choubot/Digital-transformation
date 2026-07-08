-- Daily/weekly reporting core schema, recreated after current main migration 016.
-- This file intentionally does not import sample data or reuse legacy branch migration numbers.

CREATE TABLE IF NOT EXISTS daily_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  report_date DATE NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  status ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  submitted_by_user_id BIGINT UNSIGNED NULL,
  submitted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_reports_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_daily_reports_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_daily_reports_submitted_by
    FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_reports_user_date_project (user_id, report_date, project_id),
  KEY idx_daily_reports_date_status_user (report_date, status, user_id),
  KEY idx_daily_reports_project_date_status (project_id, report_date, status),
  KEY idx_daily_reports_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_report_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL COMMENT '关联项目ID',
  source_type ENUM('weekly_plan','ad_hoc','legacy_unknown') NOT NULL DEFAULT 'legacy_unknown' COMMENT '任务来源',
  source_plan_task_key CHAR(36) NULL COMMENT '关联周计划 task_key',
  execution_status ENUM('completed','in_progress','not_completed') NULL COMMENT '实际执行状态',
  work_content TEXT NOT NULL,
  completion_progress VARCHAR(100) NOT NULL,
  completed_at TIME NULL,
  responsible_person VARCHAR(128) NULL,
  deviation_and_corrective_action TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_report_items_report
    FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_daily_report_items_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_report_items_order (daily_report_id, sort_order),
  KEY idx_daily_report_items_project (project_id),
  KEY idx_daily_report_items_source_task (source_plan_task_key, daily_report_id),
  KEY idx_daily_report_items_execution_status (execution_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_report_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL COMMENT '关联项目ID',
  planned_work_content TEXT NULL,
  responsible_person VARCHAR(128) NULL,
  planned_complete_at TIME NULL,
  collaborating_center VARCHAR(128) NULL,
  collaboration_item TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_report_plans_report
    FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_daily_report_plans_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_report_plans_order (daily_report_id, sort_order),
  KEY idx_daily_report_plans_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_report_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_report_id BIGINT UNSIGNED NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_report_attachments_report
    FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_daily_report_attachments_uploader
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_report_attachments_storage_key (storage_key),
  KEY idx_daily_report_attachments_report (daily_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weekly_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  submitted_by_user_id BIGINT UNSIGNED NULL,
  submitted_at DATETIME NULL,
  approval_status ENUM('not_submitted','pending','approved','returned') NOT NULL DEFAULT 'not_submitted' COMMENT '周报审批状态',
  approval_comment TEXT NULL COMMENT '审批意见或打回原因',
  approval_reviewed_by_user_id BIGINT UNSIGNED NULL COMMENT '审批人用户ID',
  approval_reviewed_at DATETIME NULL COMMENT '审批时间',
  ai_score JSON NULL COMMENT '预留评分缓存，本轮不启用 AI 入口',
  ai_evaluated_at DATETIME NULL,
  ai_evaluation_source ENUM('ai','fallback_rule') NULL,
  ai_evaluation_error VARCHAR(1000) NULL,
  final_score DECIMAL(5,2) NULL COMMENT '预留人工最终评分，本轮不启用复杂评分入口',
  final_grade VARCHAR(20) NULL,
  final_comment TEXT NULL,
  final_reviewed_by_user_id BIGINT UNSIGNED NULL,
  final_reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_reports_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_weekly_reports_submitted_by
    FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_weekly_reports_approval_reviewer
    FOREIGN KEY (approval_reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_weekly_reports_final_reviewer
    FOREIGN KEY (final_reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE KEY uk_weekly_reports_user_week (user_id, week_start, week_end),
  KEY idx_weekly_reports_week_status_user (week_start, status, user_id),
  KEY idx_weekly_reports_submitted_at (submitted_at),
  KEY idx_weekly_reports_approval_status (approval_status, week_start),
  KEY idx_weekly_reports_approval_reviewer (approval_reviewed_by_user_id),
  KEY idx_weekly_reports_final_reviewer (final_reviewed_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weekly_report_summaries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  weekly_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL COMMENT '关联项目ID',
  source_type ENUM('weekly_plan','ad_hoc','legacy_unknown') NOT NULL DEFAULT 'legacy_unknown' COMMENT '总结来源',
  source_plan_task_key CHAR(36) NULL COMMENT '来源周计划 task_key',
  work_task VARCHAR(500) NOT NULL,
  work_target TEXT NOT NULL,
  planned_date DATE NOT NULL,
  completion_status ENUM('completed','in_progress','not_completed','added') NOT NULL,
  completion_description VARCHAR(500) NOT NULL,
  completed_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_report_summaries_report
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_weekly_report_summaries_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  UNIQUE KEY uk_weekly_report_summaries_order (weekly_report_id, sort_order),
  KEY idx_weekly_report_summaries_project_planned (project_id, planned_date),
  KEY idx_weekly_report_summaries_source_task (source_plan_task_key, weekly_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weekly_report_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_key CHAR(36) NOT NULL COMMENT '计划任务稳定标识，UUID',
  weekly_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL COMMENT '关联项目ID',
  work_task VARCHAR(500) NOT NULL,
  work_target TEXT NOT NULL,
  planned_date DATE NOT NULL,
  responsible_person VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_report_plans_report
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_weekly_report_plans_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  UNIQUE KEY uk_weekly_report_plans_order (weekly_report_id, sort_order),
  UNIQUE KEY uk_weekly_report_plans_task_key (task_key),
  KEY idx_weekly_report_plans_project_planned (project_id, planned_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weekly_report_approval_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  weekly_report_id BIGINT UNSIGNED NOT NULL,
  action ENUM('submit','approve','return','resubmit') NOT NULL,
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

CREATE TABLE IF NOT EXISTS center_daily_report_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department VARCHAR(128) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  generate_time TIME NOT NULL DEFAULT '18:00:00',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_center_daily_report_schedules_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  UNIQUE KEY uk_center_daily_report_schedules_department (department),
  KEY idx_center_daily_report_schedules_enabled_time (is_enabled, generate_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_weekly_rest_mode_anchors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  week_start DATE NOT NULL,
  rest_mode ENUM('single_rest','double_rest') NOT NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_report_weekly_rest_mode_anchors_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_report_weekly_rest_mode_anchors_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE KEY uk_report_weekly_rest_mode_anchors_week_start (week_start),
  KEY idx_report_weekly_rest_mode_anchors_lookup (week_start, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
