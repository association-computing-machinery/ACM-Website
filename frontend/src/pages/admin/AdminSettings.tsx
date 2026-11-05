import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, type User } from '../../auth/AuthContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api } from '../../lib/api';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { uploadImage } from '../../lib/upload';
import { useSite } from '../../context/SiteContext';
import { TeamEditIcon, TeamEmailIcon, TeamSearchIcon } from '../../components/admin/TeamIcons';

interface AdminUser extends User {
  photoUrl?: string;
}

interface Confirm { user: AdminUser; action: 'grant' | 'revoke' }

function getUserInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
}

// ── Site Info Card ──────────────────────────────────────────────────────────
function SiteInfoCard() {
  const { settings, update } = useSite();
  const [societyName, setSocietyName] = useState(settings.societyName);
  const [location, setLocation] = useState(settings.location);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [logoHover, setLogoHover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedTimer = useRef<number | null>(null);

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  const flagSaved = () => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    // Never overwrite text the admin is part-way through typing: the settings
    // object identity changes whenever the provider refetches or any field is
    // patched elsewhere.
    if (dirty) return;
    setSocietyName(settings.societyName);
    setLocation(settings.location);
    setLogoUrl(settings.logoUrl);
  }, [settings, dirty]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError('');
    try {
      const url = await uploadImage(file, 'Others');
      // Only show the new logo once the server has stored it, so the UI cannot
      // display a logo that silently reverts on the next load.
      const result = await api<{ societyName: string; location: string; logoUrl: string }>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({ logoUrl: url }),
      });
      setDirty(false);
      update(result);
      setLogoUrl(result.logoUrl);
      flagSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await api<{ societyName: string; location: string; logoUrl: string }>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({ societyName, location }),
      });
      setDirty(false);
      update(result);
      flagSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="si-card">
      <div className="si-card-head">
        <h2>Site Information</h2>
        <p>Basic details shown across your public website.</p>
      </div>

      <div className="si-body">
        <div className="si-logo-wrap" onMouseEnter={() => setLogoHover(true)} onMouseLeave={() => setLogoHover(false)}>
          <img src={logoUrl} alt="Society Logo" className="si-logo-img" />

          {logoHover && (
            <div className="si-logo-overlay">
              <button type="button" className="si-logo-btn" onClick={() => fileRef.current?.click()} disabled={saving}>
                <TeamEditIcon />
                Edit
              </button>

              <a className="si-logo-btn" href={logoUrl} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                View
              </a>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
        </div>

        <div className="si-fields">
          <div className="si-field">
            <label className="si-label">Society Name</label>
            <input className="si-input" type="text" value={societyName} onChange={e => { setSocietyName(e.target.value); setDirty(true); }} placeholder="e.g. ACM ITU Student Chapter" />
          </div>

          <div className="si-field">
            <label className="si-label">Location</label>
            <input className="si-input" type="text" value={location} onChange={e => { setLocation(e.target.value); setDirty(true); }} placeholder="e.g. Information Technology University, Lahore" />
          </div>

          <button type="button" className="si-save-btn" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>

          {error && <p style={{ color: '#dc2626', fontSize: '12px', margin: '0' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Admin Settings ──────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { user: me } = useAuth();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Debounced server search: a slower earlier response must not overwrite the
  // results of a later query.
  const loadSeq = useRef(0);

  useEscapeKey(() => setConfirm(null), Boolean(confirm));

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError('');
    try {
      // Ask the server for each role set. Fetching one page of all accounts and
      // partitioning it client-side hid any admin older than that page, so a
      // stale admin could not be revoked — and the same truncation hid
      // promotable users behind it.
      const [candidates, staff] = await Promise.all([
        api<{ users: AdminUser[]; total: number }>(`/admin/users?search=${encodeURIComponent(query)}&role=USER,MEMBER`),
        api<{ users: AdminUser[] }>('/admin/users?search=&role=ADMIN,SUPER_ADMIN'),
      ]);
      if (seq !== loadSeq.current) return;
      setAllUsers(candidates.users);
      setCandidateTotal(candidates.total);
      setAdmins(staff.users);
    } catch (err) {
      if (seq === loadSeq.current) setError(err instanceof Error ? err.message : 'Unable to load users.');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  // Search runs on the server, so results are not limited to the fetched page.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const confirmAction = async () => {
    if (!confirm) return;
    setBusy(true);
    setError('');
    const newRole = confirm.action === 'grant' ? 'ADMIN' : 'USER';

    try {
      await api(`/admin/users/${confirm.user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole, expectedRole: confirm.user.role }),
      });
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update role.');
    } finally {
      setBusy(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <>
        <AdminPageHeader title="Settings" subtitle="Admin management is restricted to Super Admins." icon="settings" />
        <SiteInfoCard />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader title="Settings" subtitle="Manage your chapter's site information and administrator access." icon="settings" />

      {error && <p className="form-message" role="alert">{error}</p>}

      <SiteInfoCard />

      <div className="si-section-label">Admin Management</div>

      <div className="am-panel">
        {/* LEFT — Users */}
        <div className="am-col am-col-left">
          <div className="am-col-head">
            <h2>All Users</h2>
            <span className="am-count">{allUsers.length}</span>
          </div>

          <div className="am-search-wrap" onClick={() => searchRef.current?.focus()}>
            <TeamSearchIcon />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="am-search"
              aria-label="Search users"
            />
          </div>

          {allUsers.length < candidateTotal && (
            <p className="am-empty">Showing {allUsers.length} of {candidateTotal} — search to narrow the list.</p>
          )}

          {loading ? (
            <p className="am-empty">Loading…</p>
          ) : allUsers.length === 0 ? (
            <p className="am-empty">{query ? 'No users match your search.' : 'No regular users found.'}</p>
          ) : (
            <ul className="am-list">
              {allUsers.map(u => (
                <li key={u.id} className="am-row">
                  <div className="am-avatar" style={{ overflow: 'hidden' }}>
                    {u.photoUrl
                      ? <img src={u.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getUserInitials(u.fullName)}
                  </div>

                  <div className="am-user-info">
                    <div className="am-name">
                      <span className="am-name-text">{u.fullName}</span>
                      <span className={`db-status-pill ${u.role === 'MEMBER' ? 'db-pill-member' : 'db-pill-user'}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="am-email"><TeamEmailIcon style={{ width: 12, height: 12, flexShrink: 0 }} />{u.email}</div>
                  </div>

                  <button type="button" className="am-grant-btn" disabled={busy} onClick={() => setConfirm({ user: u, action: 'grant' })}>
                    Give Admin Access
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* RIGHT — Admins */}
        <div className="am-col am-col-right">
          <div className="am-col-head">
            <h2>Admins</h2>
            <span className="am-count">{admins.length}</span>
          </div>

          {loading ? (
            <p className="am-empty">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="am-empty">No admins yet.</p>
          ) : (
            <ul className="am-list">
              {admins.map(u => (
                <li key={u.id} className="am-row">
                  <div className="am-avatar am-avatar--admin" style={{ overflow: 'hidden' }}>
                    {u.photoUrl
                      ? <img src={u.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getUserInitials(u.fullName)}
                  </div>

                  <div className="am-user-info">
                    <div className="am-name">
                      <span className="am-name-text">{u.fullName}</span>
                      <span className={`db-status-pill ${u.role === 'SUPER_ADMIN' ? 'db-pill-super' : 'db-pill-admin'}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="am-email"><TeamEmailIcon style={{ width: 12, height: 12, flexShrink: 0 }} />{u.email}</div>
                  </div>

                  {u.role !== 'SUPER_ADMIN' && (
                    <button type="button" className="am-revoke-btn" disabled={busy} onClick={() => setConfirm({ user: u, action: 'revoke' })}>
                      Remove Admin
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Confirmation popup */}
      {confirm && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title">
          <div className="am-dialog">
            <div className="am-dialog-icon">
              {confirm.action === 'grant' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                </svg>
              )}
            </div>

            <h3 id="admin-confirm-title">
              {confirm.action === 'grant' ? 'Grant Admin Access' : 'Remove Admin Access'}
            </h3>

            <p>
              {confirm.action === 'grant'
                ? <>Are you sure you want to give <strong>{confirm.user.fullName}</strong> admin access? They will be able to manage team, events, projects, and users.</>
                : <>Are you sure you want to remove admin access from <strong>{confirm.user.fullName}</strong>? They will no longer be able to access the admin panel.</>}
            </p>

            <div className="am-dialog-actions">
              <button type="button" className="btn" onClick={() => setConfirm(null)} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-fill ${confirm.action === 'revoke' ? 'am-btn-danger' : ''}`}
                onClick={() => void confirmAction()}
                disabled={busy}
              >
                {busy ? 'Updating…' : confirm.action === 'grant' ? 'Yes, Grant Access' : 'Yes, Remove Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
