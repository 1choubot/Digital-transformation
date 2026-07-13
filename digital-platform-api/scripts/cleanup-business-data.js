import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { env } from '../src/config/env.js';
import { closePool, pool } from '../src/db/pool.js';
import { getStageDocumentAttachmentPath } from '../src/storage/stageDocumentAttachmentStorage.js';
import { getStageDocumentGeneratedFilePath } from '../src/storage/stageDocumentGeneratedFileStorage.js';
import { getStageDocumentOnlineFormImagePath } from '../src/storage/stageDocumentOnlineFormImageStorage.js';
import { getSolutionDesignUploadPath } from '../src/storage/solutionDesignUploadStorage.js';
import { getDailyReportAttachmentPath } from '../src/storage/dailyReportAttachmentStorage.js';

const EXPECTED_DATABASE = 'digital_platform';
const ARTIFACT_ROOT = path.resolve(process.cwd(), '.tmp', 'business-data-cleanup');

// Children come before parents. Template, user, organization and report-setting tables are intentionally absent.
const DELETE_ORDER = [
  'daily_report_attachments',
  'daily_report_items',
  'daily_report_plans',
  'daily_reports',
  'weekly_report_approval_history',
  'weekly_report_summaries',
  'weekly_report_plans',
  'weekly_reports',
  'project_solution_design_upload_files',
  'project_solution_design_upload_slots',
  'project_solution_design_analysis_forms',
  'project_solution_design_review_forms',
  'project_solution_design_quotation_tender_flows',
  'project_solution_design_role_history',
  'project_solution_design_roles',
  'project_solution_design_nodes',
  'project_stage_document_form_images',
  'project_stage_document_generated_files',
  'project_stage_document_attachments',
  'project_stage_document_forms',
  'project_initiation_review_nodes',
  'project_stage_approval_history',
  'business_operation_logs',
  'project_stage_documents',
  'project_stages',
  'projects'
];

const PRESERVED_TABLES = [
  'users',
  'auth_sessions',
  'departments',
  'organization_roles',
  'user_organization_roles',
  'stage_document_templates',
  'center_daily_report_schedules',
  'report_weekly_rest_mode_anchors'
];

const FILE_SOURCES = [
  ['daily_report_attachments', 'storage_key', getDailyReportAttachmentPath],
  ['project_stage_document_attachments', 'storage_key', getStageDocumentAttachmentPath],
  ['project_stage_document_form_images', 'storage_key', getStageDocumentOnlineFormImagePath],
  ['project_stage_document_generated_files', 'storage_key', getStageDocumentGeneratedFilePath],
  ['project_solution_design_upload_files', 'storage_key', getSolutionDesignUploadPath],
  ['project_solution_design_analysis_forms', 'generated_file_storage_key', getSolutionDesignUploadPath],
  ['project_solution_design_review_forms', 'generated_file_storage_key', getSolutionDesignUploadPath]
];

function requireConfirmFlag(argv) {
  if (!argv.includes('--confirm')) {
    throw new Error('Refusing to clean business data without --confirm');
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function getExistingTables(connection) {
  const [rows] = await connection.execute(
    `SELECT TABLE_NAME AS tableName FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`
  );
  return new Set(rows.map((row) => row.tableName));
}

async function countTables(connection, tableNames, existingTables) {
  const counts = {};
  for (const tableName of tableNames) {
    if (!existingTables.has(tableName)) continue;
    const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
    counts[tableName] = Number(rows[0]?.count || 0);
  }
  return counts;
}

async function collectFiles(connection, existingTables) {
  const files = [];
  for (const [tableName, columnName, resolvePath] of FILE_SOURCES) {
    if (!existingTables.has(tableName)) continue;
    const [rows] = await connection.query(
      `SELECT \`${columnName}\` AS storageKey FROM \`${tableName}\` WHERE \`${columnName}\` IS NOT NULL`
    );
    for (const row of rows) {
      // Each resolver enforces that the key remains below its dedicated storage root.
      files.push({ tableName, storageKey: row.storageKey, filePath: resolvePath(row.storageKey) });
    }
  }
  return files;
}

async function runBackup(backupPath) {
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  const handle = await fs.open(backupPath, 'wx');
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(
        'mysqldump',
        [
          `--host=${env.db.host}`,
          `--port=${env.db.port}`,
          `--user=${env.db.user}`,
          '--single-transaction',
          '--routines',
          '--triggers',
          '--set-gtid-purged=OFF',
          env.db.database
        ],
        {
          env: { ...process.env, MYSQL_PWD: env.db.password },
          stdio: ['ignore', handle.fd, 'pipe']
        }
      );
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`mysqldump failed with exit code ${code}: ${stderr.trim()}`));
      });
    });
  } catch (error) {
    await handle.close();
    await fs.rm(backupPath, { force: true });
    throw error;
  }
  await handle.close();
  const stat = await fs.stat(backupPath);
  if (stat.size === 0) throw new Error('Database backup is empty; cleanup aborted');
  return stat.size;
}

async function deleteFiles(files) {
  const result = { deleted: [], missing: [], failed: [] };
  for (const file of files) {
    try {
      await fs.unlink(file.filePath);
      result.deleted.push(file.filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') result.missing.push(file.filePath);
      else result.failed.push({ ...file, error: error?.message || String(error) });
    }
  }
  return result;
}

async function assertNoUnexpectedProjectReferences(connection, existingTables) {
  const [rows] = await connection.execute(
    `SELECT DISTINCT TABLE_NAME AS tableName
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME = 'projects'`
  );
  const allowed = new Set(DELETE_ORDER);
  const unexpected = rows.map((row) => row.tableName).filter((name) => existingTables.has(name) && !allowed.has(name));
  if (unexpected.length) {
    throw new Error(`Cleanup table whitelist is incomplete; project references found in: ${unexpected.join(', ')}`);
  }
}

async function main() {
  requireConfirmFlag(process.argv.slice(2));
  const runDir = path.join(ARTIFACT_ROOT, timestamp());
  const backupPath = path.join(runDir, `${env.db.database}.sql`);
  const manifestPath = path.join(runDir, 'file-manifest.json');
  const reportPath = path.join(runDir, 'cleanup-report.json');
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    const [databaseRows] = await connection.query('SELECT DATABASE() AS currentDatabase');
    const currentDatabase = databaseRows[0]?.currentDatabase;
    if (currentDatabase !== EXPECTED_DATABASE || env.db.database !== EXPECTED_DATABASE) {
      throw new Error(`Refusing to clean unexpected database: ${currentDatabase}`);
    }

    const existingTables = await getExistingTables(connection);
    await assertNoUnexpectedProjectReferences(connection, existingTables);
    const trackedTables = [...new Set([...DELETE_ORDER, ...PRESERVED_TABLES])];
    const before = await countTables(connection, trackedTables, existingTables);
    const files = await collectFiles(connection, existingTables);
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(manifestPath, `${JSON.stringify(files, null, 2)}\n`, { flag: 'wx' });
    const backupSize = await runBackup(backupPath);

    await connection.beginTransaction();
    transactionStarted = true;
    const deletedRows = {};
    for (const tableName of DELETE_ORDER) {
      if (!existingTables.has(tableName)) continue;
      const [result] = await connection.query(`DELETE FROM \`${tableName}\``);
      deletedRows[tableName] = result.affectedRows;
    }
    await connection.commit();
    transactionStarted = false;

    const after = await countTables(connection, trackedTables, existingTables);
    for (const tableName of DELETE_ORDER) {
      if (after[tableName] !== undefined && after[tableName] !== 0) {
        throw new Error(`Post-cleanup verification failed: ${tableName} contains ${after[tableName]} rows`);
      }
    }
    for (const tableName of PRESERVED_TABLES) {
      if (before[tableName] !== undefined && after[tableName] !== before[tableName]) {
        throw new Error(`Preserved table changed unexpectedly: ${tableName}`);
      }
    }

    const fileCleanup = await deleteFiles(files);
    const report = {
      currentDatabase,
      completedAt: new Date().toISOString(),
      backup: { path: backupPath, size: backupSize },
      manifestPath,
      before,
      deletedRows,
      after,
      fileCleanup
    };
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ ...report, reportPath }, null, 2));
    if (fileCleanup.failed.length) process.exitCode = 2;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
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
