CREATE TABLE IF NOT EXISTS project_solution_design_quotation_forms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  node_key ENUM('quotation_or_tender') NOT NULL DEFAULT 'quotation_or_tender',
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  form_status ENUM('draft', 'submitted') NOT NULL DEFAULT 'draft',
  form_data_json JSON NOT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 1,
  submitted_by_user_id BIGINT UNSIGNED NULL,
  submitted_at DATETIME NULL,
  generated_file_status ENUM('not_started', 'generating', 'generated', 'failed') NOT NULL DEFAULT 'not_started',
  generated_file_storage_key VARCHAR(500) NULL,
  generated_file_name VARCHAR(255) NULL,
  generated_file_mime_type VARCHAR(255) NULL,
  generated_file_size BIGINT UNSIGNED NULL,
  generated_file_template_name VARCHAR(255) NULL,
  generated_at DATETIME NULL,
  generated_by_user_id BIGINT UNSIGNED NULL,
  generation_error_message VARCHAR(1000) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_solution_design_quotation_forms_project_revision (project_id, revision),
  KEY idx_solution_design_quotation_forms_current (project_id, is_current),
  KEY idx_solution_design_quotation_forms_project_status (project_id, form_status, generated_file_status),
  KEY idx_solution_design_quotation_forms_submitted_by (submitted_by_user_id),
  KEY idx_solution_design_quotation_forms_generated_by (generated_by_user_id),
  KEY idx_solution_design_quotation_forms_created_by (created_by_user_id),
  KEY idx_solution_design_quotation_forms_updated_by (updated_by_user_id),
  CONSTRAINT fk_solution_design_quotation_forms_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_solution_design_quotation_forms_submitted_by
    FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_solution_design_quotation_forms_generated_by
    FOREIGN KEY (generated_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_solution_design_quotation_forms_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_solution_design_quotation_forms_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
