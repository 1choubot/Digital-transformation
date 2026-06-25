import fs from 'node:fs/promises';
import path from 'node:path';
import { closePool, pool } from '../src/db/pool.js';
import { ensureStageDocumentSchema } from '../src/db/stageDocumentSchema.js';
import { PROJECT_APPROVAL_STATUS } from '../src/domain/projectApproval.js';
import { PROJECT_STATUS } from '../src/domain/projects.js';
import { STAGE_STATUS } from '../src/domain/stages.js';
import { getStageDocumentAttachmentStorageDir } from '../src/storage/stageDocumentAttachmentStorage.js';

function requireConfirmFlag(argv) {
  if (!argv.includes('--confirm')) {
    throw new Error('Refusing to reset stage documents without --confirm');
  }
}

async function countTableRows(connection, tableName) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
  return Number(rows[0]?.count || 0);
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );
  return Number(rows[0]?.count || 0) > 0;
}

function assertSafeAttachmentStorageDir(storageDir) {
  const resolved = path.resolve(storageDir);
  const parsed = path.parse(resolved);
  const relativeParts = path
    .relative(parsed.root, resolved)
    .split(path.sep)
    .filter(Boolean);

  if (resolved === parsed.root) {
    throw new Error(`Refusing to delete attachment storage root: ${resolved}`);
  }

  if (path.basename(resolved) !== 'stage-document-attachments') {
    throw new Error(
      `Refusing to delete attachment storage directory without stage-document-attachments leaf: ${resolved}`
    );
  }

  if (relativeParts.length < 2) {
    throw new Error(`Refusing to delete broad attachment storage directory: ${resolved}`);
  }

  return resolved;
}

async function countFilesRecursive(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        count += await countFilesRecursive(entryPath);
      } else if (entry.isFile()) {
        count += 1;
      }
    }
    return count;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
}

async function planAttachmentStorageReset() {
  const storageDir = assertSafeAttachmentStorageDir(getStageDocumentAttachmentStorageDir());

  return {
    storageDir,
    beforeFileCount: await countFilesRecursive(storageDir)
  };
}

async function resetAttachmentStorageDir(plan) {
  const storageDir = assertSafeAttachmentStorageDir(plan.storageDir);
  await fs.rm(storageDir, { recursive: true, force: true });
  await fs.mkdir(storageDir, { recursive: true });

  return {
    storageDir,
    beforeFileCount: plan.beforeFileCount,
    afterFileCount: await countFilesRecursive(storageDir)
  };
}

async function countBusinessLogsForReset(connection) {
  if (!(await tableExists(connection, 'business_operation_logs'))) {
    return 0;
  }

  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM business_operation_logs
     WHERE action_type LIKE 'document.%'
       OR action_type LIKE 'approval.%'
       OR action_type IN ('stage.advanced', 'project.completed')`
  );
  return Number(rows[0]?.count || 0);
}

async function main() {
  requireConfirmFlag(process.argv.slice(2));
  await ensureStageDocumentSchema(pool);

  const connection = await pool.getConnection();
  try {
    const [databaseRows] = await connection.query('SELECT DATABASE() AS currentDatabase');
    const currentDatabase = databaseRows[0]?.currentDatabase;
    if (currentDatabase !== 'digital_platform') {
      throw new Error(`Refusing to reset stage documents in unexpected database: ${currentDatabase}`);
    }

    const hasApprovalHistory = await tableExists(connection, 'project_stage_approval_history');
    const hasOperationLogs = await tableExists(connection, 'business_operation_logs');
    const before = {
      projects: await countTableRows(connection, 'projects'),
      approvalHistory: hasApprovalHistory
        ? await countTableRows(connection, 'project_stage_approval_history')
        : null,
      resettableOperationLogs: await countBusinessLogsForReset(connection),
      attachments: await countTableRows(connection, 'project_stage_document_attachments'),
      projectStageDocuments: await countTableRows(connection, 'project_stage_documents'),
      stageDocumentTemplates: await countTableRows(connection, 'stage_document_templates')
    };

    const attachmentFilesPlan = await planAttachmentStorageReset();

    await connection.beginTransaction();
    await connection.execute('UPDATE projects SET status = ?', [PROJECT_STATUS.NORMAL]);
    await connection.execute(
      `UPDATE project_stages
       SET stage_status = CASE WHEN stage_order = 1 THEN ? ELSE ? END,
         is_current = CASE WHEN stage_order = 1 THEN 1 ELSE 0 END,
         approval_status = ?,
         started_at = NULL,
         completed_at = NULL`,
      [STAGE_STATUS.CURRENT, STAGE_STATUS.NOT_STARTED, PROJECT_APPROVAL_STATUS.NOT_SUBMITTED]
    );
    if (hasApprovalHistory) {
      await connection.execute('DELETE FROM project_stage_approval_history');
    }
    if (hasOperationLogs) {
      await connection.execute(
        `DELETE FROM business_operation_logs
         WHERE action_type LIKE 'document.%'
           OR action_type LIKE 'approval.%'
           OR action_type IN ('stage.advanced', 'project.completed')`
      );
    }
    await connection.execute('DELETE FROM project_stage_document_attachments');
    await connection.execute('DELETE FROM project_stage_documents');
    await connection.execute('DELETE FROM stage_document_templates');
    await connection.commit();

    const attachmentFiles = await resetAttachmentStorageDir(attachmentFilesPlan);

    const after = {
      projects: await countTableRows(connection, 'projects'),
      approvalHistory: hasApprovalHistory
        ? await countTableRows(connection, 'project_stage_approval_history')
        : null,
      resettableOperationLogs: await countBusinessLogsForReset(connection),
      attachments: await countTableRows(connection, 'project_stage_document_attachments'),
      projectStageDocuments: await countTableRows(connection, 'project_stage_documents'),
      stageDocumentTemplates: await countTableRows(connection, 'stage_document_templates')
    };

    console.log(
      JSON.stringify(
        {
          currentDatabase,
          reset: true,
          attachmentFiles,
          before,
          after
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
