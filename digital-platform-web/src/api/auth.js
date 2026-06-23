import { request } from './http.js';

export async function login(account, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account, password })
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
