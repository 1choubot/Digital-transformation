import { request, requestBlob, toReadableApiError } from './http.js';

export { toReadableApiError };

// Build query strings while omitting empty filters.
function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, String(value).trim());
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

// Load the center options allowed for the current user.
export async function listCenterDailyReportDepartments(authToken = '') {
  return request('/api/center-daily-reports/departments', { authToken });
}

// Load one center daily report summary for preview.
export async function getCenterDailyReport(filters = {}, authToken = '') {
  return request(`/api/center-daily-reports${buildQuery(filters)}`, { authToken });
}

// Load the selected center's automatic export schedule.
export async function getCenterDailyReportSchedule(department, authToken = '') {
  return request(`/api/center-daily-reports/schedule${buildQuery({ department })}`, { authToken });
}

// Save the automatic export schedule for a permitted center.
export async function saveCenterDailyReportSchedule(payload, authToken = '') {
  return request('/api/center-daily-reports/schedule', {
    method: 'PUT',
    authToken,
    body: JSON.stringify(payload)
  });
}

export async function exportCenterDailyReport(payload, authToken = '') {
  return requestBlob(`/api/center-daily-reports/export${buildQuery({ department: payload.department })}`, {
    method: 'POST',
    authToken,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ date: payload.date, department: payload.department })
  });
}

