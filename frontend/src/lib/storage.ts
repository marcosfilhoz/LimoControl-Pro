const TOKEN_KEY = "lc_token";
const USER_KEY = "lc_user";
const CREDS_KEY = "lc_creds";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser<T = unknown>() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setUser(user: unknown) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export type SavedCreds = { email: string; password: string; remember: boolean };

export function getSavedCreds(): SavedCreds | null {
  const raw = localStorage.getItem(CREDS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedCreds;
  } catch {
    return null;
  }
}

export function setSavedCreds(creds: SavedCreds) {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

export function clearSavedCreds() {
  localStorage.removeItem(CREDS_KEY);
}


