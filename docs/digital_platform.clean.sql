/*
 Navicat Premium Dump SQL

 Source Server         : mysql
 Source Server Type    : MySQL
 Source Server Version : 80044 (8.0.44)
 Source Host           : localhost:3306
 Source Schema         : digital_platform

 Target Server Type    : MySQL
 Target Server Version : 80044 (8.0.44)
 File Encoding         : 65001

 Date: 15/07/2026 09:51:07

 Clean bootstrap dump:
 - schema source: digital_platform._new.sql
 - preserved data source: digital_platform.sql
 - preserved tables: users, stage_document_templates, center_daily_report_schedules, report_weekly_rest_mode_anchors
 - all authentication sessions and business workflow/report data are intentionally empty
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of auth_sessions
-- ----------------------------

-- ----------------------------
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of business_operation_logs
-- ----------------------------

-- ----------------------------
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of center_daily_report_schedules
-- ----------------------------

-- ----------------------------
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of daily_report_attachments
-- ----------------------------

-- ----------------------------
-- Table structure for daily_report_items
-- ----------------------------
DROP TABLE IF EXISTS `daily_report_items`;
CREATE TABLE `daily_report_items`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `daily_report_id` bigint UNSIGNED NOT NULL,
  `sort_order` smallint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NULL DEFAULT NULL COMMENT '鍏宠仈椤圭洰ID',
  `source_type` enum('weekly_plan','ad_hoc','legacy_unknown') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'legacy_unknown' COMMENT '浠诲姟鏉ユ簮',
  `source_plan_task_key` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '鍏宠仈鍛ㄨ?鍒?task_key',
  `execution_status` enum('completed','in_progress','not_completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '瀹為檯鎵ц?鐘舵?',
  `work_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `completion_progress` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `completed_at` time NULL DEFAULT NULL,
  `responsible_person` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `deviation_and_corrective_action` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_daily_report_items_order`(`daily_report_id` ASC, `sort_order` ASC) USING BTREE,
  INDEX `idx_daily_report_items_project`(`project_id` ASC) USING BTREE,
  INDEX `idx_daily_report_items_source_task`(`source_plan_task_key` ASC, `daily_report_id` ASC) USING BTREE,
  INDEX `idx_daily_report_items_execution_status`(`execution_status` ASC) USING BTREE,
  CONSTRAINT `fk_daily_report_items_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_daily_report_items_report` FOREIGN KEY (`daily_report_id`) REFERENCES `daily_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of daily_report_items
-- ----------------------------

-- ----------------------------
-- Table structure for daily_report_plans
-- ----------------------------
DROP TABLE IF EXISTS `daily_report_plans`;
CREATE TABLE `daily_report_plans`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `daily_report_id` bigint UNSIGNED NOT NULL,
  `sort_order` smallint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NULL DEFAULT NULL COMMENT '鍏宠仈椤圭洰ID',
  `planned_work_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `responsible_person` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `planned_complete_at` time NULL DEFAULT NULL,
  `collaborating_center` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `collaboration_item` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_daily_report_plans_order`(`daily_report_id` ASC, `sort_order` ASC) USING BTREE,
  INDEX `idx_daily_report_plans_project`(`project_id` ASC) USING BTREE,
  CONSTRAINT `fk_daily_report_plans_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_daily_report_plans_report` FOREIGN KEY (`daily_report_id`) REFERENCES `daily_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of daily_report_plans
-- ----------------------------

-- ----------------------------
-- Table structure for daily_reports
-- ----------------------------
DROP TABLE IF EXISTS `daily_reports`;
CREATE TABLE `daily_reports`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `report_date` date NOT NULL,
  `project_id` bigint UNSIGNED NOT NULL,
  `status` enum('draft','submitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `submitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_daily_reports_user_date_project`(`user_id` ASC, `report_date` ASC, `project_id` ASC) USING BTREE,
  INDEX `fk_daily_reports_submitted_by`(`submitted_by_user_id` ASC) USING BTREE,
  INDEX `idx_daily_reports_date_status_user`(`report_date` ASC, `status` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_daily_reports_project_date_status`(`project_id` ASC, `report_date` ASC, `status` ASC) USING BTREE,
  INDEX `idx_daily_reports_submitted_at`(`submitted_at` ASC) USING BTREE,
  CONSTRAINT `fk_daily_reports_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_daily_reports_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_daily_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of daily_reports
-- ----------------------------

-- ----------------------------
-- Table structure for project_initiation_review_nodes
-- ----------------------------
DROP TABLE IF EXISTS `project_initiation_review_nodes`;
CREATE TABLE `project_initiation_review_nodes`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `stage_document_id` bigint UNSIGNED NOT NULL,
  `node_key` enum('business_review','technical_review','general_review') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `node_status` enum('waiting_document_submission','pending','approved','returned_blocked_by_rework','waiting_prerequisite','invalidated') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviewer_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `reviewer_role` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviewer_department` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `comment` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `return_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `submitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `reviewed_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `reviewed_at` datetime NULL DEFAULT NULL,
  `invalidated_at` datetime NULL DEFAULT NULL,
  `invalidated_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_project_initiation_review_nodes_document_node`(`stage_document_id` ASC, `node_key` ASC) USING BTREE,
  INDEX `idx_project_initiation_review_nodes_project_status`(`project_id` ASC, `node_status` ASC) USING BTREE,
  INDEX `idx_project_initiation_review_nodes_reviewer`(`reviewer_role` ASC, `reviewer_department` ASC, `node_status` ASC) USING BTREE,
  INDEX `idx_project_initiation_review_nodes_reviewer_user`(`reviewer_user_id` ASC) USING BTREE,
  INDEX `idx_project_initiation_review_nodes_reviewed_by`(`reviewed_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_project_initiation_review_nodes_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_project_initiation_review_nodes_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_project_initiation_review_nodes_reviewer_user` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_project_initiation_review_nodes_stage_document` FOREIGN KEY (`stage_document_id`) REFERENCES `project_stage_documents` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_initiation_review_nodes
-- ----------------------------

-- ----------------------------
-- Table structure for project_solution_design_analysis_forms
-- ----------------------------
DROP TABLE IF EXISTS `project_solution_design_analysis_forms`;
CREATE TABLE `project_solution_design_analysis_forms`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `node_key` enum('solution_analysis') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'solution_analysis',
  `revision` int UNSIGNED NOT NULL DEFAULT 1,
  `form_status` enum('draft','submitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `form_data_json` json NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `submitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `generated_file_status` enum('not_started','generating','generated','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_started',
  `generated_file_storage_key` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_file_mime_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_file_size` bigint UNSIGNED NULL DEFAULT NULL,
  `generated_file_template_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_at` datetime NULL DEFAULT NULL,
  `generated_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `generation_error_message` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_by_user_id` bigint UNSIGNED NOT NULL,
  `updated_by_user_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_solution_design_analysis_forms_project_revision`(`project_id` ASC, `revision` ASC) USING BTREE,
  INDEX `idx_solution_design_analysis_forms_current`(`project_id` ASC, `is_current` ASC) USING BTREE,
  INDEX `idx_solution_design_analysis_forms_project_status`(`project_id` ASC, `form_status` ASC, `generated_file_status` ASC) USING BTREE,
  INDEX `idx_solution_design_analysis_forms_submitted_by`(`submitted_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_analysis_forms_created_by`(`created_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_analysis_forms_updated_by`(`updated_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_analysis_forms_generated_by`(`generated_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_solution_design_analysis_forms_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_analysis_forms_generated_by` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_analysis_forms_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_analysis_forms_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_analysis_forms_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_solution_design_analysis_forms
-- ----------------------------

-- ----------------------------
-- Table structure for project_solution_design_nodes
-- ----------------------------
DROP TABLE IF EXISTS `project_solution_design_nodes`;
CREATE TABLE `project_solution_design_nodes`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `node_key` enum('solution_preparation','solution_analysis','solution_design','internal_solution_review','customer_solution_review','rd_cost_estimation','manufacturing_cost_estimation','marketing_cost_estimation','finance_cost_estimation','quotation_or_tender') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `node_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `node_order` tinyint UNSIGNED NOT NULL,
  `status` enum('not_started','pending','pending_review','pending_general_review','returned','approved','skipped','ended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_started',
  `return_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `current_revision` int UNSIGNED NOT NULL DEFAULT 1,
  `activated_at` datetime NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `approved_at` datetime NULL DEFAULT NULL,
  `returned_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_solution_design_nodes_project_node`(`project_id` ASC, `node_key` ASC) USING BTREE,
  UNIQUE INDEX `uk_solution_design_nodes_project_order`(`project_id` ASC, `node_order` ASC) USING BTREE,
  INDEX `idx_solution_design_nodes_project_status`(`project_id` ASC, `status` ASC, `node_order` ASC) USING BTREE,
  CONSTRAINT `fk_solution_design_nodes_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_solution_design_nodes
-- ----------------------------

-- ----------------------------
-- Table structure for project_solution_design_quotation_forms
-- ----------------------------
DROP TABLE IF EXISTS `project_solution_design_quotation_forms`;
CREATE TABLE `project_solution_design_quotation_forms`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `node_key` enum('quotation_or_tender') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'quotation_or_tender',
  `revision` int UNSIGNED NOT NULL DEFAULT 1,
  `form_status` enum('draft','submitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `form_data_json` json NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `submitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `generated_file_status` enum('not_started','generating','generated','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_started',
  `generated_file_storage_key` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_file_mime_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_file_size` bigint UNSIGNED NULL DEFAULT NULL,
  `generated_file_template_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_at` datetime NULL DEFAULT NULL,
  `generated_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `generation_error_message` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_by_user_id` bigint UNSIGNED NOT NULL,
  `updated_by_user_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_solution_design_quotation_forms_project_revision`(`project_id` ASC, `revision` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_forms_current`(`project_id` ASC, `is_current` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_forms_project_status`(`project_id` ASC, `form_status` ASC, `generated_file_status` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_forms_submitted_by`(`submitted_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_forms_generated_by`(`generated_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_forms_created_by`(`created_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_forms_updated_by`(`updated_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_solution_design_quotation_forms_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_quotation_forms_generated_by` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_quotation_forms_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_quotation_forms_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_quotation_forms_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_solution_design_quotation_forms
-- ----------------------------

-- ----------------------------
-- Table structure for project_solution_design_quotation_tender_flows
-- ----------------------------
DROP TABLE IF EXISTS `project_solution_design_quotation_tender_flows`;
CREATE TABLE `project_solution_design_quotation_tender_flows`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `branch_type` enum('quotation','tender') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_status` enum('selected','submitted','pending_review','approved','returned','accepted','rejected','ended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'selected',
  `selected_by_user_id` bigint UNSIGNED NOT NULL,
  `selected_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `quotation_result` enum('accepted','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `quotation_rejected_action` enum('return_to_rd_cost','end_project') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `return_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `revision` int UNSIGNED NOT NULL DEFAULT 1,
  `created_by_user_id` bigint UNSIGNED NOT NULL,
  `updated_by_user_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_solution_design_quotation_tender_project`(`project_id` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_tender_branch`(`project_id` ASC, `branch_type` ASC, `branch_status` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_tender_selected_by`(`selected_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_tender_created_by`(`created_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_quotation_tender_updated_by`(`updated_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_solution_design_quotation_tender_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_quotation_tender_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_quotation_tender_selected_by` FOREIGN KEY (`selected_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_quotation_tender_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_solution_design_quotation_tender_flows
-- ----------------------------

-- ----------------------------
-- Table structure for project_solution_design_review_forms
-- ----------------------------
DROP TABLE IF EXISTS `project_solution_design_review_forms`;
CREATE TABLE `project_solution_design_review_forms`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `node_key` enum('internal_solution_review','customer_solution_review') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `review_type` enum('internal','customer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `revision` int UNSIGNED NOT NULL DEFAULT 1,
  `form_status` enum('draft','submitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `form_data_json` json NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `submitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `generated_file_status` enum('not_started','generating','generated','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_started',
  `generated_file_storage_key` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_file_mime_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_file_size` bigint UNSIGNED NULL DEFAULT NULL,
  `generated_file_template_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `generated_at` datetime NULL DEFAULT NULL,
  `generated_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `generation_error_message` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_by_user_id` bigint UNSIGNED NOT NULL,
  `updated_by_user_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_solution_design_review_forms_project_node_revision`(`project_id` ASC, `node_key` ASC, `revision` ASC) USING BTREE,
  INDEX `idx_solution_design_review_forms_current`(`project_id` ASC, `node_key` ASC, `is_current` ASC) USING BTREE,
  INDEX `idx_solution_design_review_forms_project_status`(`project_id` ASC, `node_key` ASC, `form_status` ASC, `generated_file_status` ASC) USING BTREE,
  INDEX `idx_solution_design_review_forms_submitted_by`(`submitted_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_review_forms_created_by`(`created_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_review_forms_updated_by`(`updated_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_review_forms_generated_by`(`generated_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_solution_design_review_forms_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_review_forms_generated_by` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_review_forms_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_review_forms_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_review_forms_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_solution_design_review_forms
-- ----------------------------

-- ----------------------------
-- Table structure for project_solution_design_role_history
-- ----------------------------
DROP TABLE IF EXISTS `project_solution_design_role_history`;
CREATE TABLE `project_solution_design_role_history`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `role_key` enum('project_manager','technical_owner','business_owner','procurement_owner','finance_accountant','finance_owner') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `to_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `changed_by_user_id` bigint UNSIGNED NOT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_solution_design_role_history_project_role`(`project_id` ASC, `role_key` ASC, `changed_at` ASC) USING BTREE,
  INDEX `idx_solution_design_role_history_from_user`(`from_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_role_history_to_user`(`to_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_role_history_changed_by`(`changed_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_solution_design_role_history_changed_by` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_role_history_from_user` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_role_history_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_role_history_to_user` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_solution_design_role_history
-- ----------------------------

-- ----------------------------
-- Table structure for project_solution_design_roles
-- ----------------------------
DROP TABLE IF EXISTS `project_solution_design_roles`;
CREATE TABLE `project_solution_design_roles`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `technical_owner_user_id` bigint UNSIGNED NOT NULL,
  `business_owner_user_id` bigint UNSIGNED NOT NULL,
  `procurement_owner_user_id` bigint UNSIGNED NOT NULL,
  `finance_accountant_user_id` bigint UNSIGNED NOT NULL,
  `finance_owner_user_id` bigint UNSIGNED NOT NULL,
  `assigned_by_user_id` bigint UNSIGNED NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_solution_design_roles_project`(`project_id` ASC) USING BTREE,
  INDEX `idx_solution_design_roles_technical_owner`(`technical_owner_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_roles_business_owner`(`business_owner_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_roles_procurement_owner`(`procurement_owner_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_roles_finance_accountant`(`finance_accountant_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_roles_finance_owner`(`finance_owner_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_roles_assigned_by`(`assigned_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_roles_updated_by`(`updated_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_solution_design_roles_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_roles_business_owner` FOREIGN KEY (`business_owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_roles_finance_accountant` FOREIGN KEY (`finance_accountant_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_roles_finance_owner` FOREIGN KEY (`finance_owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_roles_procurement_owner` FOREIGN KEY (`procurement_owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_roles_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_roles_technical_owner` FOREIGN KEY (`technical_owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_roles_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_solution_design_roles
-- ----------------------------

-- ----------------------------
-- Table structure for project_solution_design_upload_files
-- ----------------------------
DROP TABLE IF EXISTS `project_solution_design_upload_files`;
CREATE TABLE `project_solution_design_upload_files`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `slot_id` bigint UNSIGNED NOT NULL,
  `slot_key` enum('solution_work_plan','product_function_diagram','process_timing_diagram','cycle_time_table','layout_diagram','three_d_model','demo_animation','electrical_function_diagram','software_function_diagram','solution_ppt','rd_cost_estimation_file','manufacturing_cost_estimation_file','marketing_cost_estimation_file','finance_cost_estimation_file','quotation_file','tender_business_file','tender_technical_file') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `revision` int UNSIGNED NOT NULL DEFAULT 1,
  `original_file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint UNSIGNED NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `uploaded_by_user_id` bigint UNSIGNED NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `replaced_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_solution_design_upload_files_storage_key`(`storage_key` ASC) USING BTREE,
  INDEX `idx_solution_design_upload_files_project_slot`(`project_id` ASC, `slot_key` ASC, `revision` ASC, `is_current` ASC) USING BTREE,
  INDEX `idx_solution_design_upload_files_slot_current`(`slot_id` ASC, `is_current` ASC, `uploaded_at` ASC) USING BTREE,
  INDEX `idx_solution_design_upload_files_uploaded_by`(`uploaded_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_solution_design_upload_files_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_upload_files_slot` FOREIGN KEY (`slot_id`) REFERENCES `project_solution_design_upload_slots` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_upload_files_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_solution_design_upload_files
-- ----------------------------

-- ----------------------------
-- Table structure for project_solution_design_upload_slots
-- ----------------------------
DROP TABLE IF EXISTS `project_solution_design_upload_slots`;
CREATE TABLE `project_solution_design_upload_slots`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `node_key` enum('solution_preparation','solution_analysis','solution_design','internal_solution_review','customer_solution_review','rd_cost_estimation','manufacturing_cost_estimation','marketing_cost_estimation','finance_cost_estimation','quotation_or_tender') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slot_key` enum('solution_work_plan','product_function_diagram','process_timing_diagram','cycle_time_table','layout_diagram','three_d_model','demo_animation','electrical_function_diagram','software_function_diagram','solution_ppt','rd_cost_estimation_file','manufacturing_cost_estimation_file','marketing_cost_estimation_file','finance_cost_estimation_file','quotation_file','tender_business_file','tender_technical_file') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slot_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slot_order` tinyint UNSIGNED NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `revision` int UNSIGNED NOT NULL DEFAULT 1,
  `status` enum('pending','uploaded','submitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `is_upload_exempted` tinyint(1) NOT NULL DEFAULT 0,
  `exemption_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `exempted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `exempted_at` datetime NULL DEFAULT NULL,
  `submitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_solution_design_upload_slots_project_slot`(`project_id` ASC, `slot_key` ASC) USING BTREE,
  INDEX `idx_solution_design_upload_slots_project_node`(`project_id` ASC, `node_key` ASC, `slot_order` ASC) USING BTREE,
  INDEX `idx_solution_design_upload_slots_submitted_by`(`submitted_by_user_id` ASC) USING BTREE,
  INDEX `idx_solution_design_upload_slots_exempted_by`(`exempted_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_solution_design_upload_slots_exempted_by` FOREIGN KEY (`exempted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_upload_slots_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_solution_design_upload_slots_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_solution_design_upload_slots
-- ----------------------------

-- ----------------------------
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_stage_approval_history
-- ----------------------------

-- ----------------------------
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_stage_document_attachments
-- ----------------------------

-- ----------------------------
-- Table structure for project_stage_document_form_images
-- ----------------------------
DROP TABLE IF EXISTS `project_stage_document_form_images`;
CREATE TABLE `project_stage_document_form_images`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `stage_document_id` bigint UNSIGNED NOT NULL,
  `field_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint UNSIGNED NOT NULL,
  `content_sha256` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `uploaded_by_user_id` bigint UNSIGNED NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `deleted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_stage_document_form_images_storage_key`(`storage_key` ASC) USING BTREE,
  INDEX `idx_stage_document_form_images_document_field`(`project_id` ASC, `stage_document_id` ASC, `field_key` ASC, `deleted_at` ASC, `uploaded_at` DESC, `id` DESC) USING BTREE,
  INDEX `idx_stage_document_form_images_uploaded_by`(`uploaded_by_user_id` ASC) USING BTREE,
  INDEX `idx_stage_document_form_images_deleted_by`(`deleted_by_user_id` ASC) USING BTREE,
  INDEX `fk_stage_document_form_images_stage_document`(`stage_document_id` ASC) USING BTREE,
  CONSTRAINT `fk_stage_document_form_images_deleted_by` FOREIGN KEY (`deleted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_stage_document_form_images_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_stage_document_form_images_stage_document` FOREIGN KEY (`stage_document_id`) REFERENCES `project_stage_documents` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_stage_document_form_images_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_stage_document_form_images
-- ----------------------------

-- ----------------------------
-- Table structure for project_stage_document_forms
-- ----------------------------
DROP TABLE IF EXISTS `project_stage_document_forms`;
CREATE TABLE `project_stage_document_forms`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `stage_document_id` bigint UNSIGNED NOT NULL,
  `form_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_schema_json` json NOT NULL,
  `form_data_json` json NULL,
  `status` enum('draft','submitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `draft_saved_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `draft_saved_at` datetime NULL DEFAULT NULL,
  `submitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_project_stage_document_forms_document`(`stage_document_id` ASC) USING BTREE,
  INDEX `idx_project_stage_document_forms_project`(`project_id` ASC) USING BTREE,
  INDEX `idx_project_stage_document_forms_status`(`status` ASC) USING BTREE,
  INDEX `idx_project_stage_document_forms_saved_by`(`draft_saved_by_user_id` ASC) USING BTREE,
  INDEX `idx_project_stage_document_forms_submitted_by`(`submitted_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_project_stage_document_forms_document` FOREIGN KEY (`stage_document_id`) REFERENCES `project_stage_documents` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_project_stage_document_forms_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_project_stage_document_forms_saved_by` FOREIGN KEY (`draft_saved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_project_stage_document_forms_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_stage_document_forms
-- ----------------------------

-- ----------------------------
-- Table structure for project_stage_document_generated_files
-- ----------------------------
DROP TABLE IF EXISTS `project_stage_document_generated_files`;
CREATE TABLE `project_stage_document_generated_files`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `stage_document_id` bigint UNSIGNED NOT NULL,
  `online_form_id` bigint UNSIGNED NULL DEFAULT NULL,
  `document_code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_key` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` enum('xlsx','docx') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` int UNSIGNED NOT NULL,
  `status` enum('pending','generating','generated','failed','superseded') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `mime_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `file_size` bigint UNSIGNED NULL DEFAULT NULL,
  `generated_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `generated_at` datetime NULL DEFAULT NULL,
  `failure_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `source_form_submitted_at` datetime NULL DEFAULT NULL,
  `source_form_data_hash` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `source_snapshot_json` json NULL,
  `trigger_event` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `review_snapshot_json` json NULL,
  `template_version` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `template_hash` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_stage_document_generated_files_project_document`(`project_id` ASC, `stage_document_id` ASC, `status` ASC, `version` ASC) USING BTREE,
  INDEX `idx_stage_document_generated_files_document_code`(`document_code` ASC) USING BTREE,
  INDEX `idx_stage_document_generated_files_template`(`template_key` ASC, `status` ASC) USING BTREE,
  INDEX `idx_stage_document_generated_files_generated_by`(`generated_by_user_id` ASC) USING BTREE,
  INDEX `fk_stage_document_generated_files_stage_document`(`stage_document_id` ASC) USING BTREE,
  CONSTRAINT `fk_stage_document_generated_files_generated_by` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_stage_document_generated_files_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_stage_document_generated_files_stage_document` FOREIGN KEY (`stage_document_id`) REFERENCES `project_stage_documents` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_stage_document_generated_files
-- ----------------------------

-- ----------------------------
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
  `completion_mode` enum('submit_only','approval_required','conditional_submit','conditional_approval') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'approval_required',
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
  `revision_required` tinyint(1) NOT NULL DEFAULT 0,
  `revision_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `revision_source_document_id` bigint UNSIGNED NULL DEFAULT NULL,
  `revision_requested_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `revision_requested_at` datetime NULL DEFAULT NULL,
  `revision_resubmitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `revision_resubmitted_at` datetime NULL DEFAULT NULL,
  `revision_completed_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `revision_completed_at` datetime NULL DEFAULT NULL,
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_stage_documents
-- ----------------------------

-- ----------------------------
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_stages
-- ----------------------------

-- ----------------------------
-- Table structure for projects
-- ----------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `project_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_contact_person` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `customer_contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `project_mode` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `project_manager` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `project_manager_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `business_responsible_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `technical_responsible_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `participating_departments` json NULL,
  `status` enum('normal','risk','paused','delayed','completed','ended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `ended_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ended_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `ended_at` datetime NULL DEFAULT NULL,
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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of projects
-- ----------------------------

-- ----------------------------
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
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of report_weekly_rest_mode_anchors
INSERT INTO `report_weekly_rest_mode_anchors` VALUES (1, '2026-07-13', 'double_rest', 25, 25, '2026-07-13 12:38:28', '2026-07-13 12:38:28');
-- ----------------------------

-- ----------------------------
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
  `completion_mode` enum('submit_only','approval_required','conditional_submit','conditional_approval') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'approval_required',
  `submit_mode` enum('online_form','file_upload','mixed','tbd') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_folder_path` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_folder_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_stage_document_templates_version_code`(`template_version` ASC, `document_code` ASC) USING BTREE,
  INDEX `idx_stage_document_templates_stage`(`template_version` ASC, `stage_order` ASC, `document_order` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1081 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of stage_document_templates
INSERT INTO `stage_document_templates` VALUES (946, 'v20260625', 1, 'initiation', '立项阶段', '1.1', 1, '项目需求表', 1, '研发中心填写，营销组织调研', '营销组织调研，研发填写生成', 'rd_center', 'marketing_center', 'submit_only', 'file_upload', '1-立项/1.1 项目需求表', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (947, 'v20260625', 1, 'initiation', '立项阶段', '1.2', 2, '项目立项审批表', 1, '营销人员', '商务评价、技术评价、总经理审批', 'marketing_center', NULL, 'approval_required', 'file_upload', '1-立项/1.2 项目立项审批表', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (948, 'v20260625', 1, 'initiation', '立项阶段', '1.3', 3, '项目立项通知', 1, '营销总监', '营销中心', 'marketing_center', 'marketing_center', 'submit_only', 'file_upload', '1-立项/1.3 项目立项通知', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (949, 'v20260625', 2, 'solution', '方案设计阶段', '2.1', 1, '方案设计工作计划', 1, '项目经理', '项目经理确认', 'rd_center', NULL, 'submit_only', 'file_upload', '2-方案设计/2.1 方案设计工作计划', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (950, 'v20260625', 2, 'solution', '方案设计阶段', '2.2', 2, '项目方案分析表', 1, '技术负责人', '项目经理确认', 'rd_center', NULL, 'approval_required', 'file_upload', '2-方案设计/2.2 项目方案分析表', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (951, 'v20260625', 2, 'solution', '方案设计阶段', '2.3', 3, '产品功能框图', 1, '技术负责人', '技术负责人确认', 'rd_center', 'rd_center', 'approval_required', 'file_upload', '2-方案设计/2.3 产品功能框图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (952, 'v20260625', 2, 'solution', '方案设计阶段', '2.4', 4, '3D模型', 1, '机械/方案设计人员', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '2-方案设计/2.4 3D模型', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (953, 'v20260625', 2, 'solution', '方案设计阶段', '2.5', 5, '布局图', 1, '机械/方案设计人员', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '2-方案设计/2.5 布局图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (954, 'v20260625', 2, 'solution', '方案设计阶段', '2.6', 6, '工艺时序图', 0, '技术负责人/工艺负责人', '技术负责人确认', 'rd_center', 'rd_center', 'conditional_submit', 'file_upload', '2-方案设计/2.6 工艺时序图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (955, 'v20260625', 2, 'solution', '方案设计阶段', '2.7', 7, '节拍表', 0, '技术负责人/工艺负责人', '技术负责人确认', 'rd_center', 'rd_center', 'conditional_submit', 'file_upload', '2-方案设计/2.7 节拍表', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (956, 'v20260625', 2, 'solution', '方案设计阶段', '2.8', 8, '演示动画', 0, '机械/方案设计人员', '项目经理确认', 'rd_center', NULL, 'conditional_submit', 'file_upload', '2-方案设计/2.8 演示动画', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (957, 'v20260625', 2, 'solution', '方案设计阶段', '2.9', 9, '电气功能框图', 1, '电气工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '2-方案设计/2.9 电气功能框图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (958, 'v20260625', 2, 'solution', '方案设计阶段', '2.10', 10, '软件功能框图', 1, '软件工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '2-方案设计/2.10 软件功能框图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (959, 'v20260625', 2, 'solution', '方案设计阶段', '2.11', 11, '项目方案PPT', 1, '技术负责人', '项目经理确认', 'rd_center', NULL, 'submit_only', 'file_upload', '2-方案设计/2.11 项目方案PPT', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (960, 'v20260625', 2, 'solution', '方案设计阶段', '2.12', 12, '方案评审记录表（内部方案评审）', 1, '技术负责人', '项目经理组织并确认', 'rd_center', NULL, 'approval_required', 'file_upload', '2-方案设计/2.12 方案评审记录表（内部方案评审）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (961, 'v20260625', 2, 'solution', '方案设计阶段', '2.13', 13, '方案评审记录表（客户方案评审）', 1, '技术负责人', '营销组织，客户和项目经理确认', 'rd_center', 'marketing_center', 'approval_required', 'file_upload', '2-方案设计/2.13 方案评审记录表（客户方案评审）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (962, 'v20260625', 2, 'solution', '方案设计阶段', '2.14', 14, '成本估算表', 1, '研发、制造、运营协作', '研发、制造、运营协作，总经理批准', 'rd_center', 'operations_center', 'approval_required', 'mixed', '2-方案设计/2.14 成本估算表', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (963, 'v20260625', 2, 'solution', '方案设计阶段', '2.15', 15, '报价单', 1, '营销人员', '总经理批准，客户确认', 'marketing_center', NULL, 'approval_required', 'file_upload', '2-方案设计/2.15 报价单', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (964, 'v20260625', 3, 'contract', '合同签订阶段', '3.1', 1, '技术协议', 1, '技术负责人', '客户签字盖章，营销组织', 'rd_center', 'marketing_center', 'approval_required', 'file_upload', '3-合同签订/3.1 技术协议', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (965, 'v20260625', 3, 'contract', '合同签订阶段', '3.2', 2, '销售合同', 1, '营销人员', '客户签字盖章', 'marketing_center', NULL, 'approval_required', 'file_upload', '3-合同签订/3.2 销售合同', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (966, 'v20260625', 3, 'contract', '合同签订阶段', '3.3', 3, '合同审核记录表（销售合同）', 1, '合同审核人员', '总经理或运营审核对象待业务确认', 'operations_center', 'operations_center', 'approval_required', 'file_upload', '3-合同签订/3.3 合同审核记录表（销售合同）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (967, 'v20260625', 3, 'contract', '合同签订阶段', '3.4', 4, '发票（预付款）', 0, '财务人员', '财务开票，营销协调客户付款', 'operations_center', 'marketing_center', 'submit_only', 'file_upload', '3-合同签订/3.4 发票（预付款）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (968, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.1', 1, '项目启动书', 1, '制造中心', '制造中心组织项目启动会', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '4-详细设计/4.1 项目启动书', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (969, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.2', 2, '详细设计工作计划', 1, '项目经理', '项目经理确认', 'rd_center', NULL, 'submit_only', 'file_upload', '4-详细设计/4.2 详细设计工作计划', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (970, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.3', 3, '3D模型', 1, '机械工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.3 3D模型', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (971, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.4', 4, '电气原理图', 1, '电气工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.4 电气原理图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (972, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.5', 5, '电气接线图', 1, '电气工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.5 电气接线图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (973, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.6', 6, '电气布置图', 1, '电气工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.6 电气布置图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (974, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.7', 7, '控制逻辑流程图', 1, '软件/自动化工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.7 控制逻辑流程图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (975, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.8', 8, '自动化程序', 1, '软件/自动化工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.8 自动化程序', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (976, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.9', 9, '软件开发说明文档', 1, '软件工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.9 软件开发说明文档', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (977, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.10', 10, 'UI界面设计PPT', 1, '软件/UI人员', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.10 UI界面设计PPT', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (978, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.11', 11, '软件代码', 1, '软件工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.11 软件代码', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (979, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.12', 12, '设计评审记录表（内部设计评审）', 1, '技术负责人', '项目经理组织并确认', 'rd_center', NULL, 'approval_required', 'file_upload', '4-详细设计/4.12 设计评审记录表（内部设计评审）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (980, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.13', 13, '设计评审记录表（客户设计评审）', 1, '技术负责人', '营销组织，客户和项目经理确认', 'rd_center', 'marketing_center', 'approval_required', 'file_upload', '4-详细设计/4.13 设计评审记录表（客户设计评审）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (981, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.14', 14, '产品平面图', 1, '机械工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.14 产品平面图', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (982, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.15', 15, '产品零部件清单', 1, '各专业组成员、技术负责人', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.15 产品零部件清单', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (983, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.16', 16, '图纸审查记录', 1, '图纸审查人员', '项目经理组织，研发负责人或图纸审查人员确认', 'rd_center', 'rd_center', 'approval_required', 'file_upload', '4-详细设计/4.16 图纸审查记录', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (984, 'v20260625', 4, 'detailedDesign', '详细设计阶段', '4.17', 17, '客户会签记录', 1, '营销人员/项目经理', '客户和项目经理确认', 'marketing_center', 'marketing_center', 'approval_required', 'file_upload', '4-详细设计/4.17 客户会签记录', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (985, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.1', 1, '采购申请表', 1, '技术负责人', '制造中心接收，采购审批流程另行建模', 'rd_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.1 采购申请表', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (986, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.2', 2, '比价表', 1, '采购人员', '制造中心确认', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '5-生产制作/5.2 比价表', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (987, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.3', 3, '采购合同', 1, '采购人员', '供应商签署，合同状态流另行建模', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.3 采购合同', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (988, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.4', 4, '采购合同审核记录表', 1, '合同审核人员', '总经理或运营审核对象待业务确认', 'operations_center', 'operations_center', 'approval_required', 'file_upload', '5-生产制作/5.4 采购合同审核记录表', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (989, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.5', 5, '作业指导书', 1, '技术负责人', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '5-生产制作/5.5 作业指导书', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (990, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.6', 6, '产品使用说明书', 1, '技术负责人', '项目经理确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '5-生产制作/5.6 产品使用说明书', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (991, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.7', 7, '产品维护保养手册', 1, '技术负责人', '项目经理确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '5-生产制作/5.7 产品维护保养手册', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (992, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.8', 8, '产品培训PPT', 1, '技术负责人', '项目经理确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '5-生产制作/5.8 产品培训PPT', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (993, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.9', 9, '检验单', 1, '质检人员/制造中心人员', '质检人员或制造中心确认，组织口径待业务确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.9 检验单', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (994, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.10', 10, '入库单', 1, '库管人员', '库管人员编写，制造中心确认', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '5-生产制作/5.10 入库单', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (995, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.11', 11, '领料单', 1, '库管人员', '库管人员编写，制造中心确认', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '5-生产制作/5.11 领料单', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (996, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.12', 12, '安装调试记录（厂内）', 1, '制造中心人员', '制造中心确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.12 安装调试记录（厂内）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (997, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.13', 13, '3D模型（设计变更）', 0, '设计变更人员', '项目经理确认对象待业务确认', 'rd_center', 'rd_center', 'conditional_submit', 'file_upload', '5-生产制作/5.13 3D模型（设计变更）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (998, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.14', 14, '产品平面图（设计变更）', 0, '设计变更人员', '项目经理确认对象待业务确认', 'rd_center', 'rd_center', 'conditional_submit', 'file_upload', '5-生产制作/5.14 产品平面图（设计变更）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (999, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.15', 15, '零部件清单（设计变更）', 0, '设计变更人员', '制造中心接收变更资料', 'rd_center', 'manufacturing_center', 'conditional_submit', 'file_upload', '5-生产制作/5.15 零部件清单（设计变更）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1000, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.16', 16, '技术通知单（设计变更）', 0, '设计变更人员', '制造中心接收技术通知', 'rd_center', 'manufacturing_center', 'conditional_submit', 'file_upload', '5-生产制作/5.16 技术通知单（设计变更）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1001, 'v20260625', 5, 'manufacturing', '生产制作阶段', '5.17', 17, '自验收报告', 1, '制造中心人员', '制造中心确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.17 自验收报告', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1002, 'v20260625', 6, 'preAcceptance', '预验收阶段', '6.1', 1, '预验收单', 1, '制造中心人员', '营销组织客户预验收，客户和项目经理确认', 'manufacturing_center', 'marketing_center', 'approval_required', 'file_upload', '6-预验收/6.1 预验收单', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1003, 'v20260625', 6, 'preAcceptance', '预验收阶段', '6.2', 2, '发票（发货款）', 0, '财务人员', '财务开票，营销协调客户付款', 'operations_center', 'marketing_center', 'submit_only', 'file_upload', '6-预验收/6.2 发票（发货款）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1004, 'v20260625', 7, 'finalAcceptance', '终验收阶段', '7.1', 1, '发货单', 1, '制造中心人员', '制造中心确认', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '7-终验收/7.1 发货单', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1005, 'v20260625', 7, 'finalAcceptance', '终验收阶段', '7.2', 2, '安装调试记录（现场）', 1, '制造中心人员', '客户确认对象待业务确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '7-终验收/7.2 安装调试记录（现场）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1006, 'v20260625', 7, 'finalAcceptance', '终验收阶段', '7.3', 3, '终验收单', 1, '制造中心人员', '营销组织客户终验收，客户和项目经理确认', 'manufacturing_center', 'marketing_center', 'approval_required', 'file_upload', '7-终验收/7.3 终验收单', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1007, 'v20260625', 7, 'finalAcceptance', '终验收阶段', '7.4', 4, '培训记录表', 1, '培训主讲人员', '客户和项目经理确认', 'marketing_center', 'marketing_center', 'approval_required', 'file_upload', '7-终验收/7.4 培训记录表', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1008, 'v20260625', 8, 'closeout', '结题阶段', '8.1', 1, '发票（尾款）', 0, '财务人员', '财务开票，营销协调客户付款', 'operations_center', 'marketing_center', 'submit_only', 'file_upload', '8-结题/8.1 发票（尾款）', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1009, 'v20260625', 8, 'closeout', '结题阶段', '8.2', 2, '项目结题报告', 1, '项目经理', '项目经理编写，总经理或相关负责人确认', NULL, NULL, 'submit_only', 'file_upload', '8-结题/8.2 项目结题报告', NULL, 0, '2026-06-30 16:33:25', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1010, 'v20260629', 1, 'initiation', '立项阶段', '1.1', 1, '项目需求表', 1, '营销中心组织，研发中心填写', '营销组织调研，研发填写生成', 'rd_center', 'marketing_center', 'submit_only', 'online_form', '1-立项/1.1 项目需求表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1011, 'v20260629', 1, 'initiation', '立项阶段', '1.2', 2, '项目立项审批表', 1, '营销中心、研发中心、总经理', '商务评价、技术评价、总经理审批', 'marketing_center', NULL, 'approval_required', 'online_form', '1-立项/1.2 项目立项审批表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1012, 'v20260629', 1, 'initiation', '立项阶段', '1.3', 3, '项目立项通知', 1, '营销中心负责人', '营销中心', 'marketing_center', 'marketing_center', 'submit_only', 'online_form', '1-立项/1.3 项目立项通知', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1013, 'v20260629', 2, 'solution', '方案设计阶段', '2.1', 1, '方案设计工作计划', 1, '项目经理', '项目经理确认', 'rd_center', NULL, 'submit_only', 'file_upload', '2-方案设计/2.1 方案设计工作计划', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1014, 'v20260629', 2, 'solution', '方案设计阶段', '2.2', 2, '项目方案分析表', 1, '技术负责人', '项目经理确认', 'rd_center', NULL, 'approval_required', 'file_upload', '2-方案设计/2.2 项目方案分析表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1015, 'v20260629', 2, 'solution', '方案设计阶段', '2.3', 3, '产品功能框图', 1, '技术负责人', '技术负责人确认', 'rd_center', 'rd_center', 'approval_required', 'file_upload', '2-方案设计/2.3 产品功能框图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1016, 'v20260629', 2, 'solution', '方案设计阶段', '2.4', 4, '3D模型（方案设计）', 1, '机械/方案设计人员', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '2-方案设计/2.4 3D模型（方案设计）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1017, 'v20260629', 2, 'solution', '方案设计阶段', '2.5', 5, '布局图', 1, '机械/方案设计人员', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '2-方案设计/2.5 布局图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1018, 'v20260629', 2, 'solution', '方案设计阶段', '2.6', 6, '工艺时序图', 0, '技术负责人/工艺负责人', '技术负责人确认', 'rd_center', 'rd_center', 'conditional_submit', 'file_upload', '2-方案设计/2.6 工艺时序图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1019, 'v20260629', 2, 'solution', '方案设计阶段', '2.7', 7, '节拍表', 0, '技术负责人/工艺负责人', '技术负责人确认', 'rd_center', 'rd_center', 'conditional_submit', 'file_upload', '2-方案设计/2.7 节拍表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1020, 'v20260629', 2, 'solution', '方案设计阶段', '2.8', 8, '演示动画', 0, '机械/方案设计人员', '项目经理确认', 'rd_center', NULL, 'conditional_submit', 'file_upload', '2-方案设计/2.8 演示动画', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1021, 'v20260629', 2, 'solution', '方案设计阶段', '2.9', 9, '电气功能框图', 1, '电气工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '2-方案设计/2.9 电气功能框图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1022, 'v20260629', 2, 'solution', '方案设计阶段', '2.10', 10, '软件功能框图', 1, '软件工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '2-方案设计/2.10 软件功能框图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1023, 'v20260629', 2, 'solution', '方案设计阶段', '2.11', 11, '项目方案PPT', 1, '技术负责人', '项目经理确认', 'rd_center', NULL, 'submit_only', 'file_upload', '2-方案设计/2.11 项目方案PPT', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1024, 'v20260629', 2, 'solution', '方案设计阶段', '2.12', 12, '方案评审记录表（内部方案评审）', 1, '项目经理组织，研发中心记录', '项目经理组织并确认', 'rd_center', NULL, 'approval_required', 'file_upload', '2-方案设计/2.12 方案评审记录表（内部方案评审）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1025, 'v20260629', 2, 'solution', '方案设计阶段', '2.13', 13, '方案评审记录表（客户方案评审）', 1, '营销中心组织，研发中心记录', '营销组织，客户和项目经理确认', 'rd_center', 'marketing_center', 'approval_required', 'file_upload', '2-方案设计/2.13 方案评审记录表（客户方案评审）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1026, 'v20260629', 2, 'solution', '方案设计阶段', '2.14', 14, '成本估算表', 1, '研发、制造、运营、总经理', '研发、制造、运营协作，总经理批准', 'rd_center', 'operations_center', 'approval_required', 'file_upload', '2-方案设计/2.14 成本估算表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1027, 'v20260629', 2, 'solution', '方案设计阶段', '2.15', 15, '报价单', 1, '营销中心', '总经理批准，客户确认', 'marketing_center', NULL, 'approval_required', 'file_upload', '2-方案设计/2.15 报价单', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1028, 'v20260629', 2, 'solution', '方案设计阶段', 'C19', 16, '投标书', 0, '营销中心、研发中心、总经理', 'rd_center确认', 'marketing_center', 'rd_center', 'approval_required', 'file_upload', '2-方案设计/C19 投标书', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1029, 'v20260629', 3, 'contract', '合同签订阶段', 'C20', 1, '技术协议草稿（合同签订阶段）', 1, '研发中心', '研发中心', 'rd_center', NULL, 'approval_required', 'file_upload', '3-合同签订/C20 技术协议草稿（合同签订阶段）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1030, 'v20260629', 3, 'contract', '合同签订阶段', '3.1', 2, '技术协议（客户侧成品）', 1, '营销中心组织，研发中心配合', '客户签字盖章，营销组织', 'rd_center', 'marketing_center', 'approval_required', 'file_upload', '3-合同签订/3.1 技术协议（客户侧成品）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1031, 'v20260629', 3, 'contract', '合同签订阶段', 'C22', 3, '销售合同草稿', 1, '营销、研发、制造、运营/财务/法务、总经理', 'operations_center确认', 'marketing_center', 'operations_center', 'approval_required', 'file_upload', '3-合同签订/C22 销售合同草稿', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1032, 'v20260629', 3, 'contract', '合同签订阶段', '3.2', 4, '销售合同（客户侧成品）', 1, '营销中心', '客户签字盖章', 'marketing_center', NULL, 'approval_required', 'file_upload', '3-合同签订/3.2 销售合同（客户侧成品）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1033, 'v20260629', 3, 'contract', '合同签订阶段', '3.4', 5, '发票（预付款）', 0, '运营/财务，营销协调', '财务开票，营销协调客户付款', 'operations_center', 'marketing_center', 'submit_only', 'file_upload', '3-合同签订/3.4 发票（预付款）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1034, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.1', 1, '项目启动书', 1, '制造中心', '制造中心组织项目启动会', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '4-详细设计/4.1 项目启动书', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1035, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.2', 2, '详细设计工作计划', 1, '项目经理', '项目经理确认', 'rd_center', NULL, 'submit_only', 'file_upload', '4-详细设计/4.2 详细设计工作计划', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1036, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.3', 3, '3D模型（详细设计）', 1, '机械工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.3 3D模型（详细设计）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1037, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.4', 4, '电气原理图', 1, '电气工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.4 电气原理图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1038, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.5', 5, '电气接线图', 1, '电气工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.5 电气接线图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1039, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.6', 6, '电气布置图', 1, '电气工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.6 电气布置图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1040, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.7', 7, '控制逻辑流程图', 1, '软件/自动化工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.7 控制逻辑流程图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1041, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.8', 8, '自动化程序', 1, '软件/自动化工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.8 自动化程序', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1042, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.9', 9, '软件开发说明文档', 1, '软件工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.9 软件开发说明文档', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1043, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.10', 10, 'UI界面设计PPT', 1, '软件/UI 人员', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.10 UI界面设计PPT', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1044, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.11', 11, '软件代码', 1, '软件工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.11 软件代码', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1045, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.12', 12, '设计评审记录表（内部设计评审）', 1, '项目经理组织，研发中心记录', '项目经理组织并确认', 'rd_center', NULL, 'approval_required', 'file_upload', '4-详细设计/4.12 设计评审记录表（内部设计评审）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1046, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.13', 13, '设计评审记录表（客户设计评审）', 1, '营销中心组织，研发中心记录', '营销组织，客户和项目经理确认', 'rd_center', 'marketing_center', 'approval_required', 'file_upload', '4-详细设计/4.13 设计评审记录表（客户设计评审）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1047, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.14', 14, '产品平面图', 1, '机械工程师', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.14 产品平面图', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1048, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.15', 15, '产品零部件清单', 1, '各专业组成员、技术负责人', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '4-详细设计/4.15 产品零部件清单', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1049, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.16', 16, '图纸审查记录', 1, '图纸审查人员', '项目经理组织，研发负责人或图纸审查人员确认', 'rd_center', 'rd_center', 'approval_required', 'file_upload', '4-详细设计/4.16 图纸审查记录', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1050, 'v20260629', 4, 'detailedDesign', '详细设计阶段', '4.17', 17, '客户会签记录', 1, '营销人员/项目经理', '客户和项目经理确认', 'marketing_center', 'marketing_center', 'approval_required', 'file_upload', '4-详细设计/4.17 客户会签记录', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1051, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.1', 1, '采购申请表', 1, '研发中心发起，制造中心接收', '制造中心接收，采购审批流程另行建模', 'rd_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.1 采购申请表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1052, 'v20260629', 5, 'manufacturing', '生产制作阶段', 'C43', 2, '合格供应商评价表', 0, '制造中心/采购人员', 'manufacturing_center确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/C43 合格供应商评价表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1053, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.2', 3, '比价表', 1, '制造中心/采购人员', '制造中心确认', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '5-生产制作/5.2 比价表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1054, 'v20260629', 5, 'manufacturing', '生产制作阶段', 'C45', 4, '技术协议草稿（生产制作阶段）', 0, '研发中心/制造中心', 'manufacturing_center确认', 'rd_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/C45 技术协议草稿（生产制作阶段）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1055, 'v20260629', 5, 'manufacturing', '生产制作阶段', 'C46', 5, '技术协议（生产制作阶段/供应商侧成品）', 0, '制造中心/供应商', 'manufacturing_center确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/C46 技术协议（生产制作阶段/供应商侧成品）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1056, 'v20260629', 5, 'manufacturing', '生产制作阶段', 'C47', 6, '采购合同草稿', 1, '制造、运营/财务/法务、总经理', 'operations_center确认', 'manufacturing_center', 'operations_center', 'approval_required', 'file_upload', '5-生产制作/C47 采购合同草稿', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1057, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.3', 7, '采购合同', 1, '制造中心/采购人员', '供应商签署，合同状态流另行建模', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.3 采购合同', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1058, 'v20260629', 5, 'manufacturing', '生产制作阶段', 'C49', 8, '生产记录表', 0, '制造中心/供应商', 'manufacturing_center确认', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '5-生产制作/C49 生产记录表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1059, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.5', 9, '作业指导书', 1, '技术负责人', '技术负责人确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '5-生产制作/5.5 作业指导书', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1060, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.6', 10, '产品使用说明书', 1, '技术负责人', '项目经理确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '5-生产制作/5.6 产品使用说明书', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1061, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.7', 11, '产品维护保养手册', 1, '技术负责人', '项目经理确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '5-生产制作/5.7 产品维护保养手册', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1062, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.8', 12, '产品培训PPT', 1, '技术负责人', '项目经理确认', 'rd_center', 'rd_center', 'submit_only', 'file_upload', '5-生产制作/5.8 产品培训PPT', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1063, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.9', 13, '检验单', 1, '制造/质检中心', '质检人员或制造中心确认，组织口径待业务确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.9 检验单', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1064, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.10', 14, '入库单', 1, '库管人员', '库管人员编写，制造中心确认', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '5-生产制作/5.10 入库单', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1065, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.11', 15, '领料单', 1, '库管人员', '库管人员编写，制造中心确认', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '5-生产制作/5.11 领料单', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1066, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.12', 16, '安装调试记录（厂内）', 1, '制造中心', '制造中心确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.12 安装调试记录（厂内）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1067, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.13', 17, '3D模型（设计变更）', 0, '设计变更人员', '项目经理确认对象待业务确认', 'rd_center', 'rd_center', 'conditional_submit', 'file_upload', '5-生产制作/5.13 3D模型（设计变更）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1068, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.14', 18, '产品平面图（设计变更）', 0, '设计变更人员', '项目经理确认对象待业务确认', 'rd_center', 'rd_center', 'conditional_submit', 'file_upload', '5-生产制作/5.14 产品平面图（设计变更）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1069, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.15', 19, '零部件清单（设计变更）', 0, '设计变更人员', '制造中心接收变更资料', 'rd_center', 'manufacturing_center', 'conditional_submit', 'file_upload', '5-生产制作/5.15 零部件清单（设计变更）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1070, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.16', 20, '技术通知单（设计变更）', 0, '设计变更人员', '制造中心接收技术通知', 'rd_center', 'manufacturing_center', 'conditional_submit', 'file_upload', '5-生产制作/5.16 技术通知单（设计变更）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1071, 'v20260629', 5, 'manufacturing', '生产制作阶段', '5.17', 21, '自验收报告', 1, '制造中心', '制造中心确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '5-生产制作/5.17 自验收报告', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1072, 'v20260629', 6, 'preAcceptance', '预验收阶段', '6.1', 1, '预验收单', 1, '营销组织，制造中心记录', '营销组织客户预验收，客户和项目经理确认', 'manufacturing_center', 'marketing_center', 'approval_required', 'file_upload', '6-预验收/6.1 预验收单', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1073, 'v20260629', 6, 'preAcceptance', '预验收阶段', '6.2', 2, '发票（发货款）', 0, '运营/财务，营销协调', '财务开票，营销协调客户付款', 'operations_center', 'marketing_center', 'submit_only', 'file_upload', '6-预验收/6.2 发票（发货款）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1074, 'v20260629', 7, 'finalAcceptance', '终验收阶段', '7.1', 1, '发货单', 1, '制造中心', '制造中心确认', 'manufacturing_center', 'manufacturing_center', 'submit_only', 'file_upload', '7-终验收/7.1 发货单', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1075, 'v20260629', 7, 'finalAcceptance', '终验收阶段', '7.2', 2, '安装调试记录（现场）', 1, '制造中心', '客户确认对象待业务确认', 'manufacturing_center', 'manufacturing_center', 'approval_required', 'file_upload', '7-终验收/7.2 安装调试记录（现场）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1076, 'v20260629', 7, 'finalAcceptance', '终验收阶段', '7.3', 3, '终验收单', 1, '营销组织，制造中心记录', '营销组织客户终验收，客户和项目经理确认', 'manufacturing_center', 'marketing_center', 'approval_required', 'file_upload', '7-终验收/7.3 终验收单', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1077, 'v20260629', 7, 'finalAcceptance', '终验收阶段', 'C68', 4, '资料移交清单', 0, '营销中心/项目相关人员', 'marketing_center确认', 'marketing_center', 'marketing_center', 'submit_only', 'file_upload', '7-终验收/C68 资料移交清单', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1078, 'v20260629', 7, 'finalAcceptance', '终验收阶段', '7.4', 5, '培训记录表', 1, '培训主讲人员', '客户和项目经理确认', 'marketing_center', 'marketing_center', 'approval_required', 'file_upload', '7-终验收/7.4 培训记录表', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1079, 'v20260629', 8, 'closeout', '结题阶段', '8.1', 1, '发票（尾款）', 0, '运营/财务，营销协调', '财务开票，营销协调客户付款', 'operations_center', 'marketing_center', 'submit_only', 'file_upload', '8-结题/8.1 发票（尾款）', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
INSERT INTO `stage_document_templates` VALUES (1080, 'v20260629', 8, 'closeout', '结题阶段', '8.2', 2, '项目结题报告', 1, '项目经理', '项目经理编写，总经理或相关负责人确认', NULL, NULL, 'submit_only', 'file_upload', '8-结题/8.2 项目结题报告', NULL, 1, '2026-07-02 23:44:04', '2026-07-02 23:44:04');
-- ----------------------------

-- ----------------------------
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
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `is_platform_admin` tinyint(1) NOT NULL DEFAULT 0,
  `file_platform_user_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_updated_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_users_account`(`account` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 28 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
INSERT INTO `users` VALUES (1, 'rd_manager', '易敏', 'rd_center', 'center_manager', '总监', 1, 0, NULL, 'pbkdf2_sha256$120000$0de87bc3e6bd2e9d94b98999f2568788$dcb3a7c34892b5a749436a86c4fe54b42c37895368e0bc59cc665f40cf48704c', '2026-06-25 14:58:30', '2026-06-25 14:58:30', '2026-06-25 14:58:30');
INSERT INTO `users` VALUES (2, 'rd_staff_1', '郭鹏辉', 'rd_center', 'employee', '机械设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$510c9e39703d50bba042305b2e08c8f6$4ce4e952bf660f30e5d37f107111a68c77f112c08a4a8a169e9b1bd80812e1ec', '2026-06-25 14:58:30', '2026-06-25 14:58:30', '2026-06-25 14:58:30');
INSERT INTO `users` VALUES (3, 'rd_staff_2', '符聪', 'rd_center', 'employee', '机械设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$ce0031c72f4cf1c8a3f3260e0eaa9288$866798fbb48a1537b3c1d37bfdb0f016427ce0505afad86c6ece3589a0d073b3', '2026-06-25 14:58:30', '2026-06-25 14:58:30', '2026-06-25 14:58:30');
INSERT INTO `users` VALUES (4, 'rd_staff_3', '李果', 'rd_center', 'employee', '机械设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$fd5527049439e0346a682d63c52ebb22$c55a5c5cd05ea5d170d304f4b86d7783e36f7a5635faf493d7773368931ff84f', '2026-06-25 14:58:30', '2026-06-25 14:58:30', '2026-06-25 14:58:30');
INSERT INTO `users` VALUES (5, 'rd_staff_4', '杨照国', 'rd_center', 'employee', '机械设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$fcaa0f2ea30d6293c99b57a00923e3b4$978f315bcc4b5cd2ab1597f93292d09fbad52ca58ff14c8e76e312b6782d0680', '2026-06-25 14:58:30', '2026-06-25 14:58:30', '2026-06-25 14:58:30');
INSERT INTO `users` VALUES (6, 'rd_staff_5', '沈永华', 'rd_center', 'employee', '机械设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$aafc4b19311831faff68be0e7c8c5306$f7a35d3359d107b1dba96217f810bc9421b7c9f20336ac9ae62d4b797ff36542', '2026-06-25 14:58:30', '2026-06-25 14:58:30', '2026-06-25 14:58:30');
INSERT INTO `users` VALUES (7, 'rd_staff_6', '李黎明', 'rd_center', 'employee', '机械设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$9b76415234e805a8b5dba8f51796799d$62ee8f462f375981d309fd7b8e105d7d4d25d207fcc8729a5a733cfe67a5a506', '2026-06-25 14:58:30', '2026-06-25 14:58:30', '2026-06-25 14:58:30');
INSERT INTO `users` VALUES (8, 'rd_staff_7', '陈芋如', 'rd_center', 'employee', '软件组主管', 1, 0, NULL, 'pbkdf2_sha256$120000$b5993d811722e5aff0fa685aff5ee2b1$1a592fca0ca00c18049d8df11ccba2b237fe211eb95b4795b19911547dd88871', '2026-06-25 14:58:30', '2026-06-25 14:58:30', '2026-06-25 14:58:30');
INSERT INTO `users` VALUES (9, 'rd_staff_8', '周厚贵', 'rd_center', 'employee', '软件设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$ea4ff8b4e752fea134ad9cb6d06d363a$23d5dbf924ffab89dd1e49f430c50135b6498c48cf15eacbd6c27b447acefc2b', '2026-06-25 14:58:30', '2026-06-25 14:58:30', '2026-06-25 14:58:30');
INSERT INTO `users` VALUES (10, 'rd_staff_9', '吴静一', 'rd_center', 'employee', '软件设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$7dabaac88c687b2cdfc251d8e9c736eb$f03d511647a4ac38e0cf20e6b014a11228f4655810de1db493d2643f0f61d400', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (11, 'rd_staff_10', '尹志勇', 'rd_center', 'employee', '电气设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$888cb9e5c7f2ca4f10c10b2970985382$0eeab3338dac803244282658465b6af61995e3baa2a4a94140308ced76f78230', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (12, 'rd_staff_11', '罗阳洋', 'rd_center', 'employee', '电气设计师', 1, 0, NULL, 'pbkdf2_sha256$120000$f56667550cc6dc87269dc615a08b3874$c2e0f974653c90ddc606463cfd91661e6d0318728fb6c95defc11f534a40bfcf', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (13, 'manufacturing_manager', '吴波', 'manufacturing_center', 'center_manager', '总监', 1, 0, NULL, 'pbkdf2_sha256$120000$1ca0a435afc6024e61d9224dea221c35$7beda3e6192a00c02518b14cf0fbbac68cfcd2c37e77475f0e69ee39e7752c7a', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (14, 'manufacturing_staff_1', '梁爱华', 'manufacturing_center', 'employee', '采购主管', 1, 0, NULL, 'pbkdf2_sha256$120000$31187d8410897b8aae12bbdad507dee0$5fc83c7ac92d9af44a26a684cb56ab77ae1760c5f25c9f80eb01f450bb1d0720', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (15, 'manufacturing_staff_2', '杨勇', 'manufacturing_center', 'employee', '电工', 1, 0, NULL, 'pbkdf2_sha256$120000$5e7082ec0fd0e1ad789fbf353e0f3c57$2683cad7ad4383ea174d27bfcec4b56664f53fe8f96f139497ca939bb9a8365d', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (16, 'manufacturing_staff_3', '杨冬义', 'manufacturing_center', 'employee', '电工', 1, 0, NULL, 'pbkdf2_sha256$120000$dae73f61ec428e9e07ffdcf24a8464a5$32fffdf25c9a77dd9922ae01b9c64c735ed303f97ba2bdb893a2da6f4b8e29f1', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (17, 'manufacturing_staff_4', '陈刚', 'manufacturing_center', 'employee', '钳工', 1, 0, NULL, 'pbkdf2_sha256$120000$12eb9a2b99ccaa03ef83ee834c99f4e3$78e4a30ecc285f343548cd3f5b9caf14d221db09189aad509d38a6c12ca14bcd', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (18, 'manufacturing_staff_5', '彭强', 'manufacturing_center', 'employee', '钳工', 1, 0, NULL, 'pbkdf2_sha256$120000$8de754f0c419b7370d5bb15ea5f83616$ef5f2551fc16c90817425547d0fcc4de0ed804e9f58a112c5846fadbedc75d46', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (19, 'manufacturing_staff_6', '王暑栗', 'manufacturing_center', 'employee', '质检', 1, 0, NULL, 'pbkdf2_sha256$120000$d8275194e773234a6922d0a50f08fc8a$e0c7db334b65809338f3ff4e193b52dd08b01b150b97e96f0758e8656fa7d727', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (20, 'marketing_manager', '夏小兵', 'marketing_center', 'center_manager', '主管', 1, 0, NULL, 'pbkdf2_sha256$120000$b20df4951cb370fcea720b5f3cd3d779$6b6e888738fa1232f9e01f42854b30ca0faedef4f0c3053afd0514c151c4cf61', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (21, 'marketing_staff_1', '黄柏宇', 'marketing_center', 'employee', '市场专员', 1, 0, NULL, 'pbkdf2_sha256$120000$2ad8aa57cbef8e65cc52db888b0425f4$4f0f09d9eb1638150b020da57d0e18a09fc15cef59d55f9c906bbfa753ec07e4', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (22, 'operations_staff_1', '唐利', 'operations_center', 'employee', '行政人事', 1, 0, NULL, 'pbkdf2_sha256$120000$a2b44371a731bcf46d736e95f0db27c5$03205e06339c32f77a2f2df51b8228f4458efdbfce9437d2aa08e4944b956d51', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (23, 'operations_manager', '黄瑛', 'operations_center', 'center_manager', '财务主管', 1, 0, NULL, 'pbkdf2_sha256$120000$563c0603c8a2c7a9f6770a7f9685607a$2c3c94ad296d1e960f3807c617fb93b57472d646ec66621738facad57609cd08', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-07-13 13:40:50');
INSERT INTO `users` VALUES (24, 'operations_staff_2', '余韦', 'operations_center', 'employee', '库房管理', 1, 0, NULL, 'pbkdf2_sha256$120000$8f35fe24883574f4921417c8ed028fea$e2964c52a173368bf3d71f3d17a67e32fa6dc2b4878e9fb85ce6a1db0b5505be', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (25, 'gm', '陈进伟', NULL, 'general_manager', '总经理', 1, 0, NULL, 'pbkdf2_sha256$120000$56cfbc7f76eabb90ac4cca863385b8f2$01a8b99ecfdf38e366eecbf0be0f49fc3d8e03037d59b946d99ff46a49a2180f', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (26, 'gm_assistant', '周先生', NULL, 'general_manager_assistant', '总经理助理', 1, 0, NULL, 'pbkdf2_sha256$120000$4578ec22fa9898febf4f8dc3d24bf89d$62846710f25922919831598c9e1f0980ae3761d0d9ce68ab77be507f8264dab3', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (27, 'sysadmin', '系统管理员', NULL, 'system_admin', '系统管理员', 1, 1, NULL, 'pbkdf2_sha256$120000$6fe6a9525efacab9ab58d2fa547b7307$1e55930da54388741d4dd1d7f53007439bbed087506bb412afa9dd86894f9773', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
-- ----------------------------

-- ----------------------------
-- Table structure for weekly_report_approval_history
-- ----------------------------
DROP TABLE IF EXISTS `weekly_report_approval_history`;
CREATE TABLE `weekly_report_approval_history`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `weekly_report_id` bigint UNSIGNED NOT NULL,
  `action` enum('submit','approve','return','resubmit') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_approval_status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `to_approval_status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `operator_user_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_weekly_report_approval_history_operator`(`operator_user_id` ASC) USING BTREE,
  INDEX `idx_weekly_report_approval_history_report`(`weekly_report_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `fk_weekly_report_approval_history_operator` FOREIGN KEY (`operator_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_weekly_report_approval_history_report` FOREIGN KEY (`weekly_report_id`) REFERENCES `weekly_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of weekly_report_approval_history
-- ----------------------------

-- ----------------------------
-- Table structure for weekly_report_plans
-- ----------------------------
DROP TABLE IF EXISTS `weekly_report_plans`;
CREATE TABLE `weekly_report_plans`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_key` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '璁″垝浠诲姟绋冲畾鏍囪瘑锛孶UID',
  `weekly_report_id` bigint UNSIGNED NOT NULL,
  `sort_order` smallint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NULL DEFAULT NULL COMMENT '鍏宠仈椤圭洰ID',
  `work_task` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_target` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `planned_date` date NOT NULL,
  `responsible_person` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_weekly_report_plans_order`(`weekly_report_id` ASC, `sort_order` ASC) USING BTREE,
  UNIQUE INDEX `uk_weekly_report_plans_task_key`(`task_key` ASC) USING BTREE,
  INDEX `idx_weekly_report_plans_project_planned`(`project_id` ASC, `planned_date` ASC) USING BTREE,
  CONSTRAINT `fk_weekly_report_plans_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_weekly_report_plans_report` FOREIGN KEY (`weekly_report_id`) REFERENCES `weekly_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of weekly_report_plans
-- ----------------------------

-- ----------------------------
-- Table structure for weekly_report_summaries
-- ----------------------------
DROP TABLE IF EXISTS `weekly_report_summaries`;
CREATE TABLE `weekly_report_summaries`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `weekly_report_id` bigint UNSIGNED NOT NULL,
  `sort_order` smallint UNSIGNED NOT NULL,
  `project_id` bigint UNSIGNED NULL DEFAULT NULL COMMENT '鍏宠仈椤圭洰ID',
  `source_type` enum('weekly_plan','ad_hoc','legacy_unknown') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'legacy_unknown' COMMENT '鎬荤粨鏉ユ簮',
  `source_plan_task_key` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '鏉ユ簮鍛ㄨ?鍒?task_key',
  `work_task` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_target` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `planned_date` date NOT NULL,
  `completion_status` enum('completed','in_progress','not_completed','added') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `completion_description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `completed_date` date NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_weekly_report_summaries_order`(`weekly_report_id` ASC, `sort_order` ASC) USING BTREE,
  INDEX `idx_weekly_report_summaries_project_planned`(`project_id` ASC, `planned_date` ASC) USING BTREE,
  INDEX `idx_weekly_report_summaries_source_task`(`source_plan_task_key` ASC, `weekly_report_id` ASC) USING BTREE,
  CONSTRAINT `fk_weekly_report_summaries_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_weekly_report_summaries_report` FOREIGN KEY (`weekly_report_id`) REFERENCES `weekly_reports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of weekly_report_summaries
-- ----------------------------

-- ----------------------------
-- Table structure for weekly_reports
-- ----------------------------
DROP TABLE IF EXISTS `weekly_reports`;
CREATE TABLE `weekly_reports`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `week_start` date NOT NULL,
  `week_end` date NOT NULL,
  `status` enum('draft','submitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `submitted_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `submitted_at` datetime NULL DEFAULT NULL,
  `approval_status` enum('not_submitted','pending','approved','returned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_submitted' COMMENT '鍛ㄦ姤瀹℃壒鐘舵?',
  `approval_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '瀹℃壒鎰忚?鎴栨墦鍥炲師鍥',
  `approval_reviewed_by_user_id` bigint UNSIGNED NULL DEFAULT NULL COMMENT '瀹℃壒浜虹敤鎴稩D',
  `approval_reviewed_at` datetime NULL DEFAULT NULL COMMENT '瀹℃壒鏃堕棿',
  `ai_score` json NULL COMMENT '棰勭暀璇勫垎缂撳瓨锛屾湰杞?笉鍚?敤 AI 鍏ュ彛',
  `ai_evaluated_at` datetime NULL DEFAULT NULL,
  `ai_evaluation_source` enum('ai','fallback_rule') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ai_evaluation_error` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `final_score` decimal(5, 2) NULL DEFAULT NULL COMMENT '棰勭暀浜哄伐鏈?粓璇勫垎锛屾湰杞?笉鍚?敤澶嶆潅璇勫垎鍏ュ彛',
  `final_grade` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `final_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `final_reviewed_by_user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `final_reviewed_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_weekly_reports_user_week`(`user_id` ASC, `week_start` ASC, `week_end` ASC) USING BTREE,
  INDEX `fk_weekly_reports_submitted_by`(`submitted_by_user_id` ASC) USING BTREE,
  INDEX `idx_weekly_reports_week_status_user`(`week_start` ASC, `status` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_weekly_reports_submitted_at`(`submitted_at` ASC) USING BTREE,
  INDEX `idx_weekly_reports_approval_status`(`approval_status` ASC, `week_start` ASC) USING BTREE,
  INDEX `idx_weekly_reports_approval_reviewer`(`approval_reviewed_by_user_id` ASC) USING BTREE,
  INDEX `idx_weekly_reports_final_reviewer`(`final_reviewed_by_user_id` ASC) USING BTREE,
  CONSTRAINT `fk_weekly_reports_approval_reviewer` FOREIGN KEY (`approval_reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_weekly_reports_final_reviewer` FOREIGN KEY (`final_reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_weekly_reports_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_weekly_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of weekly_reports
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;
