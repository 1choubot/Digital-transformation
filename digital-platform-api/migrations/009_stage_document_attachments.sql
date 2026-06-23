CREATE TABLE IF NOT EXISTS project_stage_document_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  stage_document_id BIGINT UNSIGNED NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255) NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_by_user_id BIGINT UNSIGNED NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stage_document_attachments_storage_key (storage_key),
  KEY idx_stage_document_attachments_project (project_id),
  KEY idx_stage_document_attachments_document_deleted_sort (
    stage_document_id,
    deleted_at,
    uploaded_at DESC,
    id DESC
  ),
  KEY idx_stage_document_attachments_uploaded_by (uploaded_by_user_id),
  KEY idx_stage_document_attachments_deleted_by (deleted_by_user_id),
  CONSTRAINT fk_stage_document_attachments_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_stage_document_attachments_stage_document
    FOREIGN KEY (stage_document_id) REFERENCES project_stage_documents (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_stage_document_attachments_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_stage_document_attachments_deleted_by
    FOREIGN KEY (deleted_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
