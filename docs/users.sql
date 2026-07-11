/*
 Navicat Premium Dump SQL

 Source Server         : MySQL DataBase
 Source Server Type    : MySQL
 Source Server Version : 80044 (8.0.44)
 Source Host           : localhost:3306
 Source Schema         : digital_platform

 Target Server Type    : MySQL
 Target Server Version : 80044 (8.0.44)
 File Encoding         : 65001

 Date: 11/07/2026 15:36:25
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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
) ENGINE = InnoDB AUTO_INCREMENT = 1697 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of users
-- ----------------------------
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
INSERT INTO `users` VALUES (23, 'operations_manager', '彭霞', 'operations_center', 'center_manager', '财务主管', 1, 0, NULL, 'pbkdf2_sha256$120000$563c0603c8a2c7a9f6770a7f9685607a$2c3c94ad296d1e960f3807c617fb93b57472d646ec66621738facad57609cd08', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (24, 'operations_staff_2', '余韦', 'operations_center', 'employee', '库房管理', 1, 0, NULL, 'pbkdf2_sha256$120000$8f35fe24883574f4921417c8ed028fea$e2964c52a173368bf3d71f3d17a67e32fa6dc2b4878e9fb85ce6a1db0b5505be', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (25, 'gm', '陈进伟', NULL, 'general_manager', '总经理', 1, 0, NULL, 'pbkdf2_sha256$120000$56cfbc7f76eabb90ac4cca863385b8f2$01a8b99ecfdf38e366eecbf0be0f49fc3d8e03037d59b946d99ff46a49a2180f', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (26, 'gm_assistant', '周先生', NULL, 'general_manager_assistant', '总经理助理', 1, 0, NULL, 'pbkdf2_sha256$120000$4578ec22fa9898febf4f8dc3d24bf89d$62846710f25922919831598c9e1f0980ae3761d0d9ce68ab77be507f8264dab3', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');
INSERT INTO `users` VALUES (27, 'sysadmin', '系统管理员', NULL, 'system_admin', '系统管理员', 1, 1, NULL, 'pbkdf2_sha256$120000$6fe6a9525efacab9ab58d2fa547b7307$1e55930da54388741d4dd1d7f53007439bbed087506bb412afa9dd86894f9773', '2026-06-25 14:58:31', '2026-06-25 14:58:31', '2026-06-25 14:58:31');

SET FOREIGN_KEY_CHECKS = 1;
