export async function ensureStageDocumentSchema(executor) {
  await executor.execute(
    `CREATE TABLE IF NOT EXISTS stage_document_templates (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      template_version VARCHAR(32) NOT NULL,
      stage_order TINYINT UNSIGNED NOT NULL,
      stage_key VARCHAR(64) NOT NULL,
      stage_name VARCHAR(64) NOT NULL,
      document_code VARCHAR(32) NOT NULL,
      document_order SMALLINT UNSIGNED NOT NULL,
      document_name VARCHAR(255) NOT NULL,
      is_required TINYINT(1) NOT NULL DEFAULT 1,
      default_responsibility_role VARCHAR(255) NOT NULL,
      confirm_role VARCHAR(255) NOT NULL,
      submit_mode ENUM('online_form', 'file_upload', 'mixed', 'tbd') NOT NULL,
      target_folder_path VARCHAR(512) NOT NULL,
      target_folder_id VARCHAR(128) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_stage_document_templates_version_code (template_version, document_code),
      KEY idx_stage_document_templates_stage (template_version, stage_order, document_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_stage_documents (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      template_id BIGINT UNSIGNED NULL,
      template_version VARCHAR(32) NOT NULL,
      stage_order TINYINT UNSIGNED NOT NULL,
      stage_key VARCHAR(64) NOT NULL,
      stage_name VARCHAR(64) NOT NULL,
      document_code VARCHAR(32) NOT NULL,
      document_order SMALLINT UNSIGNED NOT NULL,
      document_name VARCHAR(255) NOT NULL,
      is_required TINYINT(1) NOT NULL DEFAULT 1,
      default_responsibility_role VARCHAR(255) NOT NULL,
      confirm_role VARCHAR(255) NOT NULL,
      submit_mode ENUM('online_form', 'file_upload', 'mixed', 'tbd') NOT NULL,
      target_folder_path VARCHAR(512) NOT NULL,
      target_folder_id VARCHAR(128) NULL,
      status ENUM('not_submitted', 'submitted', 'confirmed', 'returned') NOT NULL DEFAULT 'not_submitted',
      is_applicable TINYINT(1) NOT NULL DEFAULT 1,
      responsible_user_id BIGINT UNSIGNED NULL,
      responsibility_updated_by_user_id BIGINT UNSIGNED NULL,
      responsibility_updated_at DATETIME NULL,
      form_record_id VARCHAR(128) NULL,
      file_record_id VARCHAR(128) NULL,
      submitted_by_user_id BIGINT UNSIGNED NULL,
      confirmed_by_user_id BIGINT UNSIGNED NULL,
      returned_by_user_id BIGINT UNSIGNED NULL,
      submitted_at DATETIME NULL,
      confirmed_at DATETIME NULL,
      returned_at DATETIME NULL,
      return_reason VARCHAR(1000) NULL,
      not_applicable_by_user_id BIGINT UNSIGNED NULL,
      not_applicable_at DATETIME NULL,
      not_applicable_reason VARCHAR(1000) NULL,
      restored_applicable_by_user_id BIGINT UNSIGNED NULL,
      restored_applicable_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_project_stage_documents_project_doc (project_id, stage_key, document_code),
      KEY idx_project_stage_documents_project_stage (project_id, stage_order, document_order),
      KEY idx_project_stage_documents_status (status),
      CONSTRAINT fk_project_stage_documents_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_project_stage_documents_template
        FOREIGN KEY (template_id) REFERENCES stage_document_templates (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_stage_document_attachments (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}
