import { closePool, pool } from '../src/db/pool.js';
import { ensureStageDocumentSchema } from '../src/db/stageDocumentSchema.js';
import { initializeInitiationReviewNodesForExistingProjects } from '../src/repositories/stageDocumentRepository.js';

const REQUIRED_COLUMNS = [
  'project_id',
  'stage_document_id',
  'node_key',
  'node_status',
  'reviewer_role',
  'reviewer_department',
  'submitted_by_user_id',
  'submitted_at',
  'reviewed_by_user_id',
  'reviewed_at'
];

async function verifyInitiationReviewNodeTable(connection) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME AS columnName
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'project_initiation_review_nodes'
       AND COLUMN_NAME IN (${REQUIRED_COLUMNS.map(() => '?').join(', ')})`,
    REQUIRED_COLUMNS
  );
  const present = new Set(rows.map((row) => row.columnName));
  const missing = REQUIRED_COLUMNS.filter((columnName) => !present.has(columnName));
  if (missing.length > 0) {
    throw new Error(`Missing project_initiation_review_nodes columns: ${missing.join(', ')}`);
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
    const initialized = await initializeInitiationReviewNodesForExistingProjects(connection);
    await connection.commit();
    await verifyInitiationReviewNodeTable(connection);

    console.log(
      JSON.stringify(
        {
          currentDatabase,
          projectInitiationReviewNodes: true,
          initialized
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
