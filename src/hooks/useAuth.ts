import { useState, useEffect } from 'react';
import { getStoredUser, clearToken, type JWTUser } from '@/lib/auth-client';

export function useAuth() {
  const [user, setUser] = useState<JWTUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = () => {
      setUser(getStoredUser());
      setLoading(false);
    };

    refresh();
    window.addEventListener('auth-change', refresh);
    return () => window.removeEventListener('auth-change', refresh);
  }, []);

  return {
    user,
    isAdmin: user?.isAdmin ?? false,
    loading,
    signOut: () => {
      clearToken();
      setUser(null);
    },
  };
}
