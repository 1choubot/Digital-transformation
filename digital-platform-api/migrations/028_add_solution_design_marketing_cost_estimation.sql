-- Add solution design marketing cost estimation as an internal C17 workflow node.
-- This migration extends MySQL enum constraints for the existing workflow tables.
-- It does not add stage document template items, change template counts, or alter
-- the 8-stage / 71-document model.
-- Scope: schema enum expansion only. This migration intentionally does not
-- migrate existing test/mock workflow rows from the old 9-node shape.
-- Existing old solution design test data must be rebuilt, or its workflow data
-- must be cleared and initialized again. The new process takes effect from the
-- code-initialized 10-node / 17-slot workflow definition.

ALTER TABLE project_solution_design_nodes
  MODIFY COLUMN node_key ENUM(
    'solution_preparation',
    'solution_analysis',
    'solution_design',
    'internal_solution_review',
    'customer_solution_review',
    'rd_cost_estimation',
    'manufacturing_cost_estimation',
    'marketing_cost_estimation',
    'finance_cost_estimation',
    'quotation_or_tender'
  ) NOT NULL;

ALTER TABLE project_solution_design_upload_slots
  MODIFY COLUMN node_key ENUM(
    'solution_preparation',
    'solution_analysis',
    'solution_design',
    'internal_solution_review',
    'customer_solution_review',
    'rd_cost_estimation',
    'manufacturing_cost_estimation',
    'marketing_cost_estimation',
    'finance_cost_estimation',
    'quotation_or_tender'
  ) NOT NULL;

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
    'marketing_cost_estimation_file',
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
    'marketing_cost_estimation_file',
    'finance_cost_estimation_file',
    'quotation_file',
    'tender_business_file',
    'tender_technical_file'
  ) NOT NULL;
