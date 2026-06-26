CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_code VARCHAR(64) NULL,
  project_name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  project_manager VARCHAR(128) NOT NULL,
  participating_departments JSON NULL,
  status ENUM('normal', 'risk', 'paused', 'delayed', 'completed') NOT NULL DEFAULT 'normal',
  planned_start_date DATE NULL,
  planned_end_date DATE NULL,
  remark TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_projects_project_code (project_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_stages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  stage_order TINYINT UNSIGNED NOT NULL,
  stage_key VARCHAR(64) NOT NULL,
  stage_name VARCHAR(64) NOT NULL,
  stage_status ENUM('not_started', 'current', 'completed') NOT NULL DEFAULT 'not_started',
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_stages_order (project_id, stage_order),
  UNIQUE KEY uk_project_stages_key (project_id, stage_key),
  CONSTRAINT fk_project_stages_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
