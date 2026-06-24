import { pool } from '../db/pool.js';
import { DAILY_REPORT_ERROR, DailyReportError } from '../domain/dailyReports.js';
import { ReportStatus } from '../domain/reports.js';
import {
  assertDailyReportAttachmentFileReadable,
  cleanupDailyReportAttachmentFile,
  createDailyReportAttachmentStorageKey,
  writeDailyReportAttachmentFile
} from '../storage/dailyReportAttachmentStorage.js';

// Map a project row into the compact shape used by daily report project search.
function mapDailyReportProject(row) {
  return {
    id: row.id,
    projectCode: row.project_code,
    projectName: row.project_name,
    projectManager: row.project_manager,
    projectManagerUserId: row.project_manager_user_id,
    status: row.status
  };
}

// Map the report header row without child collections.
function mapDailyReportHeader(row) {
  return {
    id: row.id,
    userId: row.user_id,
    reportDate: row.report_date,
    projectId: row.project_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    project: row.project_code
      ? {
          id: row.project_id,
          projectCode: row.project_code,
          projectName: row.project_name,
          projectManager: row.project_manager,
          projectManagerUserId: row.project_manager_user_id,
          status: row.project_status
        }
      : null
  };
}

// Map one completed-work row.
function mapDailyReportItem(row) {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    workContent: row.work_content,
    completionProgress: row.completion_progress,
    completedAt: String(row.completed_at).slice(0, 5),
    responsiblePerson: row.responsible_person,
    deviationAndCorrectiveAction: row.deviation_and_corrective_action
  };
}

// Map one next-day plan row.
function mapDailyReportPlan(row) {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    plannedWorkContent: row.planned_work_content,
    responsiblePerson: row.responsible_person,
    plannedCompleteAt: row.planned_complete_at ? String(row.planned_complete_at).slice(0, 5) : null,
    collaboratingCenter: row.collaborating_center,
    collaborationItem: row.collaboration_item
  };
}

// Map one attachment row without leaking storage paths.
function mapDailyReportAttachment(row) {
  return {
    id: row.id,
    dailyReportId: row.daily_report_id,
    originalFileName: row.original_file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: row.created_at,
    uploadedByUser: row.uploader_account
      ? {
          id: row.uploaded_by_user_id,
          account: row.uploader_account,
          name: row.uploader_display_name
        }
      : null
  };
}

// Search all non-completed projects by code or name, matching the real database fields.
export async function searchActiveProjectsForDailyReports({ q = '', limit = 20 } = {}, executor = pool) {
  const keyword = String(q || '').trim();
  const params = [];
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  let keywordClause = '';

  if (keyword) {
    keywordClause = 'AND (project_code LIKE ? OR project_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const [rows] = await executor.execute(
    `SELECT
      id,
      project_code,
      project_name,
      project_manager,
      project_manager_user_id,
      status
    FROM projects
    WHERE status <> 'completed'
      ${keywordClause}
    ORDER BY project_code ASC, id ASC
    LIMIT ${safeLimit}`,
    params
  );

  return rows.map(mapDailyReportProject);
}

// Lock and validate the project used by a report write.
async function assertProjectAvailable(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT id, status
    FROM projects
    WHERE id = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId]
  );

  if (rows.length === 0 || rows[0].status === 'completed') {
    throw new DailyReportError(
      DAILY_REPORT_ERROR.PROJECT_NOT_AVAILABLE,
      'Project is not available for daily reports',
      409,
      ['projectId']
    );
  }
}

// Select one report header by id and owner.
async function selectDailyReportHeader(executor, { reportId, userId, forUpdate = false }) {
  const [rows] = await executor.execute(
    `SELECT
      dr.*,
      p.project_code,
      p.project_name,
      p.project_manager,
      p.project_manager_user_id,
      p.status AS project_status
    FROM daily_reports dr
    INNER JOIN projects p ON p.id = dr.project_id
    WHERE dr.id = ?
      AND dr.user_id = ?
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [reportId, userId]
  );

  if (rows.length === 0) {
    throw new DailyReportError(DAILY_REPORT_ERROR.NOT_FOUND, 'Daily report not found', 404, ['reportId']);
  }

  return rows[0];
}

// Replace child rows in a stable sort order.
async function replaceDailyReportRows(executor, reportId, { items, plans }) {
  await executor.execute('DELETE FROM daily_report_items WHERE daily_report_id = ?', [reportId]);
  await executor.execute('DELETE FROM daily_report_plans WHERE daily_report_id = ?', [reportId]);

  for (const item of items) {
    await executor.execute(
      `INSERT INTO daily_report_items (
        daily_report_id,
        sort_order,
        work_content,
        completion_progress,
        completed_at,
        responsible_person,
        deviation_and_corrective_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        item.sortOrder,
        item.workContent,
        item.completionProgress,
        item.completedAt,
        item.responsiblePerson,
        item.deviationAndCorrectiveAction
      ]
    );
  }

  for (const plan of plans) {
    await executor.execute(
      `INSERT INTO daily_report_plans (
        daily_report_id,
        sort_order,
        planned_work_content,
        responsible_person,
        planned_complete_at,
        collaborating_center,
        collaboration_item
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        plan.sortOrder,
        plan.plannedWorkContent,
        plan.responsiblePerson,
        plan.plannedCompleteAt,
        plan.collaboratingCenter,
        plan.collaborationItem
      ]
    );
  }
}

// Fetch full report details with items, plans, and attachment metadata.
export async function getDailyReportById({ reportId, userId }, executor = pool) {
  const report = mapDailyReportHeader(await selectDailyReportHeader(executor, { reportId, userId }));
  const [itemRows] = await executor.execute(
    `SELECT *
    FROM daily_report_items
    WHERE daily_report_id = ?
    ORDER BY sort_order ASC, id ASC`,
    [reportId]
  );
  const [planRows] = await executor.execute(
    `SELECT *
    FROM daily_report_plans
    WHERE daily_report_id = ?
    ORDER BY sort_order ASC, id ASC`,
    [reportId]
  );
  const attachments = await listDailyReportAttachments({ reportId, userId }, executor);

  return {
    ...report,
    items: itemRows.map(mapDailyReportItem),
    plans: planRows.map(mapDailyReportPlan),
    attachments
  };
}

// List only the authenticated user's daily reports.
export async function listDailyReports({ userId, filters = {} }, executor = pool) {
  const params = [userId];
  const where = ['dr.user_id = ?'];

  if (filters.dateFrom) {
    where.push('dr.report_date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where.push('dr.report_date <= ?');
    params.push(filters.dateTo);
  }
  if (filters.status) {
    where.push('dr.status = ?');
    params.push(filters.status);
  }

  const [rows] = await executor.execute(
    `SELECT
      dr.*,
      p.project_code,
      p.project_name,
      p.project_manager,
      p.project_manager_user_id,
      p.status AS project_status
    FROM daily_reports dr
    INNER JOIN projects p ON p.id = dr.project_id
    WHERE ${where.join(' AND ')}
    ORDER BY dr.report_date DESC, dr.updated_at DESC, dr.id DESC`,
    params
  );

  return rows.map(mapDailyReportHeader);
}

// Create a draft or submitted report for the authenticated employee.
export async function createDailyReport({ userId, report }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await assertProjectAvailable(connection, report.projectId);

    const [result] = await connection.execute(
      `INSERT INTO daily_reports (
        user_id,
        report_date,
        project_id,
        status
      ) VALUES (?, ?, ?, ?)`,
      [userId, report.reportDate, report.projectId, report.status]
    );

    await replaceDailyReportRows(connection, result.insertId, report);
    await connection.commit();

    return getDailyReportById({ reportId: result.insertId, userId });
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new DailyReportError(
        DAILY_REPORT_ERROR.DUPLICATE_REPORT,
        'Daily report already exists for this user, date, and project',
        409,
        ['reportDate', 'projectId']
      );
    }
    throw error;
  } finally {
    connection.release();
  }
}

// Update a report owned by the authenticated employee.
export async function updateDailyReport({ reportId, userId, report }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await selectDailyReportHeader(connection, { reportId, userId, forUpdate: true });
    await assertProjectAvailable(connection, report.projectId);

    await connection.execute(
      `UPDATE daily_reports
      SET report_date = ?,
        project_id = ?,
        status = ?
      WHERE id = ?
        AND user_id = ?`,
      [report.reportDate, report.projectId, report.status, reportId, userId]
    );

    await replaceDailyReportRows(connection, reportId, report);
    await connection.commit();

    return getDailyReportById({ reportId, userId });
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new DailyReportError(
        DAILY_REPORT_ERROR.DUPLICATE_REPORT,
        'Daily report already exists for this user, date, and project',
        409,
        ['reportDate', 'projectId']
      );
    }
    throw error;
  } finally {
    connection.release();
  }
}

// Delete is only allowed for draft reports.
export async function deleteDailyReport({ reportId, userId }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const report = await selectDailyReportHeader(connection, { reportId, userId, forUpdate: true });
    if (report.status !== ReportStatus.DRAFT) {
      throw new DailyReportError(
        DAILY_REPORT_ERROR.DELETE_SUBMITTED,
        'Submitted daily reports cannot be deleted',
        409,
        ['status']
      );
    }

    await connection.execute('DELETE FROM daily_reports WHERE id = ? AND user_id = ?', [reportId, userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Build the DTO consumed by the M3 Excel exporter.
export async function getDailyReportExportDto({ reportId, userId }, executor = pool) {
  const report = await getDailyReportById({ reportId, userId }, executor);
  const [userRows] = await executor.execute(
    `SELECT id, account, display_name, department, organization_role, role, job_title
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [userId]
  );

  return {
    report,
    user: {
      id: userRows[0].id,
      account: userRows[0].account,
      name: userRows[0].display_name,
      department: userRows[0].department,
      organizationRole: userRows[0].organization_role,
      role: userRows[0].role,
      jobTitle: userRows[0].job_title
    }
  };
}

// Validate an attachment target before parsing the multipart body.
export async function assertDailyReportAttachmentTarget({ reportId, userId }, executor = pool) {
  await selectDailyReportHeader(executor, { reportId, userId });
}

// Daily report attachments accept image MIME types only.
function normalizeDailyReportUploadFile(file) {
  if (!file || file.tooLarge || !Buffer.isBuffer(file.buffer)) {
    throw new DailyReportError(
      DAILY_REPORT_ERROR.INVALID_ATTACHMENT_FILE,
      'Invalid daily report attachment file',
      400,
      ['file']
    );
  }

  const mimeType = String(file.mimeType || '').trim();
  if (!mimeType.startsWith('image/')) {
    throw new DailyReportError(
      DAILY_REPORT_ERROR.INVALID_ATTACHMENT_FILE,
      'Daily report attachments must be images',
      400,
      ['file']
    );
  }

  return file;
}

// List attachment metadata for a report owned by the authenticated user.
export async function listDailyReportAttachments({ reportId, userId }, executor = pool) {
  await selectDailyReportHeader(executor, { reportId, userId });
  const [rows] = await executor.execute(
    `SELECT
      a.*,
      u.account AS uploader_account,
      u.display_name AS uploader_display_name
    FROM daily_report_attachments a
    LEFT JOIN users u ON u.id = a.uploaded_by_user_id
    WHERE a.daily_report_id = ?
    ORDER BY a.created_at DESC, a.id DESC`,
    [reportId]
  );

  return rows.map(mapDailyReportAttachment);
}

// Save image attachment metadata and the file in one business operation.
export async function uploadDailyReportAttachment({ reportId, userId, file }) {
  const uploadFile = normalizeDailyReportUploadFile(file);
  const storageKey = createDailyReportAttachmentStorageKey({ dailyReportId: reportId });
  let fileWritten = false;
  let committed = false;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await selectDailyReportHeader(connection, { reportId, userId, forUpdate: true });
    const stored = await writeDailyReportAttachmentFile(storageKey, uploadFile.buffer);
    fileWritten = true;

    const [result] = await connection.execute(
      `INSERT INTO daily_report_attachments (
        daily_report_id,
        original_file_name,
        storage_key,
        mime_type,
        file_size,
        uploaded_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [reportId, uploadFile.originalFileName, storageKey, uploadFile.mimeType, stored.size, userId]
    );

    await connection.commit();
    committed = true;

    const [rows] = await pool.execute(
      `SELECT
        a.*,
        u.account AS uploader_account,
        u.display_name AS uploader_display_name
      FROM daily_report_attachments a
      LEFT JOIN users u ON u.id = a.uploaded_by_user_id
      WHERE a.id = ?
      LIMIT 1`,
      [result.insertId]
    );

    return mapDailyReportAttachment(rows[0]);
  } catch (error) {
    if (!committed) {
      await connection.rollback();
    }
    if (fileWritten) {
      await cleanupDailyReportAttachmentFile(storageKey);
    }
    throw error;
  } finally {
    connection.release();
  }
}

// Resolve an attachment download owned by the authenticated report owner.
export async function getDailyReportAttachmentDownload({ reportId, attachmentId, userId }, executor = pool) {
  await selectDailyReportHeader(executor, { reportId, userId });
  const [rows] = await executor.execute(
    `SELECT *
    FROM daily_report_attachments
    WHERE id = ?
      AND daily_report_id = ?
    LIMIT 1`,
    [attachmentId, reportId]
  );

  if (rows.length === 0) {
    throw new DailyReportError(DAILY_REPORT_ERROR.ATTACHMENT_NOT_FOUND, 'Daily report attachment not found', 404, [
      'attachmentId'
    ]);
  }

  try {
    const filePath = await assertDailyReportAttachmentFileReadable(rows[0].storage_key);
    return {
      filePath,
      originalFileName: rows[0].original_file_name,
      mimeType: rows[0].mime_type,
      fileSize: Number(rows[0].file_size)
    };
  } catch {
    throw new DailyReportError(
      DAILY_REPORT_ERROR.ATTACHMENT_FILE_MISSING,
      'Daily report attachment file missing',
      404,
      ['attachmentId']
    );
  }
}

// Delete attachment metadata and best-effort remove the stored file.
export async function deleteDailyReportAttachment({ reportId, attachmentId, userId }) {
  const connection = await pool.getConnection();
  let storageKey = '';

  try {
    await connection.beginTransaction();
    await selectDailyReportHeader(connection, { reportId, userId, forUpdate: true });
    const [rows] = await connection.execute(
      `SELECT *
      FROM daily_report_attachments
      WHERE id = ?
        AND daily_report_id = ?
      LIMIT 1
      FOR UPDATE`,
      [attachmentId, reportId]
    );

    if (rows.length === 0) {
      throw new DailyReportError(DAILY_REPORT_ERROR.ATTACHMENT_NOT_FOUND, 'Daily report attachment not found', 404, [
        'attachmentId'
      ]);
    }

    storageKey = rows[0].storage_key;
    await connection.execute('DELETE FROM daily_report_attachments WHERE id = ?', [attachmentId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await cleanupDailyReportAttachmentFile(storageKey);
}
