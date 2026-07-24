async function detailedDesignColumnExists(executor, tableName, columnName) {
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

async function ensureDetailedDesignColumn(executor, tableName, columnName, addColumnSql) {
  if (!(await detailedDesignColumnExists(executor, tableName, columnName))) {
    await executor.execute(addColumnSql);
  }
}

async function ensureDetailedDesignUploadSlotExemptionColumns(executor) {
  await ensureDetailedDesignColumn(
    executor,
    'project_detailed_design_upload_slots',
    'is_upload_exempted',
    'ALTER TABLE project_detailed_design_upload_slots ADD COLUMN is_upload_exempted TINYINT(1) NOT NULL DEFAULT 0 AFTER status'
  );
  await ensureDetailedDesignColumn(
    executor,
    'project_detailed_design_upload_slots',
    'exemption_reason',
    'ALTER TABLE project_detailed_design_upload_slots ADD COLUMN exemption_reason VARCHAR(1000) NULL AFTER is_upload_exempted'
  );
  await ensureDetailedDesignColumn(
    executor,
    'project_detailed_design_upload_slots',
    'exempted_by_user_id',
    'ALTER TABLE project_detailed_design_upload_slots ADD COLUMN exempted_by_user_id BIGINT UNSIGNED NULL AFTER exemption_reason'
  );
  await ensureDetailedDesignColumn(
    executor,
    'project_detailed_design_upload_slots',
    'exempted_at',
    'ALTER TABLE project_detailed_design_upload_slots ADD COLUMN exempted_at DATETIME NULL AFTER exempted_by_user_id'
  );
}

export async function ensureDetailedDesignWorkflowSchema(executor) {
  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_detailed_design_nodes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      node_key ENUM(
        'project_kickoff_meeting',
        'detailed_design_preparation',
        'detailed_design',
        'internal_design_review',
        'customer_design_review',
        'product_plan_drawing',
        'parts_list',
        'drawing_review',
        'customer_drawing_countersign'
      ) NOT NULL,
      node_name VARCHAR(128) NOT NULL,
      node_order TINYINT UNSIGNED NOT NULL,
      status ENUM(
        'not_started',
        'pending',
        'pending_review',
        'waiting_checker',
        'waiting_rd_approval',
        'returned',
        'approved'
      ) NOT NULL DEFAULT 'not_started',
      return_reason VARCHAR(1000) NULL,
      current_revision INT UNSIGNED NOT NULL DEFAULT 1,
      activated_at DATETIME NULL,
      submitted_at DATETIME NULL,
      approved_at DATETIME NULL,
      returned_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_detailed_design_nodes_project_node (project_id, node_key),
      UNIQUE KEY uk_detailed_design_nodes_project_order (project_id, node_order),
      KEY idx_detailed_design_nodes_project_status (project_id, status, node_order),
      CONSTRAINT fk_detailed_design_nodes_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_detailed_design_roles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      project_manager_user_id BIGINT UNSIGNED NULL,
      business_owner_user_id BIGINT UNSIGNED NULL,
      technical_owner_user_id BIGINT UNSIGNED NULL,
      procurement_owner_user_id BIGINT UNSIGNED NULL,
      finance_accountant_user_id BIGINT UNSIGNED NULL,
      drawing_review_owner_user_id BIGINT UNSIGNED NULL,
      assigned_by_user_id BIGINT UNSIGNED NULL,
      assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by_user_id BIGINT UNSIGNED NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_detailed_design_roles_project (project_id),
      KEY idx_detailed_design_roles_project_manager (project_manager_user_id),
      KEY idx_detailed_design_roles_business_owner (business_owner_user_id),
      KEY idx_detailed_design_roles_technical_owner (technical_owner_user_id),
      KEY idx_detailed_design_roles_procurement_owner (procurement_owner_user_id),
      KEY idx_detailed_design_roles_finance_accountant (finance_accountant_user_id),
      KEY idx_detailed_design_roles_drawing_review_owner (drawing_review_owner_user_id),
      KEY idx_detailed_design_roles_assigned_by (assigned_by_user_id),
      KEY idx_detailed_design_roles_updated_by (updated_by_user_id),
      CONSTRAINT fk_detailed_design_roles_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_detailed_design_roles_project_manager
        FOREIGN KEY (project_manager_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_roles_business_owner
        FOREIGN KEY (business_owner_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_roles_technical_owner
        FOREIGN KEY (technical_owner_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_roles_procurement_owner
        FOREIGN KEY (procurement_owner_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_roles_finance_accountant
        FOREIGN KEY (finance_accountant_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_roles_drawing_review_owner
        FOREIGN KEY (drawing_review_owner_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_roles_assigned_by
        FOREIGN KEY (assigned_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_roles_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_detailed_design_professional_group_members (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      assigned_by_user_id BIGINT UNSIGNED NULL,
      assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_detailed_design_professional_group_members_project_user (project_id, user_id),
      KEY idx_detailed_design_professional_group_members_project_active (project_id, is_active, user_id),
      KEY idx_detailed_design_professional_group_members_assigned_by (assigned_by_user_id),
      CONSTRAINT fk_detailed_design_professional_group_members_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_detailed_design_professional_group_members_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_detailed_design_professional_group_members_assigned_by
        FOREIGN KEY (assigned_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_detailed_design_upload_slots (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      node_key ENUM(
        'project_kickoff_meeting',
        'detailed_design_preparation',
        'detailed_design',
        'product_plan_drawing',
        'parts_list',
        'customer_drawing_countersign'
      ) NOT NULL,
      slot_key ENUM(
        'project_kickoff_book',
        'detailed_design_work_plan',
        'three_d_model',
        'electrical_schematic',
        'electrical_wiring_diagram',
        'electrical_layout_diagram',
        'automation_program',
        'software_development_specification',
        'software_ui_design_ppt',
        'software_code',
        'product_plan_drawing',
        'parts_list',
        'customer_drawing_countersign_scan'
      ) NOT NULL,
      slot_name VARCHAR(128) NOT NULL,
      slot_order TINYINT UNSIGNED NOT NULL,
      is_required TINYINT(1) NOT NULL DEFAULT 1,
      revision INT UNSIGNED NOT NULL DEFAULT 1,
      status ENUM('pending', 'uploaded', 'submitted', 'returned', 'approved') NOT NULL DEFAULT 'pending',
      is_upload_exempted TINYINT(1) NOT NULL DEFAULT 0,
      exemption_reason VARCHAR(1000) NULL,
      exempted_by_user_id BIGINT UNSIGNED NULL,
      exempted_at DATETIME NULL,
      return_reason VARCHAR(1000) NULL,
      submitted_by_user_id BIGINT UNSIGNED NULL,
      submitted_at DATETIME NULL,
      approved_by_user_id BIGINT UNSIGNED NULL,
      approved_at DATETIME NULL,
      returned_by_user_id BIGINT UNSIGNED NULL,
      returned_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_detailed_design_upload_slots_project_slot (project_id, slot_key),
      KEY idx_detailed_design_upload_slots_project_node (project_id, node_key, slot_order),
      KEY idx_detailed_design_upload_slots_submitted_by (submitted_by_user_id),
      KEY idx_detailed_design_upload_slots_approved_by (approved_by_user_id),
      KEY idx_detailed_design_upload_slots_returned_by (returned_by_user_id),
      CONSTRAINT fk_detailed_design_upload_slots_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_detailed_design_upload_slots_submitted_by
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_upload_slots_approved_by
        FOREIGN KEY (approved_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_upload_slots_returned_by
        FOREIGN KEY (returned_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_detailed_design_upload_files (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      slot_id BIGINT UNSIGNED NOT NULL,
      slot_key ENUM(
        'project_kickoff_book',
        'detailed_design_work_plan',
        'three_d_model',
        'electrical_schematic',
        'electrical_wiring_diagram',
        'electrical_layout_diagram',
        'automation_program',
        'software_development_specification',
        'software_ui_design_ppt',
        'software_code',
        'product_plan_drawing',
        'parts_list',
        'customer_drawing_countersign_scan'
      ) NOT NULL,
      revision INT UNSIGNED NOT NULL DEFAULT 1,
      original_file_name VARCHAR(255) NOT NULL,
      storage_key VARCHAR(500) NOT NULL,
      mime_type VARCHAR(255) NOT NULL,
      file_size BIGINT UNSIGNED NOT NULL,
      is_current TINYINT(1) NOT NULL DEFAULT 1,
      uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
      uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      replaced_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_detailed_design_upload_files_storage_key (storage_key),
      KEY idx_detailed_design_upload_files_project_slot (project_id, slot_key, revision, is_current),
      KEY idx_detailed_design_upload_files_slot_current (slot_id, is_current, uploaded_at),
      KEY idx_detailed_design_upload_files_uploaded_by (uploaded_by_user_id),
      CONSTRAINT fk_detailed_design_upload_files_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_detailed_design_upload_files_slot
        FOREIGN KEY (slot_id) REFERENCES project_detailed_design_upload_slots (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_detailed_design_upload_files_uploaded_by
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await ensureDetailedDesignUploadSlotExemptionColumns(executor);

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_detailed_design_review_forms (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      node_key ENUM('internal_design_review', 'customer_design_review') NOT NULL,
      review_type ENUM('internal', 'customer') NOT NULL,
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
      generated_file_template_key VARCHAR(128) NULL,
      generated_file_template_version VARCHAR(128) NULL,
      generated_file_template_hash VARCHAR(64) NULL,
      generated_at DATETIME NULL,
      generated_by_user_id BIGINT UNSIGNED NULL,
      generation_error_message VARCHAR(1000) NULL,
      review_status ENUM('pending', 'approved', 'returned') NOT NULL DEFAULT 'pending',
      reviewed_by_user_id BIGINT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      return_reason VARCHAR(1000) NULL,
      created_by_user_id BIGINT UNSIGNED NOT NULL,
      updated_by_user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_detailed_design_review_forms_project_node_revision (project_id, node_key, revision),
      KEY idx_detailed_design_review_forms_current (project_id, node_key, is_current),
      KEY idx_detailed_design_review_forms_project_status (project_id, node_key, form_status, generated_file_status, review_status),
      KEY idx_detailed_design_review_forms_submitted_by (submitted_by_user_id),
      KEY idx_detailed_design_review_forms_generated_by (generated_by_user_id),
      KEY idx_detailed_design_review_forms_reviewed_by (reviewed_by_user_id),
      KEY idx_detailed_design_review_forms_created_by (created_by_user_id),
      KEY idx_detailed_design_review_forms_updated_by (updated_by_user_id),
      CONSTRAINT fk_detailed_design_review_forms_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_detailed_design_review_forms_submitted_by
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_review_forms_generated_by
        FOREIGN KEY (generated_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_review_forms_reviewed_by
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_review_forms_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_detailed_design_review_forms_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_detailed_design_drawing_review_records (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      node_key ENUM('drawing_review') NOT NULL DEFAULT 'drawing_review',
      revision INT UNSIGNED NOT NULL DEFAULT 1,
      drawing_revision INT UNSIGNED NOT NULL DEFAULT 1,
      original_file_name VARCHAR(255) NOT NULL,
      storage_key VARCHAR(500) NOT NULL,
      mime_type VARCHAR(255) NOT NULL,
      file_size BIGINT UNSIGNED NOT NULL,
      current_design_revision INT UNSIGNED NOT NULL DEFAULT 1,
      return_reason VARCHAR(1000) NULL,
      is_current TINYINT(1) NOT NULL DEFAULT 1,
      uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
      uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      replaced_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_detailed_design_drawing_review_records_storage_key (storage_key),
      KEY idx_detailed_design_drawing_review_records_project_revision (project_id, node_key, revision, is_current),
      KEY idx_detailed_design_drawing_review_records_uploaded_by (uploaded_by_user_id),
      CONSTRAINT fk_detailed_design_drawing_review_records_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_detailed_design_drawing_review_records_uploaded_by
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_detailed_design_drawing_review_flows (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      current_revision INT UNSIGNED NOT NULL DEFAULT 1,
      product_plan_drawing_revision INT UNSIGNED NOT NULL DEFAULT 1,
      parts_list_revision INT UNSIGNED NOT NULL DEFAULT 1,
      checker_status ENUM('pending', 'approved', 'returned') NOT NULL DEFAULT 'pending',
      rd_approval_status ENUM('pending', 'approved', 'returned') NOT NULL DEFAULT 'pending',
      checker_user_id BIGINT UNSIGNED NULL,
      checker_at DATETIME NULL,
      checker_comment VARCHAR(1000) NULL,
      rd_approver_user_id BIGINT UNSIGNED NULL,
      rd_approved_at DATETIME NULL,
      rd_comment VARCHAR(1000) NULL,
      return_reason VARCHAR(1000) NULL,
      created_by_user_id BIGINT UNSIGNED NULL,
      updated_by_user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_detailed_design_drawing_review_flows_project (project_id),
      KEY idx_detailed_design_drawing_review_flows_checker_status (checker_status),
      KEY idx_detailed_design_drawing_review_flows_rd_status (rd_approval_status),
      KEY idx_detailed_design_drawing_review_flows_checker_user (checker_user_id),
      KEY idx_detailed_design_drawing_review_flows_rd_user (rd_approver_user_id),
      KEY idx_detailed_design_drawing_review_flows_created_by (created_by_user_id),
      KEY idx_detailed_design_drawing_review_flows_updated_by (updated_by_user_id),
      CONSTRAINT fk_detailed_design_drawing_review_flows_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_detailed_design_drawing_review_flows_checker_user
        FOREIGN KEY (checker_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_drawing_review_flows_rd_user
        FOREIGN KEY (rd_approver_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_drawing_review_flows_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_detailed_design_drawing_review_flows_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}
