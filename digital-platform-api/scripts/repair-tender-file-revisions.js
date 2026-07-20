import { closePool, pool } from '../src/db/pool.js';

const EXPECTED_DATABASE = 'digital_platform';
const TENDER_SLOT_KEYS = ['tender_business_file', 'tender_technical_file'];

async function selectAffectedTenderFiles(executor, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      p.id AS projectId,
      p.project_code AS projectCode,
      p.project_name AS projectName,
      n.current_revision AS nodeRevision,
      flow.revision AS flowRevision,
      flow.branch_status AS branchStatus,
      s.id AS slotId,
      s.slot_key AS slotKey,
      s.revision AS slotRevision,
      f.id AS fileId,
      f.revision AS fileRevision,
      f.original_file_name AS originalFileName
    FROM projects p
    INNER JOIN project_solution_design_nodes n
      ON n.project_id = p.id
      AND n.node_key = 'quotation_or_tender'
    INNER JOIN project_solution_design_quotation_tender_flows flow
      ON flow.project_id = p.id
      AND flow.branch_type = 'tender'
    INNER JOIN project_solution_design_upload_slots s
      ON s.project_id = p.id
      AND s.slot_key IN (?, ?)
    INNER JOIN project_solution_design_upload_files f
      ON f.slot_id = s.id
      AND f.is_current = 1
    WHERE f.revision < n.current_revision
    ORDER BY p.id ASC, s.slot_order ASC${forUpdate ? ' FOR UPDATE' : ''}`,
    TENDER_SLOT_KEYS
  );

  return rows;
}

function printResult({ currentDatabase, mode, affectedRows, remainingRows = null }) {
  console.log(
    JSON.stringify(
      {
        currentDatabase,
        mode,
        affectedCount: affectedRows.length,
        affectedRows,
        ...(remainingRows === null ? {} : { remainingCount: remainingRows.length, remainingRows })
      },
      null,
      2
    )
  );
}

async function main() {
  const shouldConfirm = process.argv.includes('--confirm');
  const connection = await pool.getConnection();

  try {
    const [databaseRows] = await connection.query('SELECT DATABASE() AS currentDatabase');
    const currentDatabase = databaseRows[0]?.currentDatabase;
    if (currentDatabase !== EXPECTED_DATABASE) {
      throw new Error(`Refusing to repair unexpected database: ${currentDatabase}`);
    }

    if (!shouldConfirm) {
      const affectedRows = await selectAffectedTenderFiles(connection);
      printResult({ currentDatabase, mode: 'preview', affectedRows });
      return;
    }

    await connection.beginTransaction();
    const affectedRows = await selectAffectedTenderFiles(connection, { forUpdate: true });

    for (const row of affectedRows) {
      const targetRevision = Number(row.nodeRevision);
      const [fileResult] = await connection.execute(
        `UPDATE project_solution_design_upload_files
        SET revision = ?
        WHERE id = ?
          AND is_current = 1
          AND revision < ?`,
        [targetRevision, row.fileId, targetRevision]
      );
      if (Number(fileResult.affectedRows) !== 1) {
        throw new Error(`Current tender file changed during repair: ${row.fileId}`);
      }

      await connection.execute(
        `UPDATE project_solution_design_upload_slots
        SET revision = GREATEST(revision, ?)
        WHERE id = ?`,
        [targetRevision, row.slotId]
      );
    }

    const remainingRowsInTransaction = await selectAffectedTenderFiles(connection);
    if (remainingRowsInTransaction.length > 0) {
      throw new Error(`Tender file revision repair verification failed: ${remainingRowsInTransaction.length} rows remain`);
    }

    await connection.commit();
    const remainingRows = await selectAffectedTenderFiles(connection);
    printResult({ currentDatabase, mode: 'confirmed', affectedRows, remainingRows });
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
