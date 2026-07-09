import { pool } from '../db/pool.js';
import {
  assertDailyReportEditable,
  DAILY_REPORT_ERROR,
  DailyReportError,
  DailyTaskSourceType
} from '../domain/dailyReports.js';
import { ReportStatus } from '../domain/reports.js';
import { formatIsoDate, getWeekStart, parseIsoDate } from '../domain/reportWorkdays.js';
import { buildProjectVisibilityCondition } from './projects/visibility.js';
import {
  assertDailyReportAttachmentFileReadable,
  cleanupDailyReportAttachmentFile,
  createDailyReportAttachmentStorageKey,
  writeDailyReportAttachmentFile
} from '../storage/dailyReportAttachmentStorage.js';

// Format MySQL DATE values through Asia/Shanghai so API dates stay date-only.
function formatDateOnly(value) {
  if (!(value instanceof Date)) {
    return String(value).slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}-${byType.month}-${byType.day}`;
}

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
    reportDate: formatDateOnly(row.report_date),
    projectId: row.project_id,
    status: row.status,
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at,
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
    projectId: row.project_id,
    sourceType: row.source_type || DailyTaskSourceType.LEGACY_UNKNOWN,
    sourcePlanTaskKey: row.source_plan_task_key,
    executionStatus: row.execution_status,
    workContent: row.work_content,
    completionProgress: row.completion_progress,
    completedAt: row.completed_at ? String(row.completed_at).slice(0, 5) : null,
    responsiblePerson: row.responsible_person,
    deviationAndCorrectiveAction: row.deviation_and_corrective_action
  };
}

// Map one next-day plan row.
function mapDailyReportPlan(row) {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    projectId: row.project_id,
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

// Search visible non-completed projects by code or name, matching the real database fields.
export async function searchActiveProjectsForDailyReports({ q = '', limit = 20, user } = {}, executor = pool) {
  const keyword = String(q || '').trim();
  const visibility = buildProjectVisibilityCondition(user, 'p');
  const params = [...visibility.params];
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  let keywordClause = '';

  if (keyword) {
    keywordClause = 'AND (p.project_code LIKE ? OR p.project_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const [rows] = await executor.execute(
    `SELECT
      p.id,
      p.project_code,
      p.project_name,
      p.project_manager,
      p.project_manager_user_id,
      p.status
    FROM projects p
    WHERE p.status <> 'completed'
      AND ${visibility.sql}
      ${keywordClause}
    ORDER BY p.project_code ASC, p.id ASC
    LIMIT ${safeLimit}`,
    params
  );

  return rows.map(mapDailyReportProject);
}

// Lock and validate the project used by a report write.
async function assertProjectAvailable(executor, { projectId, user, forUpdate = true }) {
  const visibility = buildProjectVisibilityCondition(user, 'p');
  const [rows] = await executor.execute(
    `SELECT p.id, p.status
    FROM projects p
    WHERE p.id = ?
      AND ${visibility.sql}
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, ...visibility.params]
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

async function selectDailyReportIdByUniqueKey(executor, { userId, reportDate, projectId }) {
  const [rows] = await executor.execute(
    `SELECT id
    FROM daily_reports
    WHERE user_id = ?
      AND report_date = ?
      AND project_id = ?
    LIMIT 1`,
    [userId, reportDate, projectId]
  );

  return rows[0]?.id || null;
}

// Replace child rows in a stable sort order.
async function replaceDailyReportRows(executor, reportId, { projectId, items, plans }) {
  await executor.execute('DELETE FROM daily_report_items WHERE daily_report_id = ?', [reportId]);
  await executor.execute('DELETE FROM daily_report_plans WHERE daily_report_id = ?', [reportId]);

  for (const item of items) {
    await executor.execute(
      `INSERT INTO daily_report_items (
        daily_report_id,
        sort_order,
        project_id,
        source_type,
        source_plan_task_key,
        execution_status,
        work_content,
        completion_progress,
        completed_at,
        responsible_person,
        deviation_and_corrective_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        item.sortOrder,
        projectId,
        item.sourceType,
        item.sourcePlanTaskKey,
        item.executionStatus,
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
        project_id,
        planned_work_content,
        responsible_person,
        planned_complete_at,
        collaborating_center,
        collaboration_item
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        plan.sortOrder,
        projectId,
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
    `SELECT
      dri.*,
      COALESCE(dri.project_id, ?) AS project_id
    FROM daily_report_items dri
    WHERE dri.daily_report_id = ?
    ORDER BY sort_order ASC, id ASC`,
    [report.projectId, reportId]
  );
  const [planRows] = await executor.execute(
    `SELECT
      drp.*,
      COALESCE(drp.project_id, ?) AS project_id
    FROM daily_report_plans drp
    WHERE drp.daily_report_id = ?
    ORDER BY sort_order ASC, id ASC`,
    [report.projectId, reportId]
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

export async function getDailyReportPlanSuggestion({ user, reportDate, projectId }, executor = pool) {
  await assertProjectAvailable(executor, { projectId, user, forUpdate: false });
  const [rows] = await executor.execute(
    `SELECT
      wrp.id,
      wrp.task_key,
      wrp.weekly_report_id,
      wrp.sort_order,
      wrp.project_id,
      wrp.work_task,
      wrp.work_target,
      wrp.planned_date
    FROM weekly_report_plans wrp
    INNER JOIN weekly_reports wr ON wr.id = wrp.weekly_report_id
    WHERE wr.user_id = ?
      AND wrp.project_id = ?
      AND wrp.planned_date = ?
    ORDER BY wr.week_start DESC, wrp.sort_order ASC, wrp.id ASC`,
    [user.id, projectId, reportDate]
  );

  return {
    reportDate,
    projectId,
    items: rows.map((row) => ({
      id: row.id,
      taskKey: row.task_key,
      weeklyReportId: row.weekly_report_id,
      sortOrder: row.sort_order,
      projectId: row.project_id,
      workTask: row.work_task,
      workTarget: row.work_target,
      plannedDate: formatDateOnly(row.planned_date)
    }))
  };
}

// Derive the current and previous week windows used by daily-to-weekly plan links.
function resolveDailyReportPlanWindow(reportDate) {
  const weekStart = getWeekStart(reportDate);
  const weekStartDate = parseIsoDate(weekStart);
  const weekEndDate = new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  const previousWeekStartDate = new Date(weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    weekStart,
    weekEnd: formatIsoDate(weekEndDate),
    previousWeekStart: formatIsoDate(previousWeekStartDate)
  };
}

// List the selectable weekly plans for one daily report's project and natural week.
export async function listAvailableWeeklyPlansForDailyReport({ user, reportDate, projectId }, executor = pool) {
  await assertProjectAvailable(executor, { projectId, user, forUpdate: false });
  const window = resolveDailyReportPlanWindow(reportDate);
  const [rows] = await executor.execute(
    `SELECT
      wrp.id,
      wrp.task_key,
      wrp.weekly_report_id,
      wr.status AS weekly_report_status,
      wrp.sort_order,
      wrp.project_id,
      wrp.work_task,
      wrp.work_target,
      wrp.planned_date,
      (
        SELECT dri.execution_status
        FROM daily_reports dr
        INNER JOIN daily_report_items dri ON dri.daily_report_id = dr.id
        WHERE dr.user_id = wr.user_id
          AND dr.status = 'submitted'
          AND dr.report_date BETWEEN ? AND ?
          AND dri.source_plan_task_key = wrp.task_key
        ORDER BY dr.report_date DESC, dri.sort_order DESC, dri.id DESC
        LIMIT 1
      ) AS latest_execution_status
    FROM weekly_report_plans wrp
    INNER JOIN weekly_reports wr ON wr.id = wrp.weekly_report_id
    WHERE wr.user_id = ?
      AND wr.week_start = ?
      AND wr.status IN ('draft', 'submitted')
      AND wrp.project_id = ?
      AND wrp.planned_date BETWEEN ? AND ?
      AND wrp.task_key IS NOT NULL
      AND wrp.task_key <> ''
    ORDER BY wrp.planned_date ASC, wrp.sort_order ASC, wrp.id ASC`,
    [
      window.weekStart,
      window.weekEnd,
      user.id,
      window.previousWeekStart,
      projectId,
      window.weekStart,
      window.weekEnd
    ]
  );

  return {
    reportDate,
    projectId,
    weekStart: window.weekStart,
    weekEnd: window.weekEnd,
    items: rows.map((row) => ({
      id: row.id,
      taskKey: row.task_key,
      weeklyReportId: row.weekly_report_id,
      weeklyReportStatus: row.weekly_report_status,
      sortOrder: row.sort_order,
      projectId: row.project_id,
      workTask: row.work_task,
      workTarget: row.work_target,
      plannedDate: formatDateOnly(row.planned_date),
      latestExecutionStatus: row.latest_execution_status || null
    }))
  };
}

// Submitted daily rows must reference only source plans available in the same scoped list.
async function assertDailyReportItemTaskSources(executor, { user, report }) {
  if (report.status !== ReportStatus.SUBMITTED) {
    return;
  }

  const suggestion = await listAvailableWeeklyPlansForDailyReport(
    { user, reportDate: report.reportDate, projectId: report.projectId },
    executor
  );
  const availableTaskKeys = new Set(suggestion.items.map((item) => item.taskKey));

  report.items.forEach((item, index) => {
    if (item.sourceType === DailyTaskSourceType.WEEKLY_PLAN && !availableTaskKeys.has(item.sourcePlanTaskKey)) {
      throw new DailyReportError(
        DAILY_REPORT_ERROR.INVALID_TASK_SOURCE,
        'Daily report item source plan is not available for this project and week',
        409,
        [`items.${index}.sourcePlanTaskKey`]
      );
    }
  });
}

// Create a draft or submitted report for the authenticated employee.
export async function createDailyReport({ user, report }) {
  const userId = user.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await assertProjectAvailable(connection, { projectId: report.projectId, user });
    await assertDailyReportItemTaskSources(connection, { user, report });

    const [result] = await connection.execute(
      `INSERT INTO daily_reports (
        user_id,
        report_date,
        project_id,
        status,
        submitted_by_user_id,
        submitted_at
      ) VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'submitted' THEN NOW() ELSE NULL END)`,
      [
        userId,
        report.reportDate,
        report.projectId,
        report.status,
        report.status === ReportStatus.SUBMITTED ? userId : null,
        report.status
      ]
    );

    await replaceDailyReportRows(connection, result.insertId, report);
    await connection.commit();

    return getDailyReportById({ reportId: result.insertId, userId });
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      const existingReportId = await selectDailyReportIdByUniqueKey(pool, {
        userId,
        reportDate: report.reportDate,
        projectId: report.projectId
      });

      if (existingReportId) {
        return updateDailyReport({ reportId: existingReportId, user, report });
      }

      throw new DailyReportError(
        DAILY_REPORT_ERROR.DUPLICATE_REPORT,
        '当日已存在该项目的日报记录。',
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
export async function updateDailyReport({ reportId, user, report }) {
  const userId = user.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const currentReport = await selectDailyReportHeader(connection, { reportId, userId, forUpdate: true });
    assertDailyReportEditable(currentReport.status);
    const nextReport =
      currentReport.status === ReportStatus.SUBMITTED ? { ...report, status: ReportStatus.SUBMITTED } : report;
    await assertProjectAvailable(connection, { projectId: nextReport.projectId, user });
    await assertDailyReportItemTaskSources(connection, { user, report: nextReport });

    await connection.execute(
      `UPDATE daily_reports
      SET report_date = ?,
        project_id = ?,
        status = ?,
        submitted_by_user_id = CASE WHEN ? = 'submitted' THEN ? ELSE NULL END,
        submitted_at = CASE WHEN ? = 'submitted' THEN COALESCE(submitted_at, NOW()) ELSE NULL END
      WHERE id = ?
        AND user_id = ?`,
      [
        nextReport.reportDate,
        nextReport.projectId,
        nextReport.status,
        nextReport.status,
        userId,
        nextReport.status,
        reportId,
        userId
      ]
    );

    await replaceDailyReportRows(connection, reportId, nextReport);
    await connection.commit();

    return getDailyReportById({ reportId, userId });
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new DailyReportError(
        DAILY_REPORT_ERROR.DUPLICATE_REPORT,
        '当日已存在该项目的日报记录。',
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
  report.attachments = await listDailyReportAttachmentsForExport({ reportId, userId }, executor);

  const [userRows] = await executor.execute(
    `SELECT id, account, display_name, department, organization_role, role
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [userId]
  );

  // Query the current stage name for the project so B3 can display it in the export.
  let currentStageName = '';
  if (report.projectId) {
    const [stageRows] = await executor.execute(
      `SELECT stage_name
      FROM project_stages
      WHERE project_id = ?
        AND stage_status = 'current'
      LIMIT 1`,
      [report.projectId]
    );
    currentStageName = stageRows[0]?.stage_name || '';
  }

  return {
    report,
    user: {
      id: userRows[0].id,
      account: userRows[0].account,
      name: userRows[0].display_name,
      department: userRows[0].department,
      organizationRole: userRows[0].organization_role,
      role: userRows[0].role
    },
    currentStageName
  };
}

// Validate an attachment target before parsing the multipart body.
export async function assertDailyReportAttachmentTarget({ reportId, userId }, executor = pool) {
  const report = await selectDailyReportHeader(executor, { reportId, userId });
  assertDailyReportEditable(report.status);
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

async function listDailyReportAttachmentsForExport({ reportId, userId }, executor = pool) {
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

  return rows.map((row) => ({
    ...mapDailyReportAttachment(row),
    storageKey: row.storage_key
  }));
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
    const currentReport = await selectDailyReportHeader(connection, { reportId, userId, forUpdate: true });
    assertDailyReportEditable(currentReport.status);
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
    const currentReport = await selectDailyReportHeader(connection, { reportId, userId, forUpdate: true });
    assertDailyReportEditable(currentReport.status);
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
