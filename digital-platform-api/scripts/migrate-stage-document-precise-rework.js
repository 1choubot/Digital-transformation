import { closePool, pool } from '../src/db/pool.js';
import { ensureStageDocumentSchema } from '../src/db/stageDocumentSchema.js';

const REVISION_COLUMNS = [
  'revision_required',
  'revision_reason',
  'revision_source_document_id',
  'revision_requested_by_user_id',
  'revision_requested_at',
  'revision_resubmitted_by_user_id',
  'revision_resubmitted_at',
  'revision_completed_by_user_id',
  'revision_completed_at'
];

async function verifyRevisionColumns(connection) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME AS columnName
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'project_stage_documents'
       AND COLUMN_NAME IN (${REVISION_COLUMNS.map(() => '?').join(', ')})`,
    REVISION_COLUMNS
  );
  const present = new Set(rows.map((row) => row.columnName));
  const missing = REVISION_COLUMNS.filter((columnName) => !present.has(columnName));
  if (missing.length > 0) {
    throw new Error(`Missing project_stage_documents revision columns: ${missing.join(', ')}`);
  }
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
    await ensureStageDocumentSchema(connection);
    await connection.commit();
    await verifyRevisionColumns(connection);

    console.log(
      JSON.stringify(
        {
          currentDatabase,
          projectStageDocumentsRevisionColumns: true
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
