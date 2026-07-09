import { request, requestBlob, toReadableApiError } from './http.js';

export { toReadableApiError };

// Build a query string while omitting empty filter values.
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

// Search active projects using the backend's real projects table fields.
export async function searchDailyReportProjects(keyword = '', authToken = '') {
  return request(`/api/projects/my-active${buildQuery({ q: keyword })}`, { authToken });
}

// Load the authenticated employee's daily report list.
export async function listDailyReports(filters = {}, authToken = '') {
  return request(`/api/daily-reports${buildQuery(filters)}`, { authToken });
}

// Load one daily report owned by the authenticated employee.
export async function getDailyReport(reportId, authToken = '') {
  return request(`/api/daily-reports/${reportId}`, { authToken });
}

// 根据日报日期和项目精确查询周报计划目标，供日报填写页带入。
export async function getDailyReportPlanSuggestion({ reportDate, projectId }, authToken = '') {
  return request(`/api/daily-reports/plan-suggestion${buildQuery({ reportDate, projectId })}`, { authToken });
}

// Load selectable weekly plans scoped to the current daily report project and natural week.
export async function getAvailableWeeklyPlansForDailyReport({ reportDate, projectId }, authToken = '') {
  return request(`/api/daily-reports/available-weekly-plans${buildQuery({ reportDate, projectId })}`, { authToken });
}

// Create a daily report as draft or submitted.
export async function createDailyReport(payload, authToken = '') {
  return request('/api/daily-reports', {
    method: 'POST',
    authToken,
    body: JSON.stringify(payload)
  });
}

// Update an existing daily report as draft or submitted.
export async function updateDailyReport(reportId, payload, authToken = '') {
  return request(`/api/daily-reports/${reportId}`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify(payload)
  });
}

// Delete is limited by the backend to draft reports.
export async function deleteDailyReport(reportId, authToken = '') {
  return request(`/api/daily-reports/${reportId}`, {
    method: 'DELETE',
    authToken
  });
}

// Upload one progress image for an existing daily report.
export async function uploadDailyReportAttachment(reportId, file, authToken = '') {
  const formData = new FormData();
  formData.append('file', file);

  return request(`/api/daily-reports/${reportId}/attachments`, {
    method: 'POST',
    authToken,
    body: formData
  });
}

// Download one progress image attachment.
export async function downloadDailyReportAttachment(reportId, attachmentId, authToken = '') {
  return requestBlob(`/api/daily-reports/${reportId}/attachments/${attachmentId}/download`, {
    authToken
  });
}

// Delete one progress image attachment.
export async function deleteDailyReportAttachment(reportId, attachmentId, authToken = '') {
  return request(`/api/daily-reports/${reportId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    authToken
  });
}

// Download the personal daily report Excel workbook.
export async function exportDailyReport(reportId, authToken = '') {
  return requestBlob(`/api/daily-reports/${reportId}/export`, {
    authToken
  });
}
