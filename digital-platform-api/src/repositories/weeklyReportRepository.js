import { pool } from '../db/pool.js';
import { randomUUID } from 'node:crypto';
import {
  canEvaluateWeeklyReport,
  canFinalizeWeeklyReport,
  canReadManagedWeeklyReport,
  canReviewCenterManagerWeeklyReport,
  canReviewEmployeeWeeklyReport,
  ReportStatus,
  WeeklyApprovalStatus
} from '../domain/reports.js';
import { getExpectedWorkdatesForWeek, resolveWeeklyRestMode } from '../domain/reportWorkdays.js';
import {
  WEEKLY_REPORT_ERROR,
  WeeklyReportError
} from '../domain/weeklyReports.js';
import { env } from '../config/env.js';
import { findLatestWeeklyRestModeAnchor } from './reportSettingsRepository.js';
import { buildProjectVisibilityCondition } from './projects/visibility.js';

// MySQL can return DATE values as Date objects; the API always emits YYYY-MM-DD.
function dateOnly(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

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
export function mapWeeklyReportRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    weekStart: dateOnly(row.week_start),
    weekEnd: dateOnly(row.week_end),
    status: row.status,
    submittedByUserId: row.submitted_by_user_id,
    submittedByName: row.submitted_by_display_name || row.submitted_by_account || null,
    submittedAt: dateTime(row.submitted_at),
    approvalStatus: row.approval_status || WeeklyApprovalStatus.NOT_SUBMITTED,
    approvalComment: row.approval_comment,
    approvalReviewedByUserId: row.approval_reviewed_by_user_id,
    approvalReviewedByName: row.approval_reviewer_display_name || row.approval_reviewer_account || null,
    approvalReviewedAt: dateTime(row.approval_reviewed_at),
    aiScore: parseJson(row.ai_score),
    aiEvaluatedAt: dateTime(row.ai_evaluated_at),
    aiEvaluationSource: row.ai_evaluation_source,
    aiEvaluationError: row.ai_evaluation_error,
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
    projectId: row.project_id,
    projectLabel: [row.project_code, row.project_name].filter(Boolean).join(' / '),
    sourceType: row.source_type || 'legacy_unknown',
    sourcePlanTaskKey: row.source_plan_task_key,
    workTask: row.work_task,
    workTarget: row.work_target,
    plannedDate: dateOnly(row.planned_date),
    completionStatus: row.completion_status,
    completionDescription: row.completion_description,
    completedDate: row.completed_date ? dateOnly(row.completed_date) : null
  };
}

// Convert next-week plan rows into API field names.
function mapPlanRow(row) {
  return {
    id: row.id,
    weeklyReportId: row.weekly_report_id,
    sortOrder: row.sort_order,
    taskKey: row.task_key,
    projectId: row.project_id,
    workTask: row.work_task,
    workTarget: row.work_target,
    plannedDate: dateOnly(row.planned_date),
    responsiblePerson: row.responsible_person
  };
}

// Convert joined daily report evidence rows into the exact AI/rule input shape.
function mapDailyEvidenceRow(row) {
  return {
    dailyReportItemId: row.daily_report_item_id,
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

// 🔥 改进点：计算两个文本的相似度（基于词集重叠比例）
function textSimilarity(text1, text2) {
  const tokens1 = normalizeComparisonText(text1).split(/\s+/).filter(Boolean);
  const tokens2 = normalizeComparisonText(text2).split(/\s+/).filter(Boolean);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  const intersection = tokens1.filter(t => tokens2.includes(t));
  const union = new Set([...tokens1, ...tokens2]);
  return intersection.length / union.size;
}

// 🔥 改进点：综合匹配分数，考虑工作内容、目标、项目名
function computeMatchScore(summary, dailyItem) {
  const workContent = dailyItem.workContent || '';
  const projectName = dailyItem.projectName || '';
  
  const taskScore = textSimilarity(summary.workTask, workContent);
  const targetScore = textSimilarity(summary.workTarget, workContent);
  const projectScore = projectName ? textSimilarity(summary.workTask, projectName) : 0;
  
  // 加权平均，突出任务和目标
  return Math.max(taskScore * 0.5 + targetScore * 0.3 + projectScore * 0.2, 
                 taskScore, targetScore, projectScore * 0.8);
}

// Return whether the weekly summary and daily item look related enough for an initial match.
// 此函数保留用于向后兼容，但在新的匹配逻辑中不再直接使用
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

function dailyEvidenceKey(dailyItem) {
  if (dailyItem.dailyReportItemId !== undefined && dailyItem.dailyReportItemId !== null) {
    return `item:${dailyItem.dailyReportItemId}`;
  }

  return `${dailyItem.reportDate}|${dailyItem.projectCode}|${dailyItem.workContent}`;
}

// 此函数已不再被新的 buildWeeklyComparisonRows 使用，但保留以防外部调用
function chooseBestDailyEvidence(summary, dailyItems, usedDailyItems) {
  const availableItems = dailyItems.filter((dailyItem) => !usedDailyItems.has(dailyEvidenceKey(dailyItem)));
  if (availableItems.length === 0) {
    return null;
  }

  const normalizedTarget = normalizeComparisonText(summary.workTarget);
  const exactMatch = availableItems.find(
    (dailyItem) => normalizeComparisonText(dailyItem.workContent) === normalizedTarget
  );
  if (exactMatch) {
    return exactMatch;
  }

  return (
    availableItems.find((dailyItem) => compareWeeklyAndDailyText(summary, dailyItem).matchStatus === 'matched') ||
    availableItems[0]
  );
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

async function assertWeeklyReportProjectsAvailable(executor, { report, user }) {
  const projectIds = [
    ...report.summaries.map((item) => item.projectId),
    ...report.plans.map((item) => item.projectId)
  ].filter((projectId) => projectId !== null && projectId !== undefined);
  const uniqueProjectIds = [...new Set(projectIds.map((projectId) => Number(projectId)))];

  if (uniqueProjectIds.length === 0) {
    return;
  }

  const visibility = buildProjectVisibilityCondition(user, 'p');
  const placeholders = uniqueProjectIds.map(() => '?').join(', ');
  const [rows] = await executor.execute(
    `SELECT p.id
    FROM projects p
    WHERE p.id IN (${placeholders})
      AND p.status <> 'completed'
      AND ${visibility.sql}`,
    [...uniqueProjectIds, ...visibility.params]
  );
  const availableIds = new Set(rows.map((row) => Number(row.id)));
  const unavailableId = uniqueProjectIds.find((projectId) => !availableIds.has(projectId));

  if (unavailableId) {
    throw new WeeklyReportError(
      WEEKLY_REPORT_ERROR.INVALID_PROJECT_ID,
      'Weekly report project is not available',
      409,
      ['projectId']
    );
  }
}

// Fetch summary and plan children after a weekly report row is known.
async function attachWeeklyReportChildren(report, executor = pool) {
  const [summaryRows] = await executor.execute(
    `SELECT
      wrs.*,
      p.project_code,
      p.project_name
    FROM weekly_report_summaries wrs
    LEFT JOIN projects p ON p.id = wrs.project_id
    WHERE wrs.weekly_report_id = ?
    ORDER BY wrs.sort_order ASC`,
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

// Approval starts when a submitted report is created.
function approvalStatusForNewReport(report) {
  return report.status === ReportStatus.SUBMITTED
    ? WeeklyApprovalStatus.PENDING
    : WeeklyApprovalStatus.NOT_SUBMITTED;
}

// Returned drafts keep the visible return reason until the employee resubmits.
function approvalStatusForUpdate(existing, report) {
  if (report.status === ReportStatus.SUBMITTED) {
    return WeeklyApprovalStatus.PENDING;
  }
  return existing.approvalStatus === WeeklyApprovalStatus.RETURNED
    ? WeeklyApprovalStatus.RETURNED
    : WeeklyApprovalStatus.NOT_SUBMITTED;
}

// Employees may edit drafts and returned reports, but not reports under review or approved.
function assertWeeklyReportEditable(existing) {
  const editable =
    existing.status === ReportStatus.DRAFT ||
    existing.approvalStatus === WeeklyApprovalStatus.RETURNED;

  if (!editable) {
    throw new WeeklyReportError(
      WEEKLY_REPORT_ERROR.FORBIDDEN,
      'Weekly report cannot be edited in current approval status',
      409,
      ['approvalStatus']
    );
  }
}

function assertWeeklyReportApprovedForScoring(report, code = WEEKLY_REPORT_ERROR.EVALUATE_SUBMITTED_ONLY) {
  if (report.status !== ReportStatus.SUBMITTED || report.approvalStatus !== WeeklyApprovalStatus.APPROVED) {
    throw new WeeklyReportError(
      code,
      'Weekly report must be submitted and approved before scoring',
      409,
      ['approvalStatus']
    );
  }
}

// Approval history records the business transition separately from report content.
async function insertWeeklyReportApprovalHistory(
  executor,
  { weeklyReportId, action, fromApprovalStatus, toApprovalStatus, comment, operatorUserId }
) {
  await executor.execute(
    `INSERT INTO weekly_report_approval_history (
      weekly_report_id,
      action,
      from_approval_status,
      to_approval_status,
      comment,
      operator_user_id
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [weeklyReportId, action, fromApprovalStatus, toApprovalStatus, comment || null, operatorUserId]
  );
}

// Write child summary rows in a stable display order.
async function insertWeeklyReportSummaries(executor, weeklyReportId, summaries) {
  for (const item of summaries) {
    await executor.execute(
      `INSERT INTO weekly_report_summaries (
        weekly_report_id,
        sort_order,
        project_id,
        source_type,
        source_plan_task_key,
        work_task,
        work_target,
        planned_date,
        completion_status,
        completion_description,
        completed_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        weeklyReportId,
        item.sortOrder,
        item.projectId,
        item.sourceType,
        item.sourcePlanTaskKey,
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
  const seenTaskKeys = new Set();
  for (const item of plans) {
    const taskKey = item.taskKey || randomUUID();
    if (seenTaskKeys.has(taskKey)) {
      throw new WeeklyReportError(
        WEEKLY_REPORT_ERROR.REQUIRED_FIELDS,
        'Duplicate weekly plan taskKey in payload',
        400,
        ['plans.taskKey']
      );
    }
    seenTaskKeys.add(taskKey);

    await executor.execute(
      `INSERT INTO weekly_report_plans (
        weekly_report_id,
        task_key,
        sort_order,
        project_id,
        work_task,
        work_target,
        planned_date,
        responsible_person
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        weeklyReportId,
        taskKey,
        item.sortOrder,
        item.projectId,
        item.workTask,
        item.workTarget,
        item.plannedDate,
        item.responsiblePerson
      ]
    );
  }
}

// Fetch one owned weekly report or raise a 404.
export async function getWeeklyReportById({ reportId, userId }, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT
      wr.*,
      reviewer.display_name AS final_reviewer_display_name,
      reviewer.account AS final_reviewer_account,
      approval_reviewer.display_name AS approval_reviewer_display_name,
      approval_reviewer.account AS approval_reviewer_account,
      submitted_by.display_name AS submitted_by_display_name,
      submitted_by.account AS submitted_by_account
    FROM weekly_reports wr
    LEFT JOIN users reviewer ON reviewer.id = wr.final_reviewed_by_user_id
    LEFT JOIN users approval_reviewer ON approval_reviewer.id = wr.approval_reviewed_by_user_id
    LEFT JOIN users submitted_by ON submitted_by.id = wr.submitted_by_user_id
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
      reviewer.account AS final_reviewer_account,
      approval_reviewer.display_name AS approval_reviewer_display_name,
      approval_reviewer.account AS approval_reviewer_account,
      submitted_by.display_name AS submitted_by_display_name,
      submitted_by.account AS submitted_by_account
    FROM weekly_reports wr
    LEFT JOIN users reviewer ON reviewer.id = wr.final_reviewed_by_user_id
    LEFT JOIN users approval_reviewer ON approval_reviewer.id = wr.approval_reviewed_by_user_id
    LEFT JOIN users submitted_by ON submitted_by.id = wr.submitted_by_user_id
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
      approval_reviewer.display_name AS approval_reviewer_display_name,
      approval_reviewer.account AS approval_reviewer_account,
      submitted_by.display_name AS submitted_by_display_name,
      submitted_by.account AS submitted_by_account,
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
    LEFT JOIN users approval_reviewer ON approval_reviewer.id = wr.approval_reviewed_by_user_id
    LEFT JOIN users submitted_by ON submitted_by.id = wr.submitted_by_user_id
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
export async function getWeeklyReportForAuthorizedRead({ reportId, requesterUser }, executor = pool) {
  const target = await getWeeklyReportWithUserForReview(reportId, executor);
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
export async function createWeeklyReport({ user, report }) {
  const userId = user.id;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await assertWeeklyReportProjectsAvailable(connection, { report, user });
    const [result] = await connection.execute(
      `INSERT INTO weekly_reports (
        user_id,
        week_start,
        week_end,
        status,
        submitted_by_user_id,
        submitted_at,
        approval_status
      ) VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'submitted' THEN NOW() ELSE NULL END, ?)`,
      [
        userId,
        report.weekStart,
        report.weekEnd,
        report.status,
        report.status === ReportStatus.SUBMITTED ? userId : null,
        report.status,
        approvalStatusForNewReport(report)
      ]
    );

    await insertWeeklyReportSummaries(connection, result.insertId, report.summaries);
    await insertWeeklyReportPlans(connection, result.insertId, report.plans);
    if (report.status === ReportStatus.SUBMITTED) {
      await insertWeeklyReportApprovalHistory(connection, {
        weeklyReportId: result.insertId,
        action: 'submit',
        fromApprovalStatus: WeeklyApprovalStatus.NOT_SUBMITTED,
        toApprovalStatus: WeeklyApprovalStatus.PENDING,
        comment: null,
        operatorUserId: userId
      });
    }
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
export async function updateWeeklyReport({ reportId, user, report }) {
  const userId = user.id;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const existing = await getWeeklyReportById({ reportId, userId }, connection);
    assertWeeklyReportEditable(existing);
    await assertWeeklyReportProjectsAvailable(connection, { report, user });
    const nextApprovalStatus = approvalStatusForUpdate(existing, report);

    await connection.execute(
      `UPDATE weekly_reports
      SET week_start = ?,
        week_end = ?,
        status = ?,
        submitted_by_user_id = CASE WHEN ? = 'submitted' THEN ? ELSE NULL END,
        submitted_at = CASE WHEN ? = 'submitted' THEN NOW() ELSE NULL END,
        ai_score = NULL,
        ai_evaluated_at = NULL,
        ai_evaluation_source = NULL,
        ai_evaluation_error = NULL,
        final_score = NULL,
        final_grade = NULL,
        final_comment = NULL,
        final_reviewed_by_user_id = NULL,
        final_reviewed_at = NULL,
        approval_status = ?,
        approval_comment = ?,
        approval_reviewed_by_user_id = NULL,
        approval_reviewed_at = NULL
      WHERE id = ? AND user_id = ?`,
      [
        report.weekStart,
        report.weekEnd,
        report.status,
        report.status,
        userId,
        report.status,
        nextApprovalStatus,
        nextApprovalStatus === WeeklyApprovalStatus.RETURNED ? existing.approvalComment : null,
        existing.id,
        userId
      ]
    );
    await connection.execute('DELETE FROM weekly_report_summaries WHERE weekly_report_id = ?', [existing.id]);
    await connection.execute('DELETE FROM weekly_report_plans WHERE weekly_report_id = ?', [existing.id]);
    await insertWeeklyReportSummaries(connection, existing.id, report.summaries);
    await insertWeeklyReportPlans(connection, existing.id, report.plans);
    if (existing.approvalStatus === WeeklyApprovalStatus.NOT_SUBMITTED && report.status === ReportStatus.SUBMITTED) {
      await insertWeeklyReportApprovalHistory(connection, {
        weeklyReportId: existing.id,
        action: 'submit',
        fromApprovalStatus: WeeklyApprovalStatus.NOT_SUBMITTED,
        toApprovalStatus: WeeklyApprovalStatus.PENDING,
        comment: null,
        operatorUserId: userId
      });
    }
    if (existing.approvalStatus === WeeklyApprovalStatus.RETURNED && report.status === ReportStatus.SUBMITTED) {
      await insertWeeklyReportApprovalHistory(connection, {
        weeklyReportId: existing.id,
        action: 'resubmit',
        fromApprovalStatus: WeeklyApprovalStatus.RETURNED,
        toApprovalStatus: WeeklyApprovalStatus.PENDING,
        comment: null,
        operatorUserId: userId
      });
    }
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
    `SELECT id, account, display_name, department, organization_role, role
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
      role: rows[0].role
    }
  };
}

export async function getWeeklyReportExportDtoForAuthorizedRead({ reportId, requesterUser }, executor = pool) {
  const target = await getWeeklyReportForAuthorizedRead({ reportId, requesterUser }, executor);

  return {
    report: target.report,
    user: {
      id: target.user.id,
      account: target.user.account,
      name: target.user.displayName,
      department: target.user.department,
      organizationRole: target.user.organizationRole,
      role: target.user.role
    }
  };
}

// Collect only submitted daily completed-work rows inside the evaluated week.
export async function listWeeklyDailyEvidence({ userId, weekStart, weekEnd }, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT
      dr.report_date,
      dri.id AS daily_report_item_id,
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

// Build weekly-vs-daily rows with deterministic greedy matching.
export function buildWeeklyComparisonRows(report, dailyEvidence) {
  const dailyByDate = new Map();
  for (const item of dailyEvidence) {
    const list = dailyByDate.get(item.reportDate) || [];
    list.push(item);
    dailyByDate.set(item.reportDate, list);
  }

  const rows = [];
  const usedDailyItems = new Set(); // 记录全局已使用的日报项（跨日期去重，但实际不同日期不会重复）

  // 按日期分组周报总结
  const summariesByDate = new Map();
  for (const summary of report.summaries) {
    const date = summary.completedDate;
    if (!date) continue;
    const list = summariesByDate.get(date) || [];
    list.push(summary);
    summariesByDate.set(date, list);
  }

  // 遍历每个日期
  for (const [date, summaries] of summariesByDate) {
    const dailyItems = dailyByDate.get(date) || [];
    if (dailyItems.length === 0) {
      // 该日期有周报但无日报 -> 全部为 weekly_only
      for (const summary of summaries) {
        rows.push({
          date,
          weekday: weekdayLabel(date),
          weeklyTask: summary.workTask,
          weeklySummaryText: summary.workTarget,
          dailyProjectName: null,
          dailyProjectLabel: null,
          dailyWorkContent: null,
          dailyCompletionProgress: null,
          dailyCompletedAt: null,
          weeklyCompletedDate: date,
          matchStatus: 'weekly_only',
          matchReason: '该日期有周报总结但没有已提交日报'
        });
      }
      continue;
    }

    // 如果该日期没有任何周报总结，则所有日报为 daily_only。
    if (summaries.length === 0) {
      for (const dailyItem of dailyItems) {
        const key = dailyEvidenceKey(dailyItem);
        if (!usedDailyItems.has(key)) {
          rows.push({
            date: dailyItem.reportDate,
            weekday: weekdayLabel(dailyItem.reportDate),
            weeklyTask: null,
            weeklySummaryText: null,
            dailyProjectName: dailyItem.projectName,
            dailyProjectLabel: dailyItem.projectLabel,
            dailyWorkContent: dailyItem.workContent,
            dailyCompletionProgress: dailyItem.completionProgress,
            dailyCompletedAt: dailyItem.reportDate,
            weeklyCompletedDate: null,
            matchStatus: 'daily_only',
            matchReason: '该日期有已提交日报但没有对应周报总结'
          });
          usedDailyItems.add(key);
        }
      }
      continue;
    }

    // 计算所有 summary 与 dailyItem 的匹配分数矩阵
    const scores = summaries.map((s) => dailyItems.map((d) => computeMatchScore(s, d)));

    // 生成所有可能的配对 (summaryIdx, dailyIdx) 并按分数降序排序
    const pairs = [];
    for (let i = 0; i < summaries.length; i++) {
      for (let j = 0; j < dailyItems.length; j++) {
        pairs.push({ summaryIdx: i, dailyIdx: j, score: scores[i][j] });
      }
    }
    pairs.sort((a, b) => b.score - a.score);

    const matchedSummary = new Set();
    const matchedDaily = new Set();

    // 贪心匹配：按分数从高到低，若双方都未匹配则配对
    for (const pair of pairs) {
      if (!matchedSummary.has(pair.summaryIdx) && !matchedDaily.has(pair.dailyIdx)) {
        matchedSummary.add(pair.summaryIdx);
        matchedDaily.add(pair.dailyIdx);
        const summary = summaries[pair.summaryIdx];
        const dailyItem = dailyItems[pair.dailyIdx];
        const key = dailyEvidenceKey(dailyItem);
        usedDailyItems.add(key);

        // 判断是否匹配（分数阈值0.3，可根据实际调整）
        const isMatched = pair.score >= 0.3;
        rows.push({
          date: summary.completedDate,
          weekday: weekdayLabel(summary.completedDate),
          weeklyTask: summary.workTask,
          weeklySummaryText: summary.workTarget,
          dailyProjectName: dailyItem.projectName,
          dailyProjectLabel: dailyItem.projectLabel,
          dailyWorkContent: dailyItem.workContent,
          dailyCompletionProgress: dailyItem.completionProgress,
          dailyCompletedAt: dailyItem.reportDate,
          weeklyCompletedDate: summary.completedDate,
          matchStatus: isMatched ? 'matched' : 'unmatched',
          matchReason: isMatched ? '周报总结与日报内容存在关键词匹配' : '未发现明显关键词匹配'
        });
      }
    }

    // 处理未匹配的周报总结（weekly_only）
    for (let i = 0; i < summaries.length; i++) {
      if (!matchedSummary.has(i)) {
        const summary = summaries[i];
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
      }
    }

    // 处理未匹配的日报项（daily_only）
    for (let j = 0; j < dailyItems.length; j++) {
      if (!matchedDaily.has(j)) {
        const dailyItem = dailyItems[j];
        const key = dailyEvidenceKey(dailyItem);
        // 如果该日报已被其他日期的周报使用（理论上不可能，因为日期不同），但以防万一
        if (!usedDailyItems.has(key)) {
          rows.push({
            date: dailyItem.reportDate,
            weekday: weekdayLabel(dailyItem.reportDate),
            weeklyTask: null,
            weeklySummaryText: null,
            dailyProjectName: dailyItem.projectName,
            dailyProjectLabel: dailyItem.projectLabel,
            dailyWorkContent: dailyItem.workContent,
            dailyCompletionProgress: dailyItem.completionProgress,
            dailyCompletedAt: dailyItem.reportDate,
            weeklyCompletedDate: null,
            matchStatus: 'daily_only',
            matchReason: '该日期有已提交日报但没有对应周报总结'
          });
          usedDailyItems.add(key);
        }
      }
    }
  }

  // Dates that have only daily evidence are absent from summariesByDate, so emit them here.
  for (const dailyItems of dailyByDate.values()) {
    for (const dailyItem of dailyItems) {
      const key = dailyEvidenceKey(dailyItem);
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
        dailyCompletedAt: dailyItem.reportDate,
        weeklyCompletedDate: null,
        matchStatus: 'daily_only',
        matchReason: '该日期有已提交日报但没有对应周报总结'
      });
      usedDailyItems.add(key);
    }
  }

  // 按日期排序
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return { rows };
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
  assertWeeklyReportApprovedForScoring(target.report, WEEKLY_REPORT_ERROR.INVALID_FINAL_REVIEW);

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

// Persist an approval decision for a pending employee or center-manager weekly report.
export async function reviewWeeklyReportApproval({ reportId, evaluatorUser, approval }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const target = await getWeeklyReportWithUserForReview(reportId, connection);
    if (
      !canReviewEmployeeWeeklyReport(evaluatorUser, target.user) &&
      !canReviewCenterManagerWeeklyReport(evaluatorUser, target.user)
    ) {
      throw new WeeklyReportError(WEEKLY_REPORT_ERROR.FORBIDDEN, 'Weekly approval forbidden', 403);
    }
    if (target.report.approvalStatus !== WeeklyApprovalStatus.PENDING) {
      throw new WeeklyReportError(
        WEEKLY_REPORT_ERROR.INVALID_APPROVAL_ACTION,
        'Only pending weekly reports can be approved or returned',
        409,
        ['approvalStatus']
      );
    }

    const nextApprovalStatus = approval.action === 'approve'
      ? WeeklyApprovalStatus.APPROVED
      : WeeklyApprovalStatus.RETURNED;
    await connection.execute(
      `UPDATE weekly_reports
      SET approval_status = ?,
        approval_comment = ?,
        approval_reviewed_by_user_id = ?,
        approval_reviewed_at = NOW()
      WHERE id = ?`,
      [nextApprovalStatus, approval.action === 'return' ? approval.comment : null, evaluatorUser.id, reportId]
    );
    await insertWeeklyReportApprovalHistory(connection, {
      weeklyReportId: reportId,
      action: approval.action,
      fromApprovalStatus: WeeklyApprovalStatus.PENDING,
      toApprovalStatus: nextApprovalStatus,
      comment: approval.comment,
      operatorUserId: evaluatorUser.id
    });
    if (approval.action === 'return') {
      await connection.execute(
        `UPDATE weekly_reports
        SET ai_score = NULL,
          ai_evaluated_at = NULL,
          ai_evaluation_source = NULL,
          ai_evaluation_error = NULL,
          final_score = NULL,
          final_grade = NULL,
          final_comment = NULL,
          final_reviewed_by_user_id = NULL,
          final_reviewed_at = NULL
        WHERE id = ?`,
        [reportId]
      );
    }
    await connection.commit();

    return getWeeklyReportByIdForSystem(reportId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Return a cached evaluation unless force=true was requested.
export async function getWeeklyReportEvaluationTarget({ reportId, evaluatorUser, force = false }) {
  const target = await getWeeklyReportWithUserForReview(reportId);
  const { report, user: targetUser } = target;
  if (!canEvaluateWeeklyReport(evaluatorUser, targetUser)) {
    throw new WeeklyReportError(WEEKLY_REPORT_ERROR.FORBIDDEN, 'Weekly report evaluation forbidden', 403);
  }

  assertWeeklyReportApprovedForScoring(report);

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
export async function listWeeklyComparisonOverview({ weekStart, weekEnd, department, subjectRole }) {
  const params = [weekStart, weekEnd];
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
      wr.submitted_by_user_id,
      wr.submitted_at,
      wr.approval_status,
      wr.approval_comment,
      wr.approval_reviewed_by_user_id,
      wr.approval_reviewed_at,
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
      reviewer.account AS final_reviewer_account,
      approval_reviewer.display_name AS approval_reviewer_display_name,
      approval_reviewer.account AS approval_reviewer_account,
      submitted_by.display_name AS submitted_by_display_name,
      submitted_by.account AS submitted_by_account
    FROM weekly_reports wr
    INNER JOIN users u ON u.id = wr.user_id
    LEFT JOIN users reviewer ON reviewer.id = wr.final_reviewed_by_user_id
    LEFT JOIN users approval_reviewer ON approval_reviewer.id = wr.approval_reviewed_by_user_id
    LEFT JOIN users submitted_by ON submitted_by.id = wr.submitted_by_user_id
    WHERE wr.week_start = ?
      AND wr.week_end = ?
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
      submittedByUserId: row.submitted_by_user_id,
      submittedByName: row.submitted_by_display_name || row.submitted_by_account || null,
      submittedAt: dateTime(row.submitted_at),
      approvalStatus: row.approval_status || WeeklyApprovalStatus.NOT_SUBMITTED,
      approvalComment: row.approval_comment,
      approvalReviewedByUserId: row.approval_reviewed_by_user_id,
      approvalReviewedByName: row.approval_reviewer_display_name || row.approval_reviewer_account || null,
      approvalReviewedAt: dateTime(row.approval_reviewed_at),
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
