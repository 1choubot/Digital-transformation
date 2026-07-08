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

// Load the authenticated user's personal weekly report list.
export async function listWeeklyReports(filters = {}, authToken = '') {
  return request(`/api/weekly-reports${buildQuery(filters)}`, { authToken });
}

// Load one weekly report owned by the authenticated user.
export async function getWeeklyReport(reportId, authToken = '') {
  return request(`/api/weekly-reports/${reportId}`, { authToken });
}

// Load the weekly-vs-daily comparison rows for an employee weekly report.
export async function getWeeklyReportComparisonTable(reportId, authToken = '') {
  return request(`/api/weekly-reports/${reportId}/comparison-table`, { authToken });
}

// Load a read-only weekly summary draft generated from previous plans and submitted daily reports.
export async function getWeeklyReportPrefillSuggestion({ weekStart, force = false }, authToken = '') {
  return request(`/api/weekly-reports/prefill-suggestion${buildQuery({ weekStart, force: force ? 'true' : '' })}`, { authToken });
}

export async function getWeeklyReportAiCapability(authToken = '') {
  return request('/api/weekly-reports/ai-capability', { authToken });
}

export async function composeWeeklyReportPrefillWithAi({ weekStart, basisHash }, authToken = '') {
  return request('/api/weekly-reports/prefill-suggestion/ai-compose', {
    method: 'POST',
    authToken,
    body: JSON.stringify({ weekStart, basisHash })
  });
}

// Create a draft or submitted weekly report.
export async function createWeeklyReport(payload, authToken = '') {
  return request('/api/weekly-reports', {
    method: 'POST',
    authToken,
    body: JSON.stringify(payload)
  });
}

// Replace an existing weekly report and invalidate any cached score.
export async function updateWeeklyReport(reportId, payload, authToken = '') {
  return request(`/api/weekly-reports/${reportId}`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify(payload)
  });
}

// Delete is backend-limited to draft weekly reports.
export async function deleteWeeklyReport(reportId, authToken = '') {
  return request(`/api/weekly-reports/${reportId}`, {
    method: 'DELETE',
    authToken
  });
}

export async function evaluateWeeklyReport(reportId, { force = false } = {}, authToken = '') {
  return request(`/api/weekly-reports/${reportId}/evaluate${buildQuery({ force: force ? 'true' : '' })}`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ force })
  });
}

export async function saveWeeklyReportFinalReview(reportId, payload, authToken = '') {
  return request(`/api/weekly-reports/${reportId}/final-review`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify(payload)
  });
}

// Save the center manager's weekly report approval decision.
export async function reviewWeeklyReportApproval(reportId, payload, authToken = '') {
  return request(`/api/weekly-reports/${reportId}/approval`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify(payload)
  });
}

export async function exportWeeklyReport(reportId, authToken = '') {
  return requestBlob(`/api/weekly-reports/${reportId}/export`, {
    method: 'POST',
    authToken
  });
}

// Load weekly evaluation overview rows for management roles.
export async function listWeeklyComparisonOverview(filters = {}, authToken = '') {
  return request(`/api/weekly-reports/comparison-overview${buildQuery(filters)}`, {
    authToken
  });
}

// Get the resolved weekly rest mode and anchor for a specified (or current) week.
export async function getWeeklyRestMode(weekStart = '', authToken = '') {
  return request(`/api/weekly-reports/rest-mode${buildQuery({ weekStart })}`, { authToken });
}

// Set the weekly rest-mode anchor for a specific week (general_manager/system_admin only).
export async function setWeeklyRestMode({ weekStart, restMode }, authToken = '') {
  return request('/api/weekly-reports/rest-mode', {
    method: 'PUT',
    authToken,
    body: JSON.stringify({ weekStart, restMode })
  });
}
