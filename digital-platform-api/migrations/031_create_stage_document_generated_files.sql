CREATE TABLE IF NOT EXISTS project_stage_document_generated_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  stage_document_id BIGINT UNSIGNED NOT NULL,
  online_form_id BIGINT UNSIGNED NULL,
  document_code VARCHAR(32) NOT NULL,
  template_key VARCHAR(128) NOT NULL,
  file_type ENUM('xlsx', 'docx') NOT NULL,
  version INT UNSIGNED NOT NULL,
  status ENUM('pending', 'generating', 'generated', 'failed', 'superseded') NOT NULL DEFAULT 'pending',
  file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(512) NULL,
  mime_type VARCHAR(255) NULL,
  file_size BIGINT UNSIGNED NULL,
  generated_by_user_id BIGINT UNSIGNED NULL,
  generated_at DATETIME NULL,
  failure_reason VARCHAR(1000) NULL,
  source_form_submitted_at DATETIME NULL,
  source_form_data_hash VARCHAR(64) NULL,
  source_snapshot_json JSON NULL,
  trigger_event VARCHAR(128) NOT NULL,
  review_snapshot_json JSON NULL,
  template_version VARCHAR(128) NULL,
  template_hash VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stage_document_generated_files_project_document (
    project_id,
    stage_document_id,
    status,
    version
  ),
  KEY idx_stage_document_generated_files_document_code (document_code),
  KEY idx_stage_document_generated_files_template (template_key, status),
  KEY idx_stage_document_generated_files_generated_by (generated_by_user_id),
  CONSTRAINT fk_stage_document_generated_files_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_stage_document_generated_files_stage_document
    FOREIGN KEY (stage_document_id) REFERENCES project_stage_documents (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_stage_document_generated_files_generated_by
    FOREIGN KEY (generated_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
