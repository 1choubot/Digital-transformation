import { request } from './http.js';

export async function listUsers(authToken) {
  return request('/api/users', { authToken });
}

export async function listResponsibilityCandidates(authToken) {
  return request('/api/users/responsibility-candidates', { authToken });
}

export async function listSolutionDesignRoleCandidates(authToken) {
  return request('/api/users/solution-design-role-candidates', { authToken });
}

export async function createUser(payload, authToken) {
  return request('/api/users', {
    method: 'POST',
    authToken,
    body: JSON.stringify(payload)
  });
}

export async function updateUser(userId, payload, authToken) {
  return request(`/api/users/${userId}`, {
    method: 'PATCH',
    authToken,
    body: JSON.stringify(payload)
  });
}

export async function enableUser(userId, authToken) {
  return request(`/api/users/${userId}/enable`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function disableUser(userId, authToken) {
  return request(`/api/users/${userId}/disable`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function resetUserPassword(userId, password, authToken) {
  return request(`/api/users/${userId}/reset-password`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ password })
  });
}
