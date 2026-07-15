// Format a browser-local date without converting it through UTC.
export function formatLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Return the previous complete natural Monday-Sunday week.
export function getPreviousWeekPeriod(now = new Date()) {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + mondayOffset);
  const previousMonday = new Date(currentMonday);
  previousMonday.setDate(currentMonday.getDate() - 7);
  const previousSunday = new Date(previousMonday);
  previousSunday.setDate(previousMonday.getDate() + 6);

  return {
    weekStart: formatLocalIsoDate(previousMonday),
    weekEnd: formatLocalIsoDate(previousSunday)
  };
}

export function isNaturalWeekPeriod(weekStart, weekEnd) {
  if (!weekStart || !weekEnd) return false;
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${weekEnd}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getDay() !== 1) return false;
  const expectedEnd = new Date(start);
  expectedEnd.setDate(start.getDate() + 6);
  return formatLocalIsoDate(expectedEnd) === formatLocalIsoDate(end);
}
