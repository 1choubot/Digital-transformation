-- M1: Store one weekly report per user and natural week range.
CREATE TABLE IF NOT EXISTS weekly_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  ai_score JSON NULL COMMENT 'AI或规则评分结果缓存',
  ai_evaluated_at DATETIME NULL,
  ai_evaluation_source ENUM('ai','fallback_rule') NULL,
  ai_evaluation_error VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_reports_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE KEY uk_weekly_reports_user_week (user_id, week_start, week_end),
  KEY idx_weekly_reports_week_status_user (week_start, status, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
