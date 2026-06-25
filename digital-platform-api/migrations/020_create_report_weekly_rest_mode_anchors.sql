-- M1: Store manual weekly rest-mode anchors for alternating workday rules.
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
