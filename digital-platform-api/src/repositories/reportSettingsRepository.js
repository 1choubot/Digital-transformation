import { pool } from '../db/pool.js';

// MySQL DATE values may be strings or Date objects depending on driver settings.
function dateOnly(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(value || '').slice(0, 10);
}

// Map a rest-mode anchor row into API/domain field names.
function mapWeeklyRestModeAnchor(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    weekStart: dateOnly(row.week_start),
    restMode: row.rest_mode,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Map a center daily schedule row into API/domain field names.
function mapCenterDailyReportSchedule(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    department: row.department,
    isEnabled: Boolean(row.is_enabled),
    generateTime: row.generate_time,
    timezone: row.timezone,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Fetch the closest anchor not later than the target week.
export async function findLatestWeeklyRestModeAnchor(targetWeekStart, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM report_weekly_rest_mode_anchors
    WHERE week_start <= ?
    ORDER BY week_start DESC, id DESC
    LIMIT 1`,
    [targetWeekStart]
  );

  return mapWeeklyRestModeAnchor(rows[0]);
}

// Upsert one anchor per natural-week Monday.
export async function upsertWeeklyRestModeAnchor({ weekStart, restMode, userId }, executor = pool) {
  await executor.execute(
    `INSERT INTO report_weekly_rest_mode_anchors (
      week_start,
      rest_mode,
      created_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      rest_mode = VALUES(rest_mode),
      updated_by_user_id = VALUES(updated_by_user_id),
      updated_at = CURRENT_TIMESTAMP`,
    [weekStart, restMode, userId, userId]
  );

  const [rows] = await executor.execute(
    `SELECT *
    FROM report_weekly_rest_mode_anchors
    WHERE week_start = ?
    LIMIT 1`,
    [weekStart]
  );

  return mapWeeklyRestModeAnchor(rows[0]);
}

// Fetch a single center schedule by users.department code/value.
export async function getCenterDailyReportSchedule(department, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM center_daily_report_schedules
    WHERE department = ?
    LIMIT 1`,
    [department]
  );

  return mapCenterDailyReportSchedule(rows[0]);
}

// Upsert the per-center automatic generation schedule.
export async function upsertCenterDailyReportSchedule(
  { department, isEnabled, generateTime, timezone, updatedByUserId },
  executor = pool
) {
  await executor.execute(
    `INSERT INTO center_daily_report_schedules (
      department,
      is_enabled,
      generate_time,
      timezone,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      is_enabled = VALUES(is_enabled),
      generate_time = VALUES(generate_time),
      timezone = VALUES(timezone),
      updated_by_user_id = VALUES(updated_by_user_id),
      updated_at = CURRENT_TIMESTAMP`,
    [department, isEnabled ? 1 : 0, generateTime, timezone, updatedByUserId || null]
  );

  return getCenterDailyReportSchedule(department, executor);
}
