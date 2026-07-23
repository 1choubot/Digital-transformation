CREATE TABLE IF NOT EXISTS project_contract_signing_nodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  node_key ENUM(
    'contract_preparation',
    'contract_signing',
    'advance_payment',
    'project_kickoff_notice'
  ) NOT NULL,
  node_name VARCHAR(128) NOT NULL,
  node_order TINYINT UNSIGNED NOT NULL,
  status ENUM(
    'not_started',
    'pending',
    'pending_review',
    'waiting_general_manager',
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
  UNIQUE KEY uk_contract_signing_nodes_project_node (project_id, node_key),
  UNIQUE KEY uk_contract_signing_nodes_project_order (project_id, node_order),
  KEY idx_contract_signing_nodes_project_status (project_id, status, node_order),
  CONSTRAINT fk_contract_signing_nodes_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_contract_signing_upload_slots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  node_key ENUM(
    'contract_preparation',
    'contract_signing',
    'advance_payment',
    'project_kickoff_notice'
  ) NOT NULL,
  slot_key ENUM(
    'technical_agreement',
    'sales_contract',
    'technical_agreement_scan',
    'sales_contract_scan',
    'project_kickoff_notice'
  ) NOT NULL,
  slot_name VARCHAR(128) NOT NULL,
  slot_order TINYINT UNSIGNED NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('pending', 'uploaded', 'submitted', 'approved', 'returned') NOT NULL DEFAULT 'pending',
  review_status ENUM('pending', 'approved', 'returned') NULL,
  confirmation_status ENUM('pending', 'approved', 'returned') NULL,
  return_reason VARCHAR(1000) NULL,
  submitted_by_user_id BIGINT UNSIGNED NULL,
  submitted_at DATETIME NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  confirmed_by_user_id BIGINT UNSIGNED NULL,
  confirmed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_contract_signing_upload_slots_project_slot (project_id, slot_key),
  KEY idx_contract_signing_upload_slots_project_node (project_id, node_key, slot_order),
  KEY idx_contract_signing_upload_slots_submitted_by (submitted_by_user_id),
  KEY idx_contract_signing_upload_slots_reviewed_by (reviewed_by_user_id),
  KEY idx_contract_signing_upload_slots_confirmed_by (confirmed_by_user_id),
  CONSTRAINT fk_contract_signing_upload_slots_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_contract_signing_upload_slots_submitted_by
    FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_contract_signing_upload_slots_reviewed_by
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_contract_signing_upload_slots_confirmed_by
    FOREIGN KEY (confirmed_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_contract_signing_upload_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NOT NULL,
  slot_key ENUM(
    'technical_agreement',
    'sales_contract',
    'technical_agreement_scan',
    'sales_contract_scan',
    'project_kickoff_notice'
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
  UNIQUE KEY uk_contract_signing_upload_files_storage_key (storage_key),
  KEY idx_contract_signing_upload_files_project_slot (project_id, slot_key, revision, is_current),
  KEY idx_contract_signing_upload_files_slot_current (slot_id, is_current, uploaded_at),
  KEY idx_contract_signing_upload_files_uploaded_by (uploaded_by_user_id),
  CONSTRAINT fk_contract_signing_upload_files_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_contract_signing_upload_files_slot
    FOREIGN KEY (slot_id) REFERENCES project_contract_signing_upload_slots (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_contract_signing_upload_files_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_contract_signing_payment_flows (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  status ENUM(
    'not_started',
    'pending',
    'completed',
    'waiting_general_manager',
    'released'
  ) NOT NULL DEFAULT 'not_started',
  requested_by_user_id BIGINT UNSIGNED NULL,
  requested_at DATETIME NULL,
  approved_by_user_id BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_contract_signing_payment_flows_project (project_id),
  KEY idx_contract_signing_payment_flows_status (status),
  KEY idx_contract_signing_payment_flows_requested_by (requested_by_user_id),
  KEY idx_contract_signing_payment_flows_approved_by (approved_by_user_id),
  CONSTRAINT fk_contract_signing_payment_flows_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_contract_signing_payment_flows_requested_by
    FOREIGN KEY (requested_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_contract_signing_payment_flows_approved_by
    FOREIGN KEY (approved_by_user_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
