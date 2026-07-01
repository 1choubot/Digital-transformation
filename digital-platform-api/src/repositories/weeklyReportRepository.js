import crypto from 'node:crypto';
import { pool } from '../db/pool.js';
import {
  canEvaluateWeeklyReport,
  canFinalizeWeeklyReport,
  canReadManagedWeeklyReport,
  ReportStatus
} from '../domain/reports.js';
import { getExpectedWorkdatesForWeek, resolveWeeklyRestMode } from '../domain/reportWorkdays.js';
import {
  WEEKLY_REPORT_ERROR,
  WeeklyReportError
} from '../domain/weeklyReports.js';
import { env } from '../config/env.js';
import { findLatestWeeklyRestModeAnchor } from './reportSettingsRepository.js';

// MySQL can return DATE values as Date objects; the API always emits YYYY-MM-DD.
function dateOnly(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(value || '').slice(0, 10);
}

// MySQL DATETIME values are local business times, so emit local strings instead of UTC JSON.
function dateTime(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');
    const second = String(value.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  return String(value).replace('T', ' ').replace(/\.\d{3}Z$/, '').slice(0, 19);
}

// Parse JSON score columns defensively because mysql2 may return objects or strings.
function parseJson(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  return JSON.parse(value);
}

// Convert weekly_reports rows into API field names.
function mapWeeklyReportRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    weekStart: dateOnly(row.week_start),
    weekEnd: dateOnly(row.week_end),
    status: row.status,
    aiScore: parseJson(row.ai_score),
    aiEvaluatedAt: dateTime(row.ai_evaluated_at),
    aiEvaluationSource: row.ai_evaluation_source,
    aiEvaluationError: row.ai_evaluation_error,
    // Final review fields are manual evaluator decisions and must not be derived from aiScore.
    finalScore: row.final_score === null || row.final_score === undefined ? null : Number(row.final_score),
    finalGrade: row.final_grade,
    finalComment: row.final_comment,
    finalReviewedByUserId: row.final_reviewed_by_user_id,
    finalReviewedByName: row.final_reviewer_display_name || row.final_reviewer_account || null,
    finalReviewedAt: dateTime(row.final_reviewed_at),
    createdAt: dateTime(row.created_at),
    updatedAt: dateTime(row.updated_at)
  };
}

// Convert summary rows into API field names.
function mapSummaryRow(row) {
  return {
    id: row.id,
    weeklyReportId: row.weekly_report_id,
    sortOrder: row.sort_order,
    workTask: row.work_task,
    workTarget: row.work_target,
    plannedDate: dateOnly(row.planned_date),
    completionStatus: row.completion_status,
    completionDescription: row.completion_description,
    completedDate: dateOnly(row.completed_date)
  };
}

// Convert next-week plan rows into API field names.
function mapPlanRow(row) {
  return {
    id: row.id,
    weeklyReportId: row.weekly_report_id,
    sortOrder: row.sort_order,
    workTask: row.work_task,
    workTarget: row.work_target,
    plannedDate: dateOnly(row.planned_date),
    responsiblePerson: row.responsible_person
  };
}

// Convert joined daily report evidence rows into the exact AI/rule input shape.
function mapDailyEvidenceRow(row) {
  return {
    reportDate: dateOnly(row.report_date),
    projectCode: row.project_code,
    projectName: row.project_name,
    projectLabel: [row.project_code, row.project_name].filter(Boolean).join(' / '),
    workContent: row.work_content,
    completionProgress: row.completion_progress
  };
}

// Weekday labels are part of the weekly-vs-daily comparison table contract.
function weekdayLabel(isoDate) {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return labels[new Date(`${isoDate}T00:00:00`).getDay()];
}

// Keep matching deterministic by using simple normalized token inclusion.
function normalizeComparisonText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Return whether the weekly summary and daily item look related enough for an initial match.
function compareWeeklyAndDailyText(summary, dailyItem) {
  const weeklyText = normalizeComparisonText(`${summary.workTask} ${summary.workTarget}`);
  const dailyText = normalizeComparisonText(`${dailyItem?.projectName || ''} ${dailyItem?.workContent || ''}`);
  const tokens = weeklyText.split(/\s+/).filter((token) => token.length >= 2);
  const matched = tokens.some((token) => dailyText.includes(token));

  return {
    matchStatus: matched ? 'matched' : 'unmatched',
    matchReason: matched ? '周报总结与日报内容存在关键词匹配' : '未发现明显关键词匹配'
  };
}

// Convert joined weekly report owner rows into the permission model used by route guards.
function mapWeeklyReportUserRow(row) {
  return {
    id: row.user_id,
    account: row.account,
    displayName: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled),
    isPlatformAdmin: Boolean(row.is_platform_admin)
  };
}

// Fetch summary and plan children after a weekly report row is known.
async function attachWeeklyReportChildren(report, executor = pool) {
  const [summaryRows] = await executor.execute(
    `SELECT *
    FROM weekly_report_summaries
    WHERE weekly_report_id = ?
    ORDER BY sort_order ASC`,
    [report.id]
  );
  const [planRows] = await executor.execute(
    `SELECT *
    FROM weekly_report_plans
    WHERE weekly_report_id = ?
    ORDER BY sort_order ASC`,
    [report.id]
  );

  return {
    ...report,
    summaries: summaryRows.map(mapSummaryRow),
    plans: planRows.map(mapPlanRow)
  };
}

// Normalize duplicate-key errors to the weekly report API contract.
function throwDuplicateIfNeeded(error) {
  if (error?.code === 'ER_DUP_ENTRY') {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.DUPLICATE_REPORT, 'Weekly report already exists', 409);
  }
}

// Write child summary rows in a stable display order.
async function insertWeeklyReportSummaries(executor, weeklyReportId, summaries) {
  for (const item of summaries) {
    await executor.execute(
      `INSERT INTO weekly_report_summaries (
        weekly_report_id,
        sort_order,
        work_task,
        work_target,
        planned_date,
        completion_status,
        completion_description,
        completed_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        weeklyReportId,
        item.sortOrder,
        item.workTask,
        item.workTarget,
        item.plannedDate,
        item.completionStatus,
        item.completionDescription,
        item.completedDate
      ]
    );
  }
}

// Write child plan rows in a stable display order.
async function insertWeeklyReportPlans(executor, weeklyReportId, plans) {
  for (const item of plans) {
    await executor.execute(
      `INSERT INTO weekly_report_plans (
        task_key,
        weekly_report_id,
        sort_order,
        work_task,
        work_target,
        planned_date,
        responsible_person
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), weeklyReportId, item.sortOrder, item.workTask, item.workTarget, item.plannedDate, item.responsiblePerson]
    );
  }
}

// Fetch one owned weekly report or raise a 404.
export async function getWeeklyReportById({ reportId, userId }, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT
      wr.*,
      reviewer.display_name AS final_reviewer_display_name,
      reviewer.account AS final_reviewer_account
    FROM weekly_reports wr
    LEFT JOIN users reviewer ON reviewer.id = wr.final_reviewed_by_user_id
    WHERE wr.id = ? AND wr.user_id = ?
    LIMIT 1`,
    [reportId, userId]
  );
  const report = mapWeeklyReportRow(rows[0]);
  if (!report) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.NOT_FOUND, 'Weekly report not found', 404);
  }

  return attachWeeklyReportChildren(report, executor);
}

// Fetch one report for internal management views without owner filtering.
async function getWeeklyReportByIdForSystem(reportId, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT
      wr.*,
      reviewer.display_name AS final_reviewer_display_name,
      reviewer.account AS final_reviewer_account
    FROM weekly_reports wr
    LEFT JOIN users reviewer ON reviewer.id = wr.final_reviewed_by_user_id
    WHERE wr.id = ?
    LIMIT 1`,
    [reportId]
  );
  const report = mapWeeklyReportRow(rows[0]);
  if (!report) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.NOT_FOUND, 'Weekly report not found', 404);
  }

  return attachWeeklyReportChildren(report, executor);
}

// Fetch one report with its owner so reviewer permissions can be evaluated before scoring.
export async function getWeeklyReportWithUserForReview(reportId, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT
      wr.*,
      reviewer.display_name AS final_reviewer_display_name,
      reviewer.account AS final_reviewer_account,
      u.id AS user_id,
      u.account,
      u.display_name,
      u.department,
      u.organization_role,
      u.role,
      u.is_enabled,
      u.is_platform_admin
    FROM weekly_reports wr
    INNER JOIN users u ON u.id = wr.user_id
    LEFT JOIN users reviewer ON reviewer.id = wr.final_reviewed_by_user_id
    WHERE wr.id = ?
    LIMIT 1`,
    [reportId]
  );
  const row = rows[0];
  const report = mapWeeklyReportRow(row);
  if (!report) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.NOT_FOUND, 'Weekly report not found', 404);
  }

  return {
    report: await attachWeeklyReportChildren(report, executor),
    user: mapWeeklyReportUserRow(row)
  };
}

// Read a report when the requester is either the owner or an authorized reviewer.
export async function getWeeklyReportForAuthorizedRead({ reportId, requesterUser }) {
  const target = await getWeeklyReportWithUserForReview(reportId);
  if (String(target.report.userId) === String(requesterUser.id) || canReadManagedWeeklyReport(requesterUser, target.user)) {
    return target;
  }

  throw new WeeklyReportError(WEEKLY_REPORT_ERROR.FORBIDDEN, 'Weekly report read forbidden', 403);
}

// List the current user's weekly reports, newest week first.
export async function listWeeklyReports({ userId, filters = {} }) {
  const params = [userId];
  let where = 'WHERE user_id = ?';

  if (filters.weekStart) {
    where += ' AND week_start = ?';
    params.push(filters.weekStart);
  }

  const [rows] = await pool.execute(
    `SELECT *
    FROM weekly_reports
    ${where}
    ORDER BY week_start DESC, id DESC`,
    params
  );

  return rows.map(mapWeeklyReportRow);
}

// Create one weekly report and its child rows in a transaction.
export async function createWeeklyReport({ userId, report }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO weekly_reports (
        user_id,
        week_start,
        week_end,
        status
      ) VALUES (?, ?, ?, ?)`,
      [userId, report.weekStart, report.weekEnd, report.status]
    );

    await insertWeeklyReportSummaries(connection, result.insertId, report.summaries);
    await insertWeeklyReportPlans(connection, result.insertId, report.plans);
    await connection.commit();

    return getWeeklyReportById({ reportId: result.insertId, userId });
  } catch (error) {
    await connection.rollback();
    throwDuplicateIfNeeded(error);
    throw error;
  } finally {
    connection.release();
  }
}

// Replace a weekly report and invalidate cached scoring when content changes.
export async function updateWeeklyReport({ reportId, userId, report }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const existing = await getWeeklyReportById({ reportId, userId }, connection);

    await connection.execute(
      `UPDATE weekly_reports
      SET week_start = ?,
        week_end = ?,
        status = ?,
        ai_score = NULL,
        ai_evaluated_at = NULL,
        ai_evaluation_source = NULL,
        ai_evaluation_error = NULL,
        final_score = NULL,
        final_grade = NULL,
        final_comment = NULL,
        final_reviewed_by_user_id = NULL,
        final_reviewed_at = NULL
      WHERE id = ? AND user_id = ?`,
      [report.weekStart, report.weekEnd, report.status, existing.id, userId]
    );
    await connection.execute('DELETE FROM weekly_report_summaries WHERE weekly_report_id = ?', [existing.id]);
    await connection.execute('DELETE FROM weekly_report_plans WHERE weekly_report_id = ?', [existing.id]);
    await insertWeeklyReportSummaries(connection, existing.id, report.summaries);
    await insertWeeklyReportPlans(connection, existing.id, report.plans);
    await connection.commit();

    return getWeeklyReportById({ reportId, userId });
  } catch (error) {
    await connection.rollback();
    throwDuplicateIfNeeded(error);
    throw error;
  } finally {
    connection.release();
  }
}

// Delete is limited to drafts so submitted records remain auditable.
export async function deleteWeeklyReport({ reportId, userId }) {
  const report = await getWeeklyReportById({ reportId, userId });
  if (report.status !== ReportStatus.DRAFT) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.DELETE_SUBMITTED, 'Only draft weekly reports can be deleted', 409);
  }

  await pool.execute('DELETE FROM weekly_reports WHERE id = ? AND user_id = ?', [reportId, userId]);
}

// Build the export DTO with user display fields included.
export async function getWeeklyReportExportDto({ reportId, userId }) {
  const report = await getWeeklyReportById({ reportId, userId });
  const [rows] = await pool.execute(
    `SELECT id, account, display_name, department, organization_role, role, job_title
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [userId]
  );

  return {
    report,
    user: {
      id: rows[0].id,
      account: rows[0].account,
      name: rows[0].display_name,
      department: rows[0].department,
      organizationRole: rows[0].organization_role,
      role: rows[0].role,
      jobTitle: rows[0].job_title
    }
  };
}

// Collect only submitted daily completed-work rows inside the evaluated week.
export async function listWeeklyDailyEvidence({ userId, weekStart, weekEnd }, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT
      dr.report_date,
      p.project_code,
      p.project_name,
      dri.work_content,
      dri.completion_progress
    FROM daily_reports dr
    INNER JOIN daily_report_items dri ON dri.daily_report_id = dr.id
    INNER JOIN projects p ON p.id = dr.project_id
    WHERE dr.user_id = ?
      AND dr.status = 'submitted'
      AND dr.report_date BETWEEN ? AND ?
    ORDER BY dr.report_date ASC, dr.id ASC, dri.sort_order ASC`,
    [userId, weekStart, weekEnd]
  );

  return rows.map(mapDailyEvidenceRow);
}

// Build comparison rows from an already loaded report and its submitted daily work.
function buildWeeklyComparisonRows(report, dailyEvidence) {
  const dailyByDate = new Map();
  for (const item of dailyEvidence) {
    const list = dailyByDate.get(item.reportDate) || [];
    list.push(item);
    dailyByDate.set(item.reportDate, list);
  }

  const rows = [];
  const usedDailyItems = new Set();
  for (const summary of report.summaries) {
    const dailyItems = dailyByDate.get(summary.completedDate) || [];
    if (dailyItems.length === 0) {
      rows.push({
        date: summary.completedDate,
        weekday: weekdayLabel(summary.completedDate),
        weeklyTask: summary.workTask,
        weeklySummaryText: summary.workTarget,
        dailyProjectName: null,
        dailyProjectLabel: null,
        dailyWorkContent: null,
        dailyCompletionProgress: null,
        dailyCompletedAt: null,
        weeklyCompletedDate: summary.completedDate,
        matchStatus: 'weekly_only',
        matchReason: '该日期有周报总结但没有已提交日报'
      });
      continue;
    }

    for (const dailyItem of dailyItems) {
      usedDailyItems.add(`${dailyItem.reportDate}|${dailyItem.projectCode}|${dailyItem.workContent}`);
      const match = compareWeeklyAndDailyText(summary, dailyItem);
      rows.push({
        date: summary.completedDate,
        weekday: weekdayLabel(summary.completedDate),
        weeklyTask: summary.workTask,
        weeklySummaryText: summary.workTarget,
        dailyProjectName: dailyItem.projectName,
        dailyProjectLabel: dailyItem.projectLabel,
        dailyWorkContent: dailyItem.workContent,
        dailyCompletionProgress: dailyItem.completionProgress,
        // The comparison table uses the daily report date as the actual completion date.
        dailyCompletedAt: dailyItem.reportDate,
        weeklyCompletedDate: summary.completedDate,
        matchStatus: match.matchStatus,
        matchReason: match.matchReason
      });
    }
  }

  for (const dailyItem of dailyEvidence) {
    const key = `${dailyItem.reportDate}|${dailyItem.projectCode}|${dailyItem.workContent}`;
    if (usedDailyItems.has(key)) {
      continue;
    }

    rows.push({
      date: dailyItem.reportDate,
      weekday: weekdayLabel(dailyItem.reportDate),
      weeklyTask: null,
      weeklySummaryText: null,
      dailyProjectName: dailyItem.projectName,
      dailyProjectLabel: dailyItem.projectLabel,
      dailyWorkContent: dailyItem.workContent,
      dailyCompletionProgress: dailyItem.completionProgress,
      // The comparison table uses the daily report date as the actual completion date.
      dailyCompletedAt: dailyItem.reportDate,
      weeklyCompletedDate: null,
      matchStatus: 'daily_only',
      matchReason: '该日期有已提交日报但没有对应周报总结'
    });
  }

  return {
    rows: rows.sort((left, right) => String(left.date).localeCompare(String(right.date)))
  };
}

// Build weekly-vs-daily comparison rows from weekly summaries and submitted daily work.
export async function getWeeklyReportComparisonTable({ reportId, requesterUser }) {
  const target = await getWeeklyReportWithUserForReview(reportId);
  if (!canEvaluateWeeklyReport(requesterUser, target.user)) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.FORBIDDEN, 'Weekly comparison table forbidden', 403);
  }

  const dailyEvidence = await listWeeklyDailyEvidence({
    userId: target.report.userId,
    weekStart: target.report.weekStart,
    weekEnd: target.report.weekEnd
  });
  const comparison = buildWeeklyComparisonRows(target.report, dailyEvidence);

  return {
    report: target.report,
    targetUser: target.user,
    rows: comparison.rows
  };
}

// Resolve the alternating workday context used by scoring and audit fields.
export async function resolveWeeklyReportWorkdayContext(weekStart, executor = pool) {
  const latestAnchor = await findLatestWeeklyRestModeAnchor(weekStart, executor);
  const resolvedRestMode = resolveWeeklyRestMode({
    targetWeekStart: weekStart,
    latestAnchor,
    defaultMode: env.reports.defaultWeeklyRestMode
  });

  return {
    resolvedRestMode,
    restModeAnchorWeekStart: latestAnchor?.weekStart || null,
    workdaySource: latestAnchor ? 'alternating_manual_rest_mode' : 'default_double_rest',
    expectedWorkdates: getExpectedWorkdatesForWeek(weekStart, resolvedRestMode)
  };
}

// Persist an evaluation result after AI or fallback scoring.
export async function saveWeeklyReportEvaluation({ reportId, score, source, error }) {
  await pool.execute(
    `UPDATE weekly_reports
    SET ai_score = ?,
      ai_evaluated_at = NOW(),
      ai_evaluation_source = ?,
      ai_evaluation_error = ?
    WHERE id = ?`,
    [JSON.stringify(score), source, error ? String(error).slice(0, 1000) : null, reportId]
  );

  return getWeeklyReportByIdForSystem(reportId);
}

// Persist the authorized evaluator's final manual weekly review.
export async function saveWeeklyReportFinalReview({ reportId, evaluatorUser, finalReview }) {
  const target = await getWeeklyReportWithUserForReview(reportId);
  if (!canFinalizeWeeklyReport(evaluatorUser, target.user)) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.FORBIDDEN, 'Weekly final review forbidden', 403);
  }

  await pool.execute(
    `UPDATE weekly_reports
    SET final_score = ?,
      final_grade = ?,
      final_comment = ?,
      final_reviewed_by_user_id = ?,
      final_reviewed_at = NOW()
    WHERE id = ?`,
    [
      finalReview.finalScore,
      finalReview.finalGrade,
      finalReview.finalComment,
      evaluatorUser.id,
      reportId
    ]
  );

  return getWeeklyReportByIdForSystem(reportId);
}

// Return a cached evaluation unless force=true was requested.
export async function getWeeklyReportEvaluationTarget({ reportId, evaluatorUser, force = false }) {
  const target = await getWeeklyReportWithUserForReview(reportId);
  const { report, user: targetUser } = target;
  if (!canEvaluateWeeklyReport(evaluatorUser, targetUser)) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.FORBIDDEN, 'Weekly report evaluation forbidden', 403);
  }

  if (report.status !== ReportStatus.SUBMITTED) {
    throw new WeeklyReportError(
      WEEKLY_REPORT_ERROR.EVALUATE_SUBMITTED_ONLY,
      'Only submitted weekly reports can be evaluated',
      409
    );
  }

  if (!force && report.aiScore) {
    return { report, cached: true };
  }

  const dailyEvidence = await listWeeklyDailyEvidence({
    userId: report.userId,
    weekStart: report.weekStart,
    weekEnd: report.weekEnd
  });
  const workdayContext = await resolveWeeklyReportWorkdayContext(report.weekStart);
  const comparison = buildWeeklyComparisonRows(report, dailyEvidence);

  return {
    report,
    cached: false,
    dailyEvidence,
    comparisonRows: comparison.rows,
    workdayContext
  };
}

// List weekly report evaluation statuses for a center or all centers.
export async function listWeeklyComparisonOverview({ weekStart, department, subjectRole }) {
  const params = [weekStart];
  let departmentFilter = '';
  if (department) {
    departmentFilter = ' AND u.department = ?';
    params.push(department);
  }
  let subjectRoleFilter = '';
  if (subjectRole) {
    subjectRoleFilter = ' AND u.organization_role = ?';
    params.push(subjectRole);
  }

  const [rows] = await pool.execute(
    `SELECT
      wr.id,
      wr.status,
      wr.ai_score,
      wr.ai_evaluated_at,
      wr.ai_evaluation_source,
      wr.final_score,
      wr.final_grade,
      wr.final_comment,
      wr.final_reviewed_by_user_id,
      wr.final_reviewed_at,
      u.id AS user_id,
      u.display_name,
      u.account,
      u.department,
      reviewer.display_name AS final_reviewer_display_name,
      reviewer.account AS final_reviewer_account
    FROM weekly_reports wr
    INNER JOIN users u ON u.id = wr.user_id
    LEFT JOIN users reviewer ON reviewer.id = wr.final_reviewed_by_user_id
    WHERE wr.week_start = ?
      ${departmentFilter}
      ${subjectRoleFilter}
    ORDER BY u.department ASC, u.display_name ASC, wr.id ASC`,
    params
  );

  return rows.map((row) => {
    const score = parseJson(row.ai_score);
    return {
      reportId: row.id,
      userId: row.user_id,
      userName: row.display_name || row.account,
      department: row.department,
      status: row.status,
      totalScore: score?.totalScore ?? null,
      grade: score?.grade ?? null,
      evaluationSource: row.ai_evaluation_source,
      evaluatedAt: dateTime(row.ai_evaluated_at),
      finalScore: row.final_score === null || row.final_score === undefined ? null : Number(row.final_score),
      finalGrade: row.final_grade,
      finalComment: row.final_comment,
      finalReviewedByUserId: row.final_reviewed_by_user_id,
      finalReviewedByName: row.final_reviewer_display_name || row.final_reviewer_account || null,
      finalReviewedAt: dateTime(row.final_reviewed_at)
    };
  });
}
