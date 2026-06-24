-- M1: Store completed work rows for a daily report.
CREATE TABLE IF NOT EXISTS daily_report_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  work_content TEXT NOT NULL,
  completion_progress VARCHAR(100) NOT NULL,
  completed_at TIME NOT NULL,
  responsible_person VARCHAR(128) NULL,
  deviation_and_corrective_action TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_report_items_report
    FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_report_items_order (daily_report_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
