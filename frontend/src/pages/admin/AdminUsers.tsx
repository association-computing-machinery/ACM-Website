import { useCallback, useEffect, useRef, useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api } from '../../lib/api';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface FullUser {
  id: string;
  fullName: string;
  email: string;
  role: 'USER' | 'MEMBER';
  university: string;
  phone: string;
  joinedAt: string;
  photoUrl: string;
}

interface DeleteState { id: string; fullName: string }
interface Toast { id: number; msg: string; ok: boolean }

let toastId = 0;

export default function AdminUsers() {
  const [users, setUsers]           = useState<FullUser[]>([]);
  const [search, setSearch]         = useState('');
  const [query, setQuery]           = useState('');
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [busy, setBusy]             = useState(false);
  const [deleteUser, setDeleteUser] = useState<DeleteState | null>(null);
  const [toasts, setToasts]         = useState<Toast[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimers = useRef<number[]>([]);

  useEffect(() => () => { toastTimers.current.forEach(clearTimeout); toastTimers.current = []; }, []);

  useEscapeKey(() => setDeleteUser(null), Boolean(deleteUser));

  const toast = (msg: string, ok = true) => {
    const id = ++toastId;
    setToasts(t => [...t, { id, msg, ok }]);
    toastTimers.current.push(window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000));
  };

  // Search runs on the server: the endpoint returns one page of accounts, so a
  // client-side filter could never find anyone outside that page.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<{ users: FullUser[]; total: number }>(
        `/admin/users?search=${encodeURIComponent(query)}&role=USER,MEMBER`
      );
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users.');
      toast(err instanceof Error ? err.message : 'Unable to load users.', false);
    }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  const confirmDelete = async () => {
    if (!deleteUser) return;
    setBusy(true);
    try {
      await api(`/admin/users/${deleteUser.id}`, { method: 'DELETE', body: JSON.stringify({}) });
      setUsers(cur => cur.filter(u => u.id !== deleteUser.id));
      setTotal(cur => Math.max(0, cur - 1));
      toast(`${deleteUser.fullName} has been deleted.`);
      setDeleteUser(null);
    } catch (err) { toast(err instanceof Error ? err.message : 'Could not delete user.', false); }
    finally { setBusy(false); }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <>
      <AdminPageHeader title="Users" subtitle="All registered members and users — admins are managed in Settings." icon="users" />

      <div className="ub-card">
        <div className="ub-search-row">
          <div className="ub-search-wrap" onClick={() => searchRef.current?.focus()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input ref={searchRef} type="search" className="ub-search"
              placeholder="Search by name, email, university or phone…"
              value={search} onChange={e => setSearch(e.target.value)} aria-label="Search users" />
          </div>
          <span className="ub-count">
            {users.length === total ? `${total} user${total !== 1 ? 's' : ''}` : `Showing ${users.length} of ${total} users`}
          </span>
        </div>

        {users.length < total && (
          <p className="ub-empty">Only the newest {users.length} of {total} accounts are listed — search to narrow the results.</p>
        )}

        {loading ? (
          <p className="ub-empty">Loading…</p>
        ) : error ? (
          <div className="ub-empty">
            <p role="alert">{error}</p>
            <button className="btn" onClick={() => void load()}>Try again</button>
          </div>
        ) : users.length === 0 ? (
          <p className="ub-empty">{query ? 'No users match your search.' : 'No users yet.'}</p>
        ) : (
          <div className="ub-table-wrap">
            <table className="ub-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>University</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="ub-user-cell">
                        <div className="ub-avatar">
                          {u.photoUrl
                            ? <img src={u.photoUrl} alt={u.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', borderRadius: '50%' }} />
                            : u.fullName.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="ub-name">{u.fullName}</div>
                          <div className="ub-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="ub-cell-muted">{u.university || '—'}</td>
                    <td className="ub-cell-muted">{u.phone || '—'}</td>
                    <td>
                      <span className={`db-status-pill ${u.role === 'MEMBER' ? 'db-pill-member' : 'db-pill-user'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="ub-cell-muted">{formatDate(u.joinedAt)}</td>
                    <td>
                      <div className="ub-actions">
                        <button className="ub-del-btn" title="Delete user"
                          onClick={() => setDeleteUser({ id: u.id, fullName: u.fullName })}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      {deleteUser && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
          <div className="am-dialog">
            <div className="am-dialog-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h3 id="delete-user-title">Delete User</h3>
            <p>Permanently delete <strong>{deleteUser.fullName}</strong>? This cannot be undone.</p>
            <div className="am-dialog-actions">
              <button className="btn" onClick={() => setDeleteUser(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-fill am-btn-danger" onClick={() => void confirmDelete()} disabled={busy}>
                {busy ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item ${t.ok ? 'toast-ok' : 'toast-err'}`}>
            {t.ok
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            }
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}
