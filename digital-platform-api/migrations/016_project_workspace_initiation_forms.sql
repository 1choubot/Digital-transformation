SET @has_customer_contact = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'customer_contact'
);
SET @add_customer_contact = IF(
  @has_customer_contact = 0,
  'ALTER TABLE projects ADD COLUMN customer_contact VARCHAR(255) NULL AFTER customer_name',
  'SELECT 1'
);
PREPARE stmt FROM @add_customer_contact;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @project_manager_nullable = (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'project_manager'
  LIMIT 1
);
SET @modify_project_manager = IF(
  @project_manager_nullable = 'NO',
  'ALTER TABLE projects MODIFY project_manager VARCHAR(128) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @modify_project_manager;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @project_mode_nullable = (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'project_mode'
  LIMIT 1
);
SET @modify_project_mode = IF(
  @project_mode_nullable = 'NO',
  'ALTER TABLE projects MODIFY project_mode VARCHAR(32) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @modify_project_mode;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS project_stage_document_forms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  stage_document_id BIGINT UNSIGNED NOT NULL,
  form_key VARCHAR(64) NOT NULL,
  form_schema_json JSON NOT NULL,
  form_data_json JSON NULL,
  status ENUM('draft', 'submitted') NOT NULL DEFAULT 'draft',
  draft_saved_by_user_id BIGINT UNSIGNED NULL,
  draft_saved_at DATETIME NULL,
  submitted_by_user_id BIGINT UNSIGNED NULL,
  submitted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_stage_document_forms_document (stage_document_id),
  KEY idx_project_stage_document_forms_project (project_id),
  KEY idx_project_stage_document_forms_status (status),
  KEY idx_project_stage_document_forms_saved_by (draft_saved_by_user_id),
  KEY idx_project_stage_document_forms_submitted_by (submitted_by_user_id),
  CONSTRAINT fk_project_stage_document_forms_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_stage_document_forms_document
    FOREIGN KEY (stage_document_id) REFERENCES project_stage_documents (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_stage_document_forms_saved_by
    FOREIGN KEY (draft_saved_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_project_stage_document_forms_submitted_by
    FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
