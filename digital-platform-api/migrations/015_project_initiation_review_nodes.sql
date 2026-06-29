CREATE TABLE IF NOT EXISTS project_initiation_review_nodes (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
