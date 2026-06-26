import { closePool, pool } from '../src/db/pool.js';
import { ensureStageDocumentSchema } from '../src/db/stageDocumentSchema.js';

async function getColumnMetadata(connection, tableName, columnName) {
  const [rows] = await connection.execute(
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

async function ensureProjectCodeNullable(connection) {
  const column = await getColumnMetadata(connection, 'projects', 'project_code');
  if (!column) {
    throw new Error('projects.project_code column not found');
  }

  if (column.isNullable !== 'YES') {
    await connection.execute('ALTER TABLE projects MODIFY project_code VARCHAR(64) NULL');
  }

  await connection.execute(
    `UPDATE projects
     SET project_code = NULL
     WHERE project_code IS NOT NULL
       AND TRIM(project_code) = ''`
  );
}

async function main() {
  const connection = await pool.getConnection();

  try {
    const [databaseRows] = await connection.query('SELECT DATABASE() AS currentDatabase');
    const currentDatabase = databaseRows[0]?.currentDatabase;
    if (currentDatabase !== 'digital_platform') {
      throw new Error(`Refusing to migrate unexpected database: ${currentDatabase}`);
    }

    await connection.beginTransaction();
    await ensureProjectCodeNullable(connection);
    await ensureStageDocumentSchema(connection);
    await connection.commit();

    const [projectCodeRows] = await connection.execute(
      `SELECT IS_NULLABLE AS isNullable
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'projects'
         AND COLUMN_NAME = 'project_code'`
    );
    const [templateCompletionRows] = await connection.execute(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'stage_document_templates'
         AND COLUMN_NAME = 'completion_mode'`
    );
    const [projectDocumentCompletionRows] = await connection.execute(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'project_stage_documents'
         AND COLUMN_NAME = 'completion_mode'`
    );

    console.log(
      JSON.stringify(
        {
          currentDatabase,
          projectCodeNullable: projectCodeRows[0]?.isNullable === 'YES',
          stageDocumentTemplatesCompletionMode:
            Number(templateCompletionRows[0]?.count || 0) === 1,
          projectStageDocumentsCompletionMode:
            Number(projectDocumentCompletionRows[0]?.count || 0) === 1
        },
        null,
        2
      )
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // The transaction may not have started yet.
    }
    throw error;
  } finally {
    connection.release();
  }
}

try {
  await main();
} finally {
  await closePool();
}
