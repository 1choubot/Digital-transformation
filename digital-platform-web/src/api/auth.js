import { request } from './http.js';

export async function login(identifier, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password })
  });
}

export async function logout(authToken) {
  return request('/api/auth/logout', {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function getCurrentUser(authToken) {
  return request('/api/auth/me', {
    authToken
  });
}
