/*
 Final merged digital_platform schema.
 Base: docs/digital_platform_main.sql.
 Additions: report migrations 010-022 schema and users.job_title compatibility field.
 Generated without INSERT data so it can be used as a clean server schema baseline.
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Table structure for auth_sessions
-- ----------------------------
DROP TABLE IF EXISTS `auth_sessions`;
CREATE TABLE `auth_sessions`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `token_hash` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_auth_sessions_token_hash`(`token_hash` ASC) USING BTREE,
  INDEX `idx_auth_sessions_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_auth_sessions_expires_at`(`expires_at` ASC) USING BTREE,
  CONSTRAINT `fk_auth_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for business_operation_logs
-- ----------------------------
DROP TABLE IF EXISTS `business_operation_logs`;
CREATE TABLE `business_operation_logs`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `actor_user_id` bigint UNSIGNED NOT NULL,
  `action_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` bigint UNSIGNED NULL DEFAULT NULL,
  `summary` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `details_json` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_business_operation_logs_project_created`(`project_id` ASC, `created_at` DESC, `id` DESC) USING BTREE,
  INDEX `idx_business_operation_logs_actor_user`(`actor_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_business_operation_logs_actor_user` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_business_operation_logs_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for project_stage_approval_history
-- ----------------------------
DROP TABLE IF EXISTS `project_stage_approval_history`;
CREATE TABLE `project_stage_approval_history`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `stage_id` bigint UNSIGNED NOT NULL,
  `approval_node` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` bigint UNSIGNED NOT NULL,
  `actor_approval_role` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `from_approval_status` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `to_approval_status` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_project_stage_approval_history_project`(`project_id` ASC) USING BTREE,
  INDEX `idx_project_stage_approval_history_stage`(`stage_id` ASC) USING BTREE,
  INDEX `idx_project_stage_approval_history_project_stage_sort`(`project_id` ASC, `stage_id` ASC, `created_at` ASC, `id` ASC) USING BTREE,
  INDEX `fk_project_stage_approval_history_actor`(`actor_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_project_stage_approval_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_project_stage_approval_history_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_project_stage_approval_history_stage` FOREIGN KEY (`stage_id`) REFERENCES `project_stages` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for project_stage_document_attachments
-- ----------------------------
DROP TABLE IF EXISTS `project_stage_document_attachments`;
CREATE TABLE `project_stage_document_attachments`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `stage_document_id` bigint UNSIGNED NOT NULL,
  `original_file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `file_size` bigint UNSIGNED NOT NULL,
  `uploaded_by_user_id` bigint UNSIGNED NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `deleted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_stage_document_attachments_storage_key`(`storage_key` ASC) USING BTREE,
  INDEX `idx_stage_document_attachments_project`(`project_id` ASC) USING BTREE,
  INDEX `idx_stage_document_attachments_document_deleted_sort`(`stage_document_id` ASC, `deleted_at` ASC, `uploaded_at` DESC, `id` DESC) USING BTREE,
  INDEX `idx_stage_document_attachments_uploaded_by`(`uploaded_by_user_id` ASC) USING BTREE,
  INDEX `idx_stage_document_attachments_deleted_by`(`deleted_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_stage_document_attachments_deleted_by` FOREIGN KEY (`deleted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_stage_document_attachments_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_stage_document_attachments_stage_document` FOREIGN KEY (`stage_document_id`) REFERENCES `project_stage_documents` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_stage_document_attachments_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for project_stage_documents
-- ----------------------------
DROP TABLE IF EXISTS `project_stage_documents`;
CREATE TABLE `project_stage_documents`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `template_id` bigint UNSIGNED NULL DEFAULT NULL,
  `template_version` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_order` tinyint UNSIGNED NOT NULL,
  `stage_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_order` smallint UNSIGNED NOT NULL,
  `document_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `default_responsibility_role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `confirm_role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_department` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `review_department` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `submit_mode` enum('online_form','file_upload','mixed','tbd') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_folder_path` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_folder_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `status` enum('not_submitted','submitted','confirmed','returned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_submitted',
  `is_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `responsible_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `responsibility_updated_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `responsibility_updated_at` datetime NULL DEFAULT NULL,
  `form_record_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `file_record_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `submitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `confirmed_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `returned_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `confirmed_at` datetime NULL DEFAULT NULL,
  `returned_at` datetime NULL DEFAULT NULL,
  `return_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `not_applicable_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `not_applicable_at` datetime NULL DEFAULT NULL,
  `not_applicable_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `restored_applicable_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `restored_applicable_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_project_stage_documents_project_doc`(`project_id` ASC, `stage_key` ASC, `document_code` ASC) USING BTREE,
  INDEX `idx_project_stage_documents_project_stage`(`project_id` ASC, `stage_order` ASC, `document_order` ASC) USING BTREE,
  INDEX `idx_project_stage_documents_status`(`status` ASC) USING BTREE,
  INDEX `fk_project_stage_documents_template`(`template_id` ASC) USING BTREE,
  CONSTRAINT `fk_project_stage_documents_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_project_stage_documents_template` FOREIGN KEY (`template_id`) REFERENCES `stage_document_templates` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for project_stages
-- ----------------------------
DROP TABLE IF EXISTS `project_stages`;
CREATE TABLE `project_stages`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `stage_order` tinyint UNSIGNED NOT NULL,
  `stage_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_status` enum('not_started','current','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_started',
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `approval_status` enum('not_submitted','pending_center_manager','returned_by_center_manager','pending_general_manager','returned_by_general_manager','approved','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_submitted',
  `started_at` datetime NULL DEFAULT NULL,
  `completed_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_project_stages_order`(`project_id` ASC, `stage_order` ASC) USING BTREE,
  UNIQUE INDEX `uk_project_stages_key`(`project_id` ASC, `stage_key` ASC) USING BTREE,
  CONSTRAINT `fk_project_stages_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for projects
-- ----------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_mode` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'self_developed',
  `project_manager` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_manager_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `participating_departments` json NULL,
  `status` enum('normal','risk','paused','delayed','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `planned_start_date` date NULL DEFAULT NULL,
  `planned_end_date` date NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_projects_project_code`(`project_code` ASC) USING BTREE,
  INDEX `idx_projects_created_by_user_id`(`created_by_user_id` ASC) USING BTREE,
  INDEX `idx_projects_project_manager_user_id`(`project_manager_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_projects_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_projects_project_manager_user` FOREIGN KEY (`project_manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for stage_document_templates
-- ----------------------------
DROP TABLE IF EXISTS `stage_document_templates`;
CREATE TABLE `stage_document_templates`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_version` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_order` tinyint UNSIGNED NOT NULL,
  `stage_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_order` smallint UNSIGNED NOT NULL,
  `document_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `default_responsibility_role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `confirm_role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_department` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `review_department` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `submit_mode` enum('online_form','file_upload','mixed','tbd') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_folder_path` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_folder_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_stage_document_templates_version_code`(`template_version` ASC, `document_code` ASC) USING BTREE,
  INDEX `idx_stage_document_templates_stage`(`template_version` ASC, `stage_order` ASC, `document_order` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `account` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `organization_role` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'employee',
  `role` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '岗位名称',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `is_platform_admin` tinyint(1) NOT NULL DEFAULT 0,
  `file_platform_user_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_updated_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_users_account`(`account` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for center_daily_report_schedules
-- ----------------------------
DROP TABLE IF EXISTS `center_daily_report_schedules`;
CREATE TABLE `center_daily_report_schedules`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `department` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `generate_time` time NOT NULL DEFAULT '18:00:00',
  `timezone` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Asia/Shanghai',
  `updated_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_center_daily_report_schedules_department`(`department` ASC) USING BTREE,
  INDEX `fk_center_daily_report_schedules_updated_by`(`updated_by_user_id` ASC) USING BTREE,
  INDEX `idx_center_daily_report_schedules_enabled_time`(`is_enabled` ASC, `generate_time` ASC) USING BTREE,
  CONSTRAINT `fk_center_daily_report_schedules_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for daily_report_attachments
-- ----------------------------
DROP TABLE IF EXISTS `daily_report_attachments`;
CREATE TABLE `daily_report_attachments`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `daily_report_id` bigint UNSIGNED NOT NULL,
  `original_file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint UNSIGNED NOT NULL,
  `uploaded_by_user_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_daily_report_attachments_storage_key`(`storage_key` ASC) USING BTREE,
  INDEX `fk_daily_report_attachments_uploader`(`uploaded_by_user_id` ASC) USING BTREE,
  INDEX `idx_daily_report_attachments_report`(`daily_report_id` ASC) USING BTREE,
  CONSTRAINT `fk_daily_report_attachments_report` FOREIGN KEY (`daily_report_id`) REFERENCES `daily_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_daily_report_attachments_uploader` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for daily_report_items
-- ----------------------------
DROP TABLE IF EXISTS `daily_report_items`;
CREATE TABLE `daily_report_items`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `daily_report_id` bigint UNSIGNED NOT NULL,
  `sort_order` smallint UNSIGNED NOT NULL,
  `work_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `completion_progress` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `completed_at` time NOT NULL,
  `responsible_person` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `deviation_and_corrective_action` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_daily_report_items_order`(`daily_report_id` ASC, `sort_order` ASC) USING BTREE,
  CONSTRAINT `fk_daily_report_items_report` FOREIGN KEY (`daily_report_id`) REFERENCES `daily_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for daily_report_plans
-- ----------------------------
DROP TABLE IF EXISTS `daily_report_plans`;
CREATE TABLE `daily_report_plans`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `daily_report_id` bigint UNSIGNED NOT NULL,
  `sort_order` smallint UNSIGNED NOT NULL,
  `planned_work_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `responsible_person` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `planned_complete_at` time NULL DEFAULT NULL,
  `collaborating_center` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `collaboration_item` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_daily_report_plans_order`(`daily_report_id` ASC, `sort_order` ASC) USING BTREE,
  CONSTRAINT `fk_daily_report_plans_report` FOREIGN KEY (`daily_report_id`) REFERENCES `daily_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for daily_reports
-- ----------------------------
DROP TABLE IF EXISTS `daily_reports`;
CREATE TABLE `daily_reports`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `report_date` date NOT NULL,
  `project_id` bigint UNSIGNED NOT NULL,
  `status` enum('draft','submitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_daily_reports_user_date_project`(`user_id` ASC, `report_date` ASC, `project_id` ASC) USING BTREE,
  INDEX `idx_daily_reports_date_status_user`(`report_date` ASC, `status` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_daily_reports_project_date_status`(`project_id` ASC, `report_date` ASC, `status` ASC) USING BTREE,
  CONSTRAINT `fk_daily_reports_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_daily_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for report_weekly_rest_mode_anchors
-- ----------------------------
DROP TABLE IF EXISTS `report_weekly_rest_mode_anchors`;
CREATE TABLE `report_weekly_rest_mode_anchors`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `week_start` date NOT NULL,
  `rest_mode` enum('single_rest','double_rest') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_user_id` bigint UNSIGNED NOT NULL,
  `updated_by_user_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_report_weekly_rest_mode_anchors_week_start`(`week_start` ASC) USING BTREE,
  INDEX `fk_report_weekly_rest_mode_anchors_created_by`(`created_by_user_id` ASC) USING BTREE,
  INDEX `fk_report_weekly_rest_mode_anchors_updated_by`(`updated_by_user_id` ASC) USING BTREE,
  INDEX `idx_report_weekly_rest_mode_anchors_lookup`(`week_start` ASC, `id` ASC) USING BTREE,
  CONSTRAINT `fk_report_weekly_rest_mode_anchors_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_report_weekly_rest_mode_anchors_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for weekly_report_plans
-- ----------------------------
DROP TABLE IF EXISTS `weekly_report_plans`;
CREATE TABLE `weekly_report_plans`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `weekly_report_id` bigint UNSIGNED NOT NULL,
  `sort_order` smallint UNSIGNED NOT NULL,
  `work_task` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_target` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `planned_date` date NOT NULL,
  `responsible_person` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_weekly_report_plans_order`(`weekly_report_id` ASC, `sort_order` ASC) USING BTREE,
  CONSTRAINT `fk_weekly_report_plans_report` FOREIGN KEY (`weekly_report_id`) REFERENCES `weekly_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for weekly_report_summaries
-- ----------------------------
DROP TABLE IF EXISTS `weekly_report_summaries`;
CREATE TABLE `weekly_report_summaries`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `weekly_report_id` bigint UNSIGNED NOT NULL,
  `sort_order` smallint UNSIGNED NOT NULL,
  `work_task` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_target` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `planned_date` date NOT NULL,
  `completion_status` enum('completed','in_progress','not_completed','added') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `completion_description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `completed_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_weekly_report_summaries_order`(`weekly_report_id` ASC, `sort_order` ASC) USING BTREE,
  CONSTRAINT `fk_weekly_report_summaries_report` FOREIGN KEY (`weekly_report_id`) REFERENCES `weekly_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- Table structure for weekly_reports
-- ----------------------------
DROP TABLE IF EXISTS `weekly_reports`;
CREATE TABLE `weekly_reports`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `week_start` date NOT NULL,
  `week_end` date NOT NULL,
  `status` enum('draft','submitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `ai_score` json NULL COMMENT 'AI鎴栬鍒欒瘎鍒嗙粨鏋滅紦瀛?,
  `ai_evaluated_at` datetime NULL DEFAULT NULL,
  `ai_evaluation_source` enum('ai','fallback_rule') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ai_evaluation_error` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `final_score` decimal(5, 2) NULL DEFAULT NULL COMMENT '鑰冩牳浜烘渶缁堣瘎鍒嗭紝浠ヤ汉宸ュ～鍐欎负鍑?,
  `final_grade` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '鎸夋渶缁堣瘎鍒嗘垨浜哄伐鍙ｅ緞纭鐨勭瓑绾?,
  `final_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '鑰冩牳浜烘渶缁堣瘎璇?,
  `final_reviewed_by_user_id` bigint UNSIGNED NULL DEFAULT NULL COMMENT '鏈€缁堣瘎鍒嗕汉鐢ㄦ埛ID',
  `final_reviewed_at` datetime NULL DEFAULT NULL COMMENT '鏈€缁堣瘎鍒嗙‘璁ゆ椂闂?,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_weekly_reports_user_week`(`user_id` ASC, `week_start` ASC, `week_end` ASC) USING BTREE,
  INDEX `idx_weekly_reports_week_status_user`(`week_start` ASC, `status` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_weekly_reports_final_reviewer`(`final_reviewed_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_weekly_reports_final_reviewer` FOREIGN KEY (`final_reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_weekly_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;

