async function columnExists(executor, tableName, columnName) {
  const [rows] = await executor.execute(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function tableExists(executor, tableName) {
  const [rows] = await executor.execute(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?`,
    [tableName]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function getColumnMetadata(executor, tableName, columnName) {
  const [rows] = await executor.execute(
    `SELECT
      IS_NULLABLE AS isNullable,
      COLUMN_TYPE AS columnType
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1`,
    [tableName, columnName]
  );

  return rows[0] || null;
}

async function ensureProjectsCustomerContact(executor) {
  if (!(await columnExists(executor, 'projects', 'customer_contact'))) {
    await executor.execute('ALTER TABLE projects ADD COLUMN customer_contact VARCHAR(255) NULL AFTER customer_name');
  }
}

async function ensureProjectManagerNullable(executor) {
  const column = await getColumnMetadata(executor, 'projects', 'project_manager');
  if (column && column.isNullable !== 'YES') {
    await executor.execute('ALTER TABLE projects MODIFY project_manager VARCHAR(128) NULL');
  }
}

async function ensureProjectModeNullable(executor) {
  const column = await getColumnMetadata(executor, 'projects', 'project_mode');
  if (column && column.isNullable !== 'YES') {
    await executor.execute('ALTER TABLE projects MODIFY project_mode VARCHAR(32) NULL');
  }
}

async function ensureStageDocumentFormsTable(executor) {
  await executor.execute(
    `CREATE TABLE IF NOT EXISTS project_stage_document_forms (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      stage_document_id BIGINT UNSIGNED NOT NULL,
      form_key VARCHAR(64) NOT NULL,
      form_schema_json JSON NOT NULL,
      form_data_json JSON NULL,
      status ENUM('draft', 'submitted') NOT NULL DEFAULT 'draft',
      draft_saved_by_user_id BIGINT UNSIGNED NULL,
      draft_saved_at DATETIME NULL,
      submitted_by_user_id BIGINT UNSIGNED NULL,
      submitted_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_project_stage_document_forms_document (stage_document_id),
      KEY idx_project_stage_document_forms_project (project_id),
      KEY idx_project_stage_document_forms_status (status),
      KEY idx_project_stage_document_forms_saved_by (draft_saved_by_user_id),
      KEY idx_project_stage_document_forms_submitted_by (submitted_by_user_id),
      CONSTRAINT fk_project_stage_document_forms_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_project_stage_document_forms_document
        FOREIGN KEY (stage_document_id) REFERENCES project_stage_documents (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_project_stage_document_forms_saved_by
        FOREIGN KEY (draft_saved_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
      CONSTRAINT fk_project_stage_document_forms_submitted_by
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

export async function ensureProjectWorkspaceSchema(executor) {
  await ensureProjectsCustomerContact(executor);
  await ensureProjectManagerNullable(executor);
  await ensureProjectModeNullable(executor);
  await ensureStageDocumentFormsTable(executor);
}

export async function inspectProjectWorkspaceSchema(executor) {
  const projectManagerColumn = await getColumnMetadata(executor, 'projects', 'project_manager');
  const projectModeColumn = await getColumnMetadata(executor, 'projects', 'project_mode');

  return {
    projectsCustomerContact: await columnExists(executor, 'projects', 'customer_contact'),
    projectsProjectManagerNullable: projectManagerColumn?.isNullable === 'YES',
    projectsProjectModeNullable: projectModeColumn?.isNullable === 'YES',
    projectStageDocumentFormsTable: await tableExists(executor, 'project_stage_document_forms')
  };
}
