-- Solution design upload slot schema.
-- This migration only creates internal upload slot/file metadata for the second backend slice.
-- It does not add stage document template items, import sample data, connect the file platform, or change the 8-stage / 71-document model.

CREATE TABLE IF NOT EXISTS project_solution_design_upload_slots (
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
    'solution_ppt'
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_solution_design_upload_files (
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
    'solution_ppt'
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
