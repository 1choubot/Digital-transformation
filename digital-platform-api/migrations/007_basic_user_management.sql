SET @has_is_platform_admin = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'is_platform_admin'
);
SET @add_is_platform_admin = IF(
  @has_is_platform_admin = 0,
  'ALTER TABLE users ADD COLUMN is_platform_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER is_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @add_is_platform_admin;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
