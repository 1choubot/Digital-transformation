-- Extend solution design workflow for the cost estimation backend slice.
-- This migration only adds internal status/slot enum values for C17 cost estimation collaboration.
-- It does not add stage document template items, connect the file platform, generate files, or change the 8-stage / 71-document model.

ALTER TABLE project_solution_design_nodes
  MODIFY COLUMN status ENUM(
    'not_started',
    'pending',
    'pending_review',
    'pending_general_review',
    'returned',
    'approved',
    'skipped',
    'ended'
  ) NOT NULL DEFAULT 'not_started';

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
    'finance_cost_estimation_file'
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
    'finance_cost_estimation_file'
  ) NOT NULL;
