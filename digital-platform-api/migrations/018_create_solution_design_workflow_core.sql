-- Solution design stage internal workflow core schema.
-- This migration only creates first-round backend workflow state and role tables.
-- It does not migrate historical project data, import sample data, or change the 8-stage / 71-document model.

CREATE TABLE IF NOT EXISTS project_solution_design_roles (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_solution_design_nodes (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_solution_design_role_history (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
