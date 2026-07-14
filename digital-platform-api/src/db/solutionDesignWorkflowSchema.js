async function solutionDesignColumnExists(executor, tableName, columnName) {
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

async function ensureSolutionDesignColumn(executor, tableName, columnName, addColumnSql) {
  if (!(await solutionDesignColumnExists(executor, tableName, columnName))) {
    await executor.execute(addColumnSql);
  }
}

async function ensureSolutionDesignGeneratedFileColumns(executor) {
  await ensureSolutionDesignColumn(
    executor,
    'project_solution_design_analysis_forms',
    'generated_file_template_name',
    'ALTER TABLE project_solution_design_analysis_forms ADD COLUMN generated_file_template_name VARCHAR(255) NULL AFTER generated_file_size'
  );
  await ensureSolutionDesignColumn(
    executor,
    'project_solution_design_analysis_forms',
    'generated_by_user_id',
    'ALTER TABLE project_solution_design_analysis_forms ADD COLUMN generated_by_user_id BIGINT UNSIGNED NULL AFTER generated_at'
  );
  await ensureSolutionDesignColumn(
    executor,
    'project_solution_design_review_forms',
    'generated_file_template_name',
    'ALTER TABLE project_solution_design_review_forms ADD COLUMN generated_file_template_name VARCHAR(255) NULL AFTER generated_file_size'
  );
  await ensureSolutionDesignColumn(
    executor,
    'project_solution_design_review_forms',
    'generated_by_user_id',
    'ALTER TABLE project_solution_design_review_forms ADD COLUMN generated_by_user_id BIGINT UNSIGNED NULL AFTER generated_at'
  );
}

export async function ensureSolutionDesignWorkflowSchema(executor) {
  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_solution_design_roles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      technical_owner_user_id BIGINT UNSIGNED NOT NULL,
      business_owner_user_id BIGINT UNSIGNED NOT NULL,
      procurement_owner_user_id BIGINT UNSIGNED NOT NULL,
      finance_accountant_user_id BIGINT UNSIGNED NOT NULL,
      finance_owner_user_id BIGINT UNSIGNED NOT NULL,
      assigned_by_user_id BIGINT UNSIGNED NOT NULL,
      assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by_user_id BIGINT UNSIGNED NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_solution_design_roles_project (project_id),
      KEY idx_solution_design_roles_technical_owner (technical_owner_user_id),
      KEY idx_solution_design_roles_business_owner (business_owner_user_id),
      KEY idx_solution_design_roles_procurement_owner (procurement_owner_user_id),
      KEY idx_solution_design_roles_finance_accountant (finance_accountant_user_id),
      KEY idx_solution_design_roles_finance_owner (finance_owner_user_id),
      KEY idx_solution_design_roles_assigned_by (assigned_by_user_id),
      KEY idx_solution_design_roles_updated_by (updated_by_user_id),
      CONSTRAINT fk_solution_design_roles_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_solution_design_roles_technical_owner
        FOREIGN KEY (technical_owner_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_roles_business_owner
        FOREIGN KEY (business_owner_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_roles_procurement_owner
        FOREIGN KEY (procurement_owner_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_roles_finance_accountant
        FOREIGN KEY (finance_accountant_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_roles_finance_owner
        FOREIGN KEY (finance_owner_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_roles_assigned_by
        FOREIGN KEY (assigned_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_roles_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_solution_design_nodes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      node_key ENUM(
        'solution_preparation',
        'solution_analysis',
        'solution_design',
        'internal_solution_review',
        'customer_solution_review',
        'rd_cost_estimation',
        'manufacturing_cost_estimation',
        'finance_cost_estimation',
        'quotation_or_tender'
      ) NOT NULL,
      node_name VARCHAR(128) NOT NULL,
      node_order TINYINT UNSIGNED NOT NULL,
      status ENUM(
        'not_started',
        'pending',
        'pending_review',
        'pending_general_review',
        'returned',
        'approved',
        'skipped',
        'ended'
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
      UNIQUE KEY uk_solution_design_nodes_project_node (project_id, node_key),
      UNIQUE KEY uk_solution_design_nodes_project_order (project_id, node_order),
      KEY idx_solution_design_nodes_project_status (project_id, status, node_order),
      CONSTRAINT fk_solution_design_nodes_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_solution_design_role_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      role_key ENUM(
        'project_manager',
        'technical_owner',
        'business_owner',
        'procurement_owner',
        'finance_accountant',
        'finance_owner'
      ) NOT NULL,
      from_user_id BIGINT UNSIGNED NULL,
      to_user_id BIGINT UNSIGNED NULL,
      changed_by_user_id BIGINT UNSIGNED NOT NULL,
      changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_solution_design_role_history_project_role (project_id, role_key, changed_at),
      KEY idx_solution_design_role_history_from_user (from_user_id),
      KEY idx_solution_design_role_history_to_user (to_user_id),
      KEY idx_solution_design_role_history_changed_by (changed_by_user_id),
      CONSTRAINT fk_solution_design_role_history_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_solution_design_role_history_from_user
        FOREIGN KEY (from_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_solution_design_role_history_to_user
        FOREIGN KEY (to_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_solution_design_role_history_changed_by
        FOREIGN KEY (changed_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_solution_design_upload_slots (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      node_key ENUM(
        'solution_preparation',
        'solution_analysis',
        'solution_design',
        'internal_solution_review',
        'customer_solution_review',
        'rd_cost_estimation',
        'manufacturing_cost_estimation',
        'finance_cost_estimation',
        'quotation_or_tender'
      ) NOT NULL,
      slot_key ENUM(
        'solution_work_plan',
        'product_function_diagram',
        'process_timing_diagram',
        'cycle_time_table',
        'layout_diagram',
        'three_d_model',
        'demo_animation',
        'electrical_function_diagram',
        'software_function_diagram',
        'solution_ppt',
        'rd_cost_estimation_file',
        'manufacturing_cost_estimation_file',
        'finance_cost_estimation_file',
        'quotation_file',
        'tender_business_file',
        'tender_technical_file'
      ) NOT NULL,
      slot_name VARCHAR(128) NOT NULL,
      slot_order TINYINT UNSIGNED NOT NULL,
      is_required TINYINT(1) NOT NULL DEFAULT 1,
      revision INT UNSIGNED NOT NULL DEFAULT 1,
      status ENUM('pending', 'uploaded', 'submitted') NOT NULL DEFAULT 'pending',
      submitted_by_user_id BIGINT UNSIGNED NULL,
      submitted_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_solution_design_upload_slots_project_slot (project_id, slot_key),
      KEY idx_solution_design_upload_slots_project_node (project_id, node_key, slot_order),
      KEY idx_solution_design_upload_slots_submitted_by (submitted_by_user_id),
      CONSTRAINT fk_solution_design_upload_slots_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_solution_design_upload_slots_submitted_by
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_solution_design_upload_files (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      slot_id BIGINT UNSIGNED NOT NULL,
      slot_key ENUM(
        'solution_work_plan',
        'product_function_diagram',
        'process_timing_diagram',
        'cycle_time_table',
        'layout_diagram',
        'three_d_model',
        'demo_animation',
        'electrical_function_diagram',
        'software_function_diagram',
        'solution_ppt',
        'rd_cost_estimation_file',
        'manufacturing_cost_estimation_file',
        'finance_cost_estimation_file',
        'quotation_file',
        'tender_business_file',
        'tender_technical_file'
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
      PRIMARY KEY (id),
      UNIQUE KEY uk_solution_design_upload_files_storage_key (storage_key),
      KEY idx_solution_design_upload_files_project_slot (project_id, slot_key, revision, is_current),
      KEY idx_solution_design_upload_files_slot_current (slot_id, is_current, uploaded_at),
      KEY idx_solution_design_upload_files_uploaded_by (uploaded_by_user_id),
      CONSTRAINT fk_solution_design_upload_files_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_solution_design_upload_files_slot
        FOREIGN KEY (slot_id) REFERENCES project_solution_design_upload_slots (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_solution_design_upload_files_uploaded_by
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_solution_design_analysis_forms (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      node_key ENUM('solution_analysis') NOT NULL DEFAULT 'solution_analysis',
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
      UNIQUE KEY uk_solution_design_analysis_forms_project_revision (project_id, revision),
      KEY idx_solution_design_analysis_forms_current (project_id, is_current),
      KEY idx_solution_design_analysis_forms_project_status (project_id, form_status, generated_file_status),
      KEY idx_solution_design_analysis_forms_submitted_by (submitted_by_user_id),
      KEY idx_solution_design_analysis_forms_generated_by (generated_by_user_id),
      KEY idx_solution_design_analysis_forms_created_by (created_by_user_id),
      KEY idx_solution_design_analysis_forms_updated_by (updated_by_user_id),
      CONSTRAINT fk_solution_design_analysis_forms_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_solution_design_analysis_forms_submitted_by
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_solution_design_analysis_forms_generated_by
        FOREIGN KEY (generated_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_solution_design_analysis_forms_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_analysis_forms_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_solution_design_review_forms (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      node_key ENUM('internal_solution_review', 'customer_solution_review') NOT NULL,
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
      generated_file_template_name VARCHAR(255) NULL,
      generated_at DATETIME NULL,
      generated_by_user_id BIGINT UNSIGNED NULL,
      generation_error_message VARCHAR(1000) NULL,
      created_by_user_id BIGINT UNSIGNED NOT NULL,
      updated_by_user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_solution_design_review_forms_project_node_revision (project_id, node_key, revision),
      KEY idx_solution_design_review_forms_current (project_id, node_key, is_current),
      KEY idx_solution_design_review_forms_project_status (project_id, node_key, form_status, generated_file_status),
      KEY idx_solution_design_review_forms_submitted_by (submitted_by_user_id),
      KEY idx_solution_design_review_forms_generated_by (generated_by_user_id),
      KEY idx_solution_design_review_forms_created_by (created_by_user_id),
      KEY idx_solution_design_review_forms_updated_by (updated_by_user_id),
      CONSTRAINT fk_solution_design_review_forms_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_solution_design_review_forms_submitted_by
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_solution_design_review_forms_generated_by
        FOREIGN KEY (generated_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_solution_design_review_forms_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_review_forms_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_solution_design_quotation_forms (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_solution_design_quotation_tender_flows (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      branch_type ENUM('quotation', 'tender') NOT NULL,
      branch_status ENUM(
        'selected',
        'submitted',
        'pending_review',
        'approved',
        'returned',
        'accepted',
        'rejected',
        'ended'
      ) NOT NULL DEFAULT 'selected',
      selected_by_user_id BIGINT UNSIGNED NOT NULL,
      selected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      quotation_result ENUM('accepted', 'rejected') NULL,
      quotation_rejected_action ENUM('return_to_rd_cost', 'end_project') NULL,
      return_reason VARCHAR(1000) NULL,
      revision INT UNSIGNED NOT NULL DEFAULT 1,
      created_by_user_id BIGINT UNSIGNED NOT NULL,
      updated_by_user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_solution_design_quotation_tender_project (project_id),
      KEY idx_solution_design_quotation_tender_branch (project_id, branch_type, branch_status),
      KEY idx_solution_design_quotation_tender_selected_by (selected_by_user_id),
      KEY idx_solution_design_quotation_tender_created_by (created_by_user_id),
      KEY idx_solution_design_quotation_tender_updated_by (updated_by_user_id),
      CONSTRAINT fk_solution_design_quotation_tender_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_solution_design_quotation_tender_selected_by
        FOREIGN KEY (selected_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_quotation_tender_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_solution_design_quotation_tender_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await ensureSolutionDesignGeneratedFileColumns(executor);
}
