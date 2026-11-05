import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, post } from '../lib/api';

export interface User { id: string; fullName: string; email: string; role: 'USER' | 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN' }
interface AuthState {
  user: User | null; loading: boolean; error: string;
  refresh: () => Promise<void>; setUser: (user: User | null) => void; logout: () => Promise<boolean>;
}
export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Every session check takes a ticket. A response only applies if it is still
  // the newest ticket, so a slow /auth/session reply (the provider re-checks on
  // window focus) cannot overwrite a sign-in or sign-out that happened since.
  const ticket = useRef(0);

  const applyUser = useCallback((next: User | null) => {
    ticket.current += 1;
    setUser(next);
  }, []);

  const refresh = useCallback(async () => {
    const mine = ++ticket.current;
    setError('');
    try {
      const next = (await api<{ user: User | null }>('/auth/session')).user;
      if (mine === ticket.current) setUser(next);
    } catch (err) {
      if (mine === ticket.current) {
        setUser(null);
        if (!(err instanceof ApiError && err.status === 401)) setError(err instanceof Error ? err.message : 'Unable to check your session.');
      }
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // Always drop the local user, even when the request fails, so the UI can
  // never claim a sign-out that did not happen. Returns whether the server
  // session was actually destroyed.
  const logout = useCallback(async () => {
    let ok = true;
    try { await post('/auth/logout', {}); }
    catch { ok = false; }
    finally { applyUser(null); }
    return ok;
  }, [applyUser]);

  return <AuthContext.Provider value={{ user, loading, error, refresh, setUser: applyUser, logout }}>{children}</AuthContext.Provider>;
}
