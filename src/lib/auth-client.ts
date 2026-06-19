export type JWTUser = { id: string | number; email: string; isAdmin: boolean; fullName?: string; exp?: number };

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

export function getStoredUser(): JWTUser | null {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded || isExpired(decoded)) {
    if (typeof window !== 'undefined') sessionStorage.removeItem('auth_token');
    return null;
  }
  return decoded;
}

export function getStoredToken(): string | null {
  return typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
}

export function storeToken(token: string): void {
  if (typeof window !== 'undefined') sessionStorage.setItem('auth_token', token);
  window.dispatchEvent(new Event('auth-change'));
}

export function clearToken(): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem('auth_token');
  window.dispatchEvent(new Event('auth-change'));
}
