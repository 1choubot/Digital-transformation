async function columnExists(executor, tableName, columnName) {
  const [rows] = await executor.execute(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function ensureColumn(executor, tableName, columnName, addColumnSql) {
  if (!(await columnExists(executor, tableName, columnName))) {
    await executor.execute(addColumnSql);
  }
}

async function ensureOwnershipColumns(executor) {
  await ensureColumn(
    executor,
    'stage_document_templates',
    'owner_department',
    'ALTER TABLE stage_document_templates ADD COLUMN owner_department VARCHAR(64) NULL AFTER confirm_role'
  );
  await ensureColumn(
    executor,
    'stage_document_templates',
    'review_department',
    'ALTER TABLE stage_document_templates ADD COLUMN review_department VARCHAR(64) NULL AFTER owner_department'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'owner_department',
    'ALTER TABLE project_stage_documents ADD COLUMN owner_department VARCHAR(64) NULL AFTER confirm_role'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'review_department',
    'ALTER TABLE project_stage_documents ADD COLUMN review_department VARCHAR(64) NULL AFTER owner_department'
  );
}

async function ensureCompletionModeColumns(executor) {
  await ensureColumn(
    executor,
    'stage_document_templates',
    'completion_mode',
    "ALTER TABLE stage_document_templates ADD COLUMN completion_mode ENUM('submit_only', 'approval_required', 'conditional_submit', 'conditional_approval') NOT NULL DEFAULT 'approval_required' AFTER review_department"
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'completion_mode',
    "ALTER TABLE project_stage_documents ADD COLUMN completion_mode ENUM('submit_only', 'approval_required', 'conditional_submit', 'conditional_approval') NOT NULL DEFAULT 'approval_required' AFTER review_department"
  );
}

async function ensureRevisionColumns(executor) {
  await ensureColumn(
    executor,
    'project_stage_documents',
    'revision_required',
    'ALTER TABLE project_stage_documents ADD COLUMN revision_required TINYINT(1) NOT NULL DEFAULT 0 AFTER return_reason'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'revision_reason',
    'ALTER TABLE project_stage_documents ADD COLUMN revision_reason VARCHAR(1000) NULL AFTER revision_required'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'revision_source_document_id',
    'ALTER TABLE project_stage_documents ADD COLUMN revision_source_document_id BIGINT UNSIGNED NULL AFTER revision_reason'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'revision_requested_by_user_id',
    'ALTER TABLE project_stage_documents ADD COLUMN revision_requested_by_user_id BIGINT UNSIGNED NULL AFTER revision_source_document_id'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'revision_requested_at',
    'ALTER TABLE project_stage_documents ADD COLUMN revision_requested_at DATETIME NULL AFTER revision_requested_by_user_id'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'revision_resubmitted_by_user_id',
    'ALTER TABLE project_stage_documents ADD COLUMN revision_resubmitted_by_user_id BIGINT UNSIGNED NULL AFTER revision_requested_at'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'revision_resubmitted_at',
    'ALTER TABLE project_stage_documents ADD COLUMN revision_resubmitted_at DATETIME NULL AFTER revision_resubmitted_by_user_id'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'revision_completed_by_user_id',
    'ALTER TABLE project_stage_documents ADD COLUMN revision_completed_by_user_id BIGINT UNSIGNED NULL AFTER revision_resubmitted_at'
  );
  await ensureColumn(
    executor,
    'project_stage_documents',
    'revision_completed_at',
    'ALTER TABLE project_stage_documents ADD COLUMN revision_completed_at DATETIME NULL AFTER revision_completed_by_user_id'
  );
}

async function ensureInitiationReviewNodeColumns(executor) {
  await ensureColumn(
    executor,
    'project_initiation_review_nodes',
    'reviewer_department',
    'ALTER TABLE project_initiation_review_nodes ADD COLUMN reviewer_department VARCHAR(64) NULL AFTER reviewer_role'
  );
  await ensureColumn(
    executor,
    'project_initiation_review_nodes',
    'invalidated_at',
    'ALTER TABLE project_initiation_review_nodes ADD COLUMN invalidated_at DATETIME NULL AFTER reviewed_at'
  );
  await ensureColumn(
    executor,
    'project_initiation_review_nodes',
    'invalidated_reason',
    'ALTER TABLE project_initiation_review_nodes ADD COLUMN invalidated_reason VARCHAR(255) NULL AFTER invalidated_at'
  );
}

async function ensureGeneratedFilesTable(executor) {
  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_stage_document_generated_files (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      stage_document_id BIGINT UNSIGNED NULL,
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

async function ensureOnlineFormImagesTable(executor) {
  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_stage_document_form_images (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      stage_document_id BIGINT UNSIGNED NOT NULL,
      field_key VARCHAR(64) NOT NULL,
      original_file_name VARCHAR(255) NOT NULL,
      storage_key VARCHAR(512) NOT NULL,
      mime_type VARCHAR(255) NOT NULL,
      file_size BIGINT UNSIGNED NOT NULL,
      content_sha256 VARCHAR(64) NULL,
      uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
      uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_by_user_id BIGINT UNSIGNED NULL,
      deleted_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_stage_document_form_images_storage_key (storage_key),
      KEY idx_stage_document_form_images_document_field (
        project_id,
        stage_document_id,
        field_key,
        deleted_at,
        uploaded_at ASC,
        id ASC
      ),
      KEY idx_stage_document_form_images_uploaded_by (uploaded_by_user_id),
      KEY idx_stage_document_form_images_deleted_by (deleted_by_user_id),
      CONSTRAINT fk_stage_document_form_images_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_stage_document_form_images_stage_document
        FOREIGN KEY (stage_document_id) REFERENCES project_stage_documents (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_stage_document_form_images_uploaded_by
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_stage_document_form_images_deleted_by
        FOREIGN KEY (deleted_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  await ensureColumn(
    executor,
    'project_stage_document_form_images',
    'content_sha256',
    'ALTER TABLE project_stage_document_form_images ADD COLUMN content_sha256 VARCHAR(64) NULL AFTER file_size'
  );
}

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
      owner_department VARCHAR(64) NULL,
      review_department VARCHAR(64) NULL,
      completion_mode ENUM('submit_only', 'approval_required', 'conditional_submit', 'conditional_approval') NOT NULL DEFAULT 'approval_required',
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
      owner_department VARCHAR(64) NULL,
      review_department VARCHAR(64) NULL,
      completion_mode ENUM('submit_only', 'approval_required', 'conditional_submit', 'conditional_approval') NOT NULL DEFAULT 'approval_required',
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
      revision_required TINYINT(1) NOT NULL DEFAULT 0,
      revision_reason VARCHAR(1000) NULL,
      revision_source_document_id BIGINT UNSIGNED NULL,
      revision_requested_by_user_id BIGINT UNSIGNED NULL,
      revision_requested_at DATETIME NULL,
      revision_resubmitted_by_user_id BIGINT UNSIGNED NULL,
      revision_resubmitted_at DATETIME NULL,
      revision_completed_by_user_id BIGINT UNSIGNED NULL,
      revision_completed_at DATETIME NULL,
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

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_initiation_review_nodes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      stage_document_id BIGINT UNSIGNED NOT NULL,
      node_key ENUM('business_review', 'technical_review', 'general_review') NOT NULL,
      node_status ENUM(
        'waiting_document_submission',
        'pending',
        'approved',
        'returned_blocked_by_rework',
        'waiting_prerequisite',
        'invalidated'
      ) NOT NULL,
      reviewer_user_id BIGINT UNSIGNED NULL,
      reviewer_role VARCHAR(64) NOT NULL,
      reviewer_department VARCHAR(64) NULL,
      comment VARCHAR(1000) NULL,
      return_reason VARCHAR(1000) NULL,
      submitted_by_user_id BIGINT UNSIGNED NULL,
      submitted_at DATETIME NULL,
      reviewed_by_user_id BIGINT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      invalidated_at DATETIME NULL,
      invalidated_reason VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_project_initiation_review_nodes_document_node (stage_document_id, node_key),
      KEY idx_project_initiation_review_nodes_project_status (project_id, node_status),
      KEY idx_project_initiation_review_nodes_reviewer (
        reviewer_role,
        reviewer_department,
        node_status
      ),
      KEY idx_project_initiation_review_nodes_reviewer_user (reviewer_user_id),
      KEY idx_project_initiation_review_nodes_reviewed_by (reviewed_by_user_id),
      CONSTRAINT fk_project_initiation_review_nodes_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_project_initiation_review_nodes_stage_document
        FOREIGN KEY (stage_document_id) REFERENCES project_stage_documents (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_project_initiation_review_nodes_reviewer_user
        FOREIGN KEY (reviewer_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_project_initiation_review_nodes_reviewed_by
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await ensureOwnershipColumns(executor);
  await ensureCompletionModeColumns(executor);
  await ensureRevisionColumns(executor);
  await ensureInitiationReviewNodeColumns(executor);
  await ensureGeneratedFilesTable(executor);
  await ensureOnlineFormImagesTable(executor);
}
