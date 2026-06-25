import { WeeklyRestMode } from './reports.js';

// ISO date text is the only accepted date format for report APIs and tests.
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Milliseconds per day are used with UTC dates to avoid host timezone drift.
const DAY_MS = 24 * 60 * 60 * 1000;

// Monday is represented as 1 by getUTCDay, while Sunday is 0.
const MONDAY_DAY = 1;

// Saturday is the additional workday in a single-rest week.
const SATURDAY_DAY = 6;

// Validate and parse an ISO date into a UTC midnight Date.
export function parseIsoDate(dateText) {
  if (!ISO_DATE_PATTERN.test(String(dateText || ''))) {
    throw new Error(`Invalid ISO date: ${dateText}`);
  }

  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatIsoDate(date) !== dateText) {
    throw new Error(`Invalid ISO date: ${dateText}`);
  }

  return date;
}

// Format a UTC date as YYYY-MM-DD for database and API use.
export function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

// Return the Monday of the natural week containing the provided date.
export function getWeekStart(dateText) {
  const date = parseIsoDate(dateText);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : MONDAY_DAY - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return formatIsoDate(date);
}

// Count whole weeks between two Monday dates.
export function countWeeksBetween(anchorWeekStart, targetWeekStart) {
  const anchor = parseIsoDate(anchorWeekStart);
  const target = parseIsoDate(targetWeekStart);
  return Math.floor((target.getTime() - anchor.getTime()) / (7 * DAY_MS));
}

// Swap single-rest and double-rest modes for alternating anchor weeks.
export function invertWeeklyRestMode(restMode) {
  if (restMode === WeeklyRestMode.SINGLE_REST) {
    return WeeklyRestMode.DOUBLE_REST;
  }

  if (restMode === WeeklyRestMode.DOUBLE_REST) {
    return WeeklyRestMode.SINGLE_REST;
  }

  throw new Error(`Invalid weekly rest mode: ${restMode}`);
}

// Resolve the target week mode from the closest not-later anchor.
export function resolveWeeklyRestMode({ targetWeekStart, latestAnchor, defaultMode }) {
  if (!latestAnchor) {
    return defaultMode;
  }

  const weekDistance = countWeeksBetween(latestAnchor.weekStart, targetWeekStart);
  if (weekDistance < 0) {
    return defaultMode;
  }

  return weekDistance % 2 === 0 ? latestAnchor.restMode : invertWeeklyRestMode(latestAnchor.restMode);
}

// Return the expected work dates for a natural week under the resolved rest mode.
export function getExpectedWorkdatesForWeek(weekStart, restMode) {
  const start = parseIsoDate(weekStart);
  const days = restMode === WeeklyRestMode.SINGLE_REST ? 6 : 5;

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    return formatIsoDate(date);
  });
}

// Check whether a specific date is expected to be worked under the weekly mode.
export function isExpectedWorkdate(dateText, restMode) {
  const day = parseIsoDate(dateText).getUTCDay();
  if (day >= MONDAY_DAY && day <= 5) {
    return true;
  }

  return restMode === WeeklyRestMode.SINGLE_REST && day === SATURDAY_DAY;
}
