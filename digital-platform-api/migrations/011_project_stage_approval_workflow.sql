SET @has_project_stage_approval_status = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_stages'
    AND COLUMN_NAME = 'approval_status'
);
SET @add_project_stage_approval_status = IF(
  @has_project_stage_approval_status = 0,
  'ALTER TABLE project_stages ADD COLUMN approval_status ENUM(''not_submitted'', ''pending_center_manager'', ''returned_by_center_manager'', ''pending_general_manager'', ''returned_by_general_manager'', ''approved'', ''cancelled'') NOT NULL DEFAULT ''not_submitted'' AFTER is_current',
  'SELECT 1'
);
PREPARE stmt FROM @add_project_stage_approval_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS project_stage_approval_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  stage_id BIGINT UNSIGNED NOT NULL,
  approval_node VARCHAR(128) NOT NULL,
  action_type VARCHAR(64) NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  actor_approval_role VARCHAR(64) NOT NULL,
  comment VARCHAR(1000) NULL,
  from_approval_status VARCHAR(64) NOT NULL,
  to_approval_status VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_stage_approval_history_project (project_id),
  KEY idx_project_stage_approval_history_stage (stage_id),
  KEY idx_project_stage_approval_history_project_stage_sort (project_id, stage_id, created_at, id),
  CONSTRAINT fk_project_stage_approval_history_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_stage_approval_history_stage
    FOREIGN KEY (stage_id) REFERENCES project_stages (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_stage_approval_history_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
