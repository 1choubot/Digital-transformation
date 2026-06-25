import { request } from './http.js';

export async function getMyWorkbench(authToken = '') {
  return request('/api/me/workbench', { authToken });
}

export async function listMyStageDocumentTasks({ status = 'pending', projectId = null } = {}, authToken = '') {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (projectId !== null && projectId !== undefined && projectId !== '') {
    params.set('projectId', String(projectId));
  }

  const queryString = params.toString();
  return request(`/api/me/stage-document-tasks${queryString ? `?${queryString}` : ''}`, { authToken });
}
