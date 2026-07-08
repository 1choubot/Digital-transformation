import crypto from 'node:crypto';
import { pool } from '../db/pool.js';
import { formatIsoDate, parseIsoDate } from '../domain/reportWorkdays.js';

// Date arithmetic stays date-only so MySQL DATE values and UI dates remain aligned.
function shiftIsoDate(isoDate, dayOffset) {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return formatIsoDate(date);
}

// MySQL DATE columns may arrive as Date instances depending on connection settings.
function dateOnly(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value || '').slice(0, 10);
}

// Hash only deterministic business facts so clients can detect stale AI compose requests.
function buildBasisHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// Keep generated text readable when AI is unavailable or disabled.
function joinEvidenceText(evidenceItems) {
  return evidenceItems
    .map((item) => [item.reportDate, item.workContent, item.completionProgress].filter(Boolean).join('：'))
    .filter(Boolean)
    .join('\n');
}

// Convert one previous weekly plan into a weekly summary suggestion.
function buildPlanSuggestion(plan, evidenceItems) {
  const lastEvidence = evidenceItems[evidenceItems.length - 1] || null;
  const completionStatus = lastEvidence?.executionStatus || 'not_completed';
  const completedDate = completionStatus === 'completed' ? lastEvidence.reportDate : null;
  const missingDailyEvidence = evidenceItems.length === 0;

  return {
    suggestionKey: `plan:${plan.taskKey}`,
    sourceType: 'weekly_plan',
    sourcePlanTaskKey: plan.taskKey,
    projectId: plan.projectId,
    projectLabel: plan.projectLabel,
    workTask: plan.workTask,
    workTarget: plan.workTarget,
    plannedDate: plan.plannedDate,
    completionStatus,
    completionDescription: missingDailyEvidence
      ? '本周未发现关联的已提交日报，按考评规则暂记未完成。'
      : joinEvidenceText(evidenceItems),
    completedDate,
    missingDailyEvidence,
    dailyEvidence: evidenceItems,
    dailyFillContext: {
      reportDate: plan.plannedDate,
      projectId: plan.projectId,
      sourcePlanTaskKey: plan.taskKey
    }
  };
}

// Convert ad hoc submitted daily work into standalone weekly summary suggestions.
function buildAdHocSuggestion(item) {
  const completionStatus = item.executionStatus || 'in_progress';
  return {
    suggestionKey: `ad_hoc:${item.dailyReportItemId}`,
    sourceType: 'ad_hoc',
    sourcePlanTaskKey: null,
    projectId: item.projectId,
    projectLabel: item.projectLabel,
    workTask: item.projectLabel || '新增临时工作',
    workTarget: item.workContent,
    plannedDate: item.reportDate,
    completionStatus,
    completionDescription: [item.workContent, item.completionProgress].filter(Boolean).join('；'),
    completedDate: completionStatus === 'completed' ? item.reportDate : null,
    missingDailyEvidence: false,
    dailyEvidence: [item],
    dailyFillContext: null
  };
}

// Build a no-side-effect weekly prefill suggestion from previous plans and submitted daily evidence.
export async function buildWeeklyReportPrefillSuggestion({ user, weekStart, force = false }, executor = pool) {
  const weekEnd = shiftIsoDate(weekStart, 6);
  const previousWeekStart = shiftIsoDate(weekStart, -7);

  const [existingRows] = await executor.execute(
    `SELECT id, status
    FROM weekly_reports
    WHERE user_id = ?
      AND week_start = ?
    ORDER BY id ASC
    LIMIT 1`,
    [user.id, weekStart]
  );

  // Default page loads keep saved weekly reports intact; explicit refreshes can regenerate suggestions.
  if (existingRows.length > 0 && !force) {
    return {
      shouldPrefill: false,
      reason: 'weekly_report_exists',
      weekStart,
      weekEnd,
      existingReportId: existingRows[0].id,
      existingReportStatus: existingRows[0].status,
      basisHash: null,
      summaries: [],
      meta: { previousPlanCount: 0, submittedDailyReportCount: 0, missingDailyEvidenceCount: 0, adHocCount: 0 }
    };
  }

  const [planRows] = await executor.execute(
    `SELECT
      wr.status AS weekly_report_status,
      wrp.task_key,
      wrp.project_id,
      p.project_code,
      p.project_name,
      wrp.work_task,
      wrp.work_target,
      wrp.planned_date,
      wrp.sort_order
    FROM weekly_report_plans wrp
    INNER JOIN weekly_reports wr ON wr.id = wrp.weekly_report_id
    LEFT JOIN projects p ON p.id = wrp.project_id
    WHERE wr.user_id = ?
      AND wr.week_start = ?
      AND wr.status IN ('draft', 'submitted')
      AND wrp.planned_date BETWEEN ? AND ?
      AND wrp.task_key IS NOT NULL
      AND wrp.task_key <> ''
    ORDER BY wrp.planned_date ASC, wrp.sort_order ASC, wrp.id ASC`,
    [user.id, previousWeekStart, weekStart, weekEnd]
  );

  const [dailyRows] = await executor.execute(
    `SELECT
      dr.id AS daily_report_id,
      dr.report_date,
      dri.id AS daily_report_item_id,
      dri.sort_order,
      dri.project_id,
      p.project_code,
      p.project_name,
      dri.source_type,
      dri.source_plan_task_key,
      dri.execution_status,
      dri.work_content,
      dri.completion_progress,
      dri.deviation_and_corrective_action
    FROM daily_reports dr
    INNER JOIN daily_report_items dri ON dri.daily_report_id = dr.id
    LEFT JOIN projects p ON p.id = dri.project_id
    WHERE dr.user_id = ?
      AND dr.status = 'submitted'
      AND dr.report_date BETWEEN ? AND ?
    ORDER BY dr.report_date ASC, dri.sort_order ASC, dri.id ASC`,
    [user.id, weekStart, weekEnd]
  );

  const evidenceByTaskKey = new Map();
  const normalizedDailyRows = dailyRows.map((row) => ({
    dailyReportId: row.daily_report_id,
    dailyReportItemId: row.daily_report_item_id,
    reportDate: dateOnly(row.report_date),
    sortOrder: row.sort_order,
    projectId: row.project_id,
    projectCode: row.project_code,
    projectName: row.project_name,
    projectLabel: [row.project_code, row.project_name].filter(Boolean).join(' / '),
    sourceType: row.source_type || 'legacy_unknown',
    sourcePlanTaskKey: row.source_plan_task_key,
    executionStatus: row.execution_status,
    workContent: row.work_content,
    completionProgress: row.completion_progress,
    deviationAndCorrectiveAction: row.deviation_and_corrective_action
  }));

  for (const item of normalizedDailyRows) {
    if (item.sourceType === 'weekly_plan' && item.sourcePlanTaskKey) {
      const list = evidenceByTaskKey.get(item.sourcePlanTaskKey) || [];
      list.push(item);
      evidenceByTaskKey.set(item.sourcePlanTaskKey, list);
    }
  }

  const previousPlans = planRows.map((row) => ({
    taskKey: row.task_key,
    previousWeeklyReportStatus: row.weekly_report_status,
    projectId: row.project_id,
    projectCode: row.project_code,
    projectName: row.project_name,
    projectLabel: [row.project_code, row.project_name].filter(Boolean).join(' / '),
    workTask: row.work_task,
    workTarget: row.work_target,
    plannedDate: dateOnly(row.planned_date),
    sortOrder: row.sort_order
  }));

  const planSuggestions = previousPlans.map((plan) => buildPlanSuggestion(plan, evidenceByTaskKey.get(plan.taskKey) || []));
  const adHocSuggestions = normalizedDailyRows.filter((item) => item.sourceType === 'ad_hoc').map(buildAdHocSuggestion);
  const summaries = [...planSuggestions, ...adHocSuggestions];
  const basisPayload = { weekStart, weekEnd, previousWeekStart, previousPlans, dailyRows: normalizedDailyRows };

  return {
    shouldPrefill: true,
    reason: summaries.length > 0 ? 'generated' : 'empty',
    weekStart,
    weekEnd,
    previousWeekStart,
    previousWeeklyReportStatus: previousPlans[0]?.previousWeeklyReportStatus || null,
    basisHash: buildBasisHash(basisPayload),
    summaries,
    meta: {
      previousPlanCount: previousPlans.length,
      submittedDailyReportCount: new Set(normalizedDailyRows.map((row) => row.dailyReportId)).size,
      missingDailyEvidenceCount: planSuggestions.filter((item) => item.missingDailyEvidence).length,
      adHocCount: adHocSuggestions.length
    }
  };
}
