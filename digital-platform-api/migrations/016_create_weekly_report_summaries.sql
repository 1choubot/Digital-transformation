-- M1: Store weekly work summary rows.
CREATE TABLE IF NOT EXISTS weekly_report_summaries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  weekly_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  work_task VARCHAR(500) NOT NULL,
  work_target TEXT NOT NULL,
  planned_date DATE NOT NULL,
  completion_status ENUM('completed','in_progress','not_completed','added') NOT NULL,
  completion_description VARCHAR(500) NOT NULL,
  completed_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_report_summaries_report
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  UNIQUE KEY uk_weekly_report_summaries_order (weekly_report_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
