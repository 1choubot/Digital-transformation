-- M1: Store next-day work plan rows for a daily report.
CREATE TABLE IF NOT EXISTS daily_report_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  planned_work_content TEXT NULL,
  responsible_person VARCHAR(128) NULL,
  planned_complete_at TIME NULL,
  collaborating_center VARCHAR(128) NULL,
  collaboration_item TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_report_plans_report
    FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_report_plans_order (daily_report_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
