export type JWTUser = { id: string | number; email: string; isAdmin: boolean; fullName?: string; exp?: number };

const STORAGE_KEY = 'auth_token';

function decodeToken(token: string): JWTUser | null {
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return null;
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isExpired(payload: JWTUser): boolean {
  if (!payload.exp) return false;
  return Date.now() / 1000 > payload.exp;
}

// Tokens may live in either storage depending on whether "remember me" was
// checked at login time. Always read/clear both so a token stored under
// either strategy keeps working everywhere it's consulted.
function readRawToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
}

function removeRawToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

export function getStoredUser(): JWTUser | null {
  const token = readRawToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded || isExpired(decoded)) {
    removeRawToken();
    return null;
  }
  return decoded;
}

export function getStoredToken(): string | null {
  return readRawToken();
}

/**
 * Persists the auth token.
 * - `remember: true`  -> localStorage (survives browser restarts)
 * - `remember: false` (default) -> sessionStorage (cleared when the tab closes)
 * Always clears the other storage first so a stale token from a previous
 * login mode can't linger and be picked up by `readRawToken`.
 */
export function storeToken(token: string, remember = false): void {
  if (typeof window !== 'undefined') {
    removeRawToken();
    (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, token);
  }
  window.dispatchEvent(new Event('auth-change'));
}

export function clearToken(): void {
  removeRawToken();
  window.dispatchEvent(new Event('auth-change'));
}
