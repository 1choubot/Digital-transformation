const TOKEN_KEY = 'digitalPlatformAuthToken';
const USER_KEY = 'digitalPlatformCurrentUser';

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY) || '';
}

export function getStoredUser() {
  const rawValue = window.localStorage.getItem(USER_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

export function storeAuthSession({ token, user }) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateStoredUser(user) {
  if (!user) {
    window.localStorage.removeItem(USER_KEY);
    return;
  }

  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
