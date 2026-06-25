import { pool } from '../db/pool.js';
import { ReportStatus } from '../domain/reports.js';

// MySQL DATE values are emitted as stable YYYY-MM-DD strings for API clients.
function dateOnly(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(value || '').slice(0, 10);
}

// TIME columns may arrive as strings like HH:mm:ss; the UI only needs HH:mm.
function timeOnly(value) {
  return value ? String(value).slice(0, 5) : '';
}

// Move an ISO date by a small number of days without relying on host locale.
export function addIsoDays(isoDate, days) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

// Format one project label consistently for API and Excel output.
function mapProject(row) {
  return {
    projectId: row.project_id,
    projectCode: row.project_code,
    projectName: row.project_name,
    projectLabel: [row.project_code, row.project_name].filter(Boolean).join(' ')
  };
}

// Create a stable user bucket for grouped center daily report output.
function ensureEmployeeGroup(groups, row) {
  const key = String(row.user_id);
  if (!groups.has(key)) {
    groups.set(key, {
      userId: row.user_id,
      account: row.account,
      name: row.display_name || row.account,
      department: row.department,
      previousPlans: [],
      completedItems: [],
      tomorrowPlans: []
    });
  }

  return groups.get(key);
}

// Fetch submitted daily report rows for one center and one report date.
async function listSubmittedDailyRows({ department, reportDate }, executor) {
  const [rows] = await executor.execute(
    `SELECT
      dr.id AS daily_report_id,
      dr.report_date,
      u.id AS user_id,
      u.account,
      u.display_name,
      u.department,
      p.id AS project_id,
      p.project_code,
      p.project_name
    FROM daily_reports dr
    INNER JOIN users u ON u.id = dr.user_id
    INNER JOIN projects p ON p.id = dr.project_id
    WHERE dr.status = ?
      AND dr.report_date = ?
      AND u.department = ?
      AND u.organization_role = 'employee'
    ORDER BY u.display_name ASC, u.account ASC, p.project_code ASC, dr.id ASC`,
    [ReportStatus.SUBMITTED, reportDate, department]
  );

  return rows;
}

// Build the center daily report DTO consumed by the page and export service.
export async function getCenterDailyReportDto({ department, reportDate }, executor = pool) {
  const previousDate = addIsoDays(reportDate, -1);
  const groups = new Map();
  const todayRows = await listSubmittedDailyRows({ department, reportDate }, executor);
  const previousRows = await listSubmittedDailyRows({ department, reportDate: previousDate }, executor);

  for (const row of previousRows) {
    const group = ensureEmployeeGroup(groups, row);
    const [planRows] = await executor.execute(
      `SELECT *
      FROM daily_report_plans
      WHERE daily_report_id = ?
      ORDER BY sort_order ASC, id ASC`,
      [row.daily_report_id]
    );

    for (const plan of planRows) {
      group.previousPlans.push({
        ...mapProject(row),
        workContent: plan.planned_work_content,
        responsiblePerson: plan.responsible_person,
        plannedCompleteAt: timeOnly(plan.planned_complete_at),
        collaboratingCenter: plan.collaborating_center,
        collaborationItem: plan.collaboration_item
      });
    }
  }

  for (const row of todayRows) {
    const group = ensureEmployeeGroup(groups, row);
    const [itemRows] = await executor.execute(
      `SELECT *
      FROM daily_report_items
      WHERE daily_report_id = ?
      ORDER BY sort_order ASC, id ASC`,
      [row.daily_report_id]
    );
    const [planRows] = await executor.execute(
      `SELECT *
      FROM daily_report_plans
      WHERE daily_report_id = ?
      ORDER BY sort_order ASC, id ASC`,
      [row.daily_report_id]
    );

    for (const item of itemRows) {
      group.completedItems.push({
        ...mapProject(row),
        workContent: item.work_content,
        completionProgress: item.completion_progress,
        completedAt: timeOnly(item.completed_at),
        responsiblePerson: item.responsible_person,
        deviationAndCorrectiveAction: item.deviation_and_corrective_action
      });
    }

    for (const plan of planRows) {
      group.tomorrowPlans.push({
        ...mapProject(row),
        workContent: plan.planned_work_content,
        responsiblePerson: plan.responsible_person,
        plannedCompleteAt: timeOnly(plan.planned_complete_at),
        collaboratingCenter: plan.collaborating_center,
        collaborationItem: plan.collaboration_item
      });
    }
  }

  const employees = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  return {
    department,
    reportDate,
    previousDate,
    employees,
    totals: {
      employeeCount: employees.length,
      previousPlanCount: employees.reduce((sum, employee) => sum + employee.previousPlans.length, 0),
      completedItemCount: employees.reduce((sum, employee) => sum + employee.completedItems.length, 0),
      tomorrowPlanCount: employees.reduce((sum, employee) => sum + employee.tomorrowPlans.length, 0)
    }
  };
}

// Read one schedule row, returning the fixed default when the center has not been configured.
export async function getCenterDailySchedule({ department }, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM center_daily_report_schedules
    WHERE department = ?
    LIMIT 1`,
    [department]
  );

  if (rows.length === 0) {
    return {
      department,
      isEnabled: true,
      generateTime: '18:00',
      timezone: 'Asia/Shanghai',
      updatedByUserId: null,
      createdAt: null,
      updatedAt: null
    };
  }

  return {
    department: rows[0].department,
    isEnabled: Boolean(rows[0].is_enabled),
    generateTime: timeOnly(rows[0].generate_time),
    timezone: rows[0].timezone,
    updatedByUserId: rows[0].updated_by_user_id,
    createdAt: rows[0].created_at,
    updatedAt: rows[0].updated_at
  };
}

// Upsert the one-row-per-center schedule used by the automatic exporter.
export async function saveCenterDailySchedule({ department, isEnabled, generateTime, updatedByUserId }, executor = pool) {
  await executor.execute(
    `INSERT INTO center_daily_report_schedules (
      department,
      is_enabled,
      generate_time,
      timezone,
      updated_by_user_id
    ) VALUES (?, ?, ?, 'Asia/Shanghai', ?)
    ON DUPLICATE KEY UPDATE
      is_enabled = VALUES(is_enabled),
      generate_time = VALUES(generate_time),
      timezone = VALUES(timezone),
      updated_by_user_id = VALUES(updated_by_user_id)`,
    [department, isEnabled ? 1 : 0, generateTime, updatedByUserId]
  );

  return getCenterDailySchedule({ department }, executor);
}

// List due schedule rows for the current HH:mm minute; missing rows use defaults elsewhere.
export async function listDueCenterDailySchedules({ generateTime }, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT department, is_enabled, generate_time, timezone
    FROM center_daily_report_schedules
    WHERE is_enabled = 1
      AND generate_time = ?`,
    [generateTime]
  );

  return rows.map((row) => ({
    department: row.department,
    isEnabled: Boolean(row.is_enabled),
    generateTime: timeOnly(row.generate_time),
    timezone: row.timezone
  }));
}

// Use MySQL advisory locks so multiple API processes do not export the same center minute twice.
export async function withCenterDailyExportLock(lockKey, callback) {
  const connection = await pool.getConnection();
  try {
    const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 0) AS acquired', [lockKey]);
    if (Number(lockRows[0]?.acquired) !== 1) {
      return { acquired: false, result: null };
    }

    try {
      return { acquired: true, result: await callback() };
    } finally {
      await connection.execute('SELECT RELEASE_LOCK(?)', [lockKey]);
    }
  } finally {
    connection.release();
  }
}

// Return the business date for Asia/Shanghai without relying on the host time zone.
export function getShanghaiDateString(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

// Return HH:mm in Asia/Shanghai for matching center schedule rows.
export function getShanghaiMinuteString(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.hour}:${byType.minute}`;
}
