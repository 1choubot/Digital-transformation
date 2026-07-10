-- Extend solution design workflow for the quotation/tender backend slice.
-- This migration adds one internal branch-state table and three upload slot enum values.
-- It does not add stage document template items, connect the file platform, generate files,
-- or change the 8-stage / 71-document model.

ALTER TABLE project_solution_design_upload_slots
  MODIFY COLUMN slot_key ENUM(
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
  ) NOT NULL;

ALTER TABLE project_solution_design_upload_files
  MODIFY COLUMN slot_key ENUM(
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
  ) NOT NULL;

CREATE TABLE IF NOT EXISTS project_solution_design_quotation_tender_flows (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
