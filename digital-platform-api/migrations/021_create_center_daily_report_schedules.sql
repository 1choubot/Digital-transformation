-- M1: Store per-center automatic daily report schedule settings.
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
