-- M1: Store image attachment metadata for daily reports.
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
