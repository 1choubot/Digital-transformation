import { request } from './http.js';

export async function getModuleNavigation(moduleCode, authToken = '') {
  return request(`/api/navigation/${moduleCode}`, { authToken });
}

export async function getProjectNavigation(projectId, authToken = '') {
  return request(`/api/projects/${projectId}/navigation`, { authToken });
}
