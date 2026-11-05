import { useState, useEffect, useRef, useCallback } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api } from '../../lib/api';
import { uploadImage } from '../../lib/upload';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { TeamDeleteIcon, TeamEditIcon, TeamEmailIcon, TeamSearchIcon, TeamUserIcon } from '../../components/admin/TeamIcons';

interface Project {
  id: string;
  name: string;
  github_url: string;
  image_url: string;
  display_order: number;
}

interface Contributor {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  email: string;
  photoUrl?: string;
}

interface UserResult {
  id: string;
  full_name: string;
  role: string;
  email: string;
  photoUrl?: string;
}

/** Only absolute http(s) URLs are accepted — `javascript:` and `data:` parse fine
 *  with `new URL()` but must never reach an href. */
function isValidUrl(s: string) {
  try {
    const u = new URL(s);
    return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password;
  } catch { return false; }
}

function roleColor(role: string) {
  if (role === 'ADMIN')  return { bg: 'rgba(56,56,56,0.1)',  color: 'var(--ink)' };
  if (role === 'MEMBER') return { bg: 'rgba(5,139,255,0.1)', color: '#0066cc' };
  return { bg: 'rgba(56,56,56,0.06)', color: 'var(--ink-3)' };
}

function getUserInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
}

/* ── Contributors panel (used inside dialog) ── */
function ContributorsPanel({ projectId }: { projectId: string }) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Contributor | null>(null);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  // load existing contributors
  useEffect(() => {
    let cancelled = false;
    setError('');
    api<{ contributors: Contributor[] }>(`/projects/${projectId}/contributors`)
      .then(r => { if (!cancelled) setContributors(r.contributors); })
      .catch(ex => {
        if (!cancelled) setError(ex instanceof Error ? ex.message : 'Could not load contributors.');
      });
    return () => { cancelled = true; };
  }, [projectId]);

  // Cancel any in-flight debounce when the panel goes away.
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const seq = ++searchSeq.current;
    setSearching(true);
    api<{ users: UserResult[] }>(`/projects/search/users?q=${encodeURIComponent(q)}`)
      // Ignore out-of-order responses: a slower earlier query must not
      // overwrite the results of a later one.
      .then(r => { if (seq === searchSeq.current) setResults(r.users); })
      .catch(() => { if (seq === searchSeq.current) setResults([]); })
      .finally(() => { if (seq === searchSeq.current) setSearching(false); });
  }, []);

  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  }

  async function addContributor(user: UserResult) {
    if (contributors.some(c => c.user_id === user.id)) return;
    setAddingId(user.id);
    setError('');
    try {
      const c = await api<Contributor>(`/projects/${projectId}/contributors`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      });
      setContributors(prev => [...prev, c]);
    } catch (ex) {
      // Previously every failure was swallowed, so a rejected add looked like
      // a dead button.
      setError(ex instanceof Error ? ex.message : 'Could not add contributor.');
    }
    finally { setAddingId(null); }
  }

  async function removeContributor(userId: string) {
    setRemovingId(userId);
    try {
      await api(`/projects/${projectId}/contributors/${userId}`, { method: 'DELETE', body: JSON.stringify({}) });
      setContributors(prev => prev.filter(c => c.user_id !== userId));
      setConfirmRemove(null);
    } catch (ex) {
      // Same inline error surface as adding — a blocking alert() was the odd one out.
      setError(ex instanceof Error ? ex.message : 'Could not remove contributor.');
    } finally {
      setRemovingId(null);
    }
  }

  const alreadyAdded = (id: string) => contributors.some(c => c.user_id === id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <span className="si-label">Contributors</span>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'var(--border)', borderRadius: 8, padding: '7px 10px', background: 'var(--cream)' }}>
          <TeamSearchIcon style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--ink-3)' }} />
          <input
            type="text"
            placeholder="Search by name or email…"
            aria-label="Search people to add as contributors"
            value={search}
            onChange={onSearchChange}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', width: '100%', fontFamily: 'inherit' }}
          />
          {searching && <div className="admin-state-spinner" style={{ width: 14, height: 14, borderWidth: 2, flexShrink: 0 }} />}
        </div>

        {/* Search results dropdown */}
        {results.length === 0 && search.trim() && !searching && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--cream-3)', border: 'var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: 'var(--ink-3)', zIndex: 100 }}>
            No matches
          </div>
        )}
        {results.length > 0 && search.trim() && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--cream-3)', border: 'var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 100, maxHeight: 220, overflowY: 'auto' }}>
            {results.map(u => {
              const added = alreadyAdded(u.id);
              const rc = roleColor(u.role);
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: 'var(--border-light)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(56,56,56,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                    {u.photoUrl
                      ? <img src={u.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getUserInitials(u.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <TeamEmailIcon style={{ width: 11, height: 11, flexShrink: 0 }} />
                      {u.email}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 20, background: rc.bg, color: rc.color, flexShrink: 0 }}>
                    {u.role}
                  </span>
                  <button
                    onClick={() => addContributor(u)}
                    disabled={added || addingId === u.id}
                    style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 20, border: added ? '1px solid rgba(56,56,56,0.15)' : '1.5px solid var(--ink)', background: added ? 'rgba(56,56,56,0.05)' : 'var(--ink)', color: added ? 'var(--ink-3)' : 'var(--lime)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', cursor: added ? 'default' : 'pointer', letterSpacing: '0.04em' }}
                  >
                    {addingId === u.id ? '…' : added ? 'Added' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current contributors list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {error && <p className="form-message" role="alert">{error}</p>}
        {contributors.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', padding: '20px 0', fontFamily: 'var(--font-mono)' }}>No contributors yet</p>
        ) : (
          contributors.map(c => {
            const rc = roleColor(c.role);
            return (
              <div key={c.user_id} style={{ display: 'flex', flexDirection: 'column', background: 'var(--cream)', border: 'var(--border)', borderRadius: 9, overflow: 'hidden' }}>
                {/* main row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ink)', color: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                    {c.photoUrl
                      ? <img src={c.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getUserInitials(c.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, fontSize: 10, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <TeamEmailIcon style={{ width: 11, height: 11, flexShrink: 0 }} />
                      {c.email}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 20, background: rc.bg, color: rc.color, flexShrink: 0 }}>
                    {c.role}
                  </span>
                  <button
                    onClick={() => setConfirmRemove(confirmRemove?.user_id === c.user_id ? null : c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', opacity: 0.7, padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    title="Remove contributor"
                  >
                    <TeamDeleteIcon style={{ width: 14, height: 14 }} />
                  </button>
                </div>

                {/* inline confirm strip */}
                {confirmRemove?.user_id === c.user_id && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px 8px', background: 'rgba(220,38,38,0.06)', borderTop: '1px solid rgba(220,38,38,0.12)' }}>
                    <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>Remove {c.full_name}?</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 10px', borderRadius: 20, border: 'var(--border)', background: 'var(--cream)', color: 'var(--ink)', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => removeContributor(c.user_id)}
                        disabled={removingId === c.user_id}
                        style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 10px', borderRadius: 20, border: 'none', background: 'var(--red)', color: '#fff', cursor: 'pointer', opacity: removingId === c.user_id ? 0.6 : 1 }}
                      >
                        {removingId === c.user_id ? '…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Project Dialog (Add / Edit) ── */
interface DialogProps {
  mode: 'add' | 'edit';
  initial?: Project;
  onClose: () => void;
  onSave: (p: Project) => void;
}

function ProjectDialog({ mode, initial, onClose, onSave }: DialogProps) {
  useEscapeKey(onClose);
  const [name, setName] = useState(initial?.name ?? '');
  const [github, setGithub] = useState(initial?.github_url ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.image_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Project name is required.'); return; }
    if (!github.trim() || !isValidUrl(github.trim())) { setError('A valid GitHub URL is required.'); return; }
    setBusy(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        setUploading(true);
        finalImageUrl = await uploadImage(imageFile, 'Projects');
        setUploading(false);
      }
      let saved: Project;
      // After a successful create the dialog stays open for contributors, so a
      // second submit must update that project, not create a duplicate.
      const updatingId = savedId ?? (mode === 'edit' ? initial?.id ?? null : null);
      if (updatingId) {
        saved = await api<Project>(`/projects/${updatingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), githubUrl: github.trim(), imageUrl: finalImageUrl }),
        });
      } else {
        saved = await api<Project>('/projects', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), githubUrl: github.trim(), imageUrl: finalImageUrl }),
        });
        setSavedId(saved.id);
      }
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setUploading(false);
    } finally {
      setBusy(false);
    }
  }

  const projectId = savedId ?? initial?.id ?? null;

  return (
    <div className="am-overlay" role="dialog" aria-modal="true" aria-labelledby="proj-dialog-title">
      {/* wider dialog — two columns */}
      <div className="ct-dialog" style={{ maxWidth: 860 }}>
        <div className="ct-dialog-head">
          <h3 id="proj-dialog-title">{mode === 'add' ? 'Add Project' : 'Edit Project'}</h3>
          <button className="ct-dialog-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1, minHeight: 0 }}>
          {/* LEFT — project fields */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ct-dialog-body" style={{ flexDirection: 'column', gap: 16, borderRight: 'var(--border)' }}>
              {error && <p className="form-message" role="alert" style={{ margin: 0 }}>{error}</p>}

              <div className="si-field">
                <label className="si-label" htmlFor="proj-name">Project Name *</label>
                <input id="proj-name" className="si-input" type="text" placeholder="e.g. ACM Website" value={name} onChange={e => setName(e.target.value)} maxLength={255} required />
              </div>

              <div className="si-field">
                <label className="si-label" htmlFor="proj-github">GitHub URL *</label>
                <input id="proj-github" className="si-input" type="url" placeholder="https://github.com/org/repo" value={github} onChange={e => setGithub(e.target.value)} maxLength={2048} required />
              </div>

              <div className="si-field">
                <label className="si-label">Project Image <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <div
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Choose a project image"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
                  style={{ width: '100%', height: 130, borderRadius: 10, border: '1.5px dashed rgba(56,56,56,0.2)', background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                >
                  {preview ? (
                    <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 6px', display: 'block' }}>
                        <path d="M13 4H8.8C7.11984 4 6.27976 4 5.63803 4.32698C5.07354 4.6146 4.6146 5.07354 4.32698 5.63803C4 6.27976 4 7.11984 4 8.8V15.2C4 16.8802 4 17.7202 4.32698 18.362C4.6146 18.9265 5.07354 19.3854 5.63803 19.673C6.27976 20 7.11984 20 8.8 20H15.2C16.8802 20 17.7202 20 18.362 19.673C18.9265 19.3854 19.3854 18.9265 19.673 18.362C20 17.7202 20 16.8802 20 15.2V11" />
                        <path d="M4 16L8.29289 11.7071C8.68342 11.3166 9.31658 11.3166 9.70711 11.7071L13 15M13 15L15.7929 12.2071C16.1834 11.8166 16.8166 11.8166 17.2071 12.2071L20 15M13 15L15.25 17.25" />
                        <path d="M18 8V3M18 3L16 5M18 3L20 5" />
                      </svg>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>Click to upload</span>
                    </div>
                  )}
                  {uploading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,248,245,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>Uploading…</div>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickFile} />
                {preview && (
                  <button type="button" onClick={() => { setPreview(''); setImageFile(null); setImageUrl(''); if (fileRef.current) fileRef.current.value = ''; }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: 11, color: 'var(--red)', cursor: 'pointer', marginTop: 4 }}>
                    Remove image
                  </button>
                )}
              </div>
            </div>

            <div className="ct-dialog-footer" style={{ borderRight: 'var(--border)' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-fill" disabled={busy}>
                {busy ? (uploading ? 'Uploading…' : 'Saving…') : projectId ? 'Save Changes' : 'Add Project'}
              </button>
            </div>
          </form>

          {/* RIGHT — contributors */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="ct-dialog-body" style={{ flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
              {projectId ? (
                <ContributorsPanel projectId={projectId} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', textAlign: 'center', gap: 10 }}>
                  <TeamUserIcon style={{ width: 28, height: 28, color: 'currentColor' }} />
                  <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', margin: 0 }}>Save the project first<br/>then add contributors</p>
                </div>
              )}
            </div>
            <div className="ct-dialog-footer" style={{ visibility: 'hidden' }}>
              {/* spacer to align footers */}
              <button className="btn btn-ghost">Cancel</button>
              <button className="btn btn-fill">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Delete confirmation ── */
function DeleteDialog({ project, onClose, onDelete }: { project: Project; onClose: () => void; onDelete: () => void }) {
  useEscapeKey(onClose);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setBusy(true);
    try {
      await api(`/projects/${project.id}`, { method: 'DELETE' });
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
      setBusy(false);
    }
  }

  return (
    <div className="am-overlay" role="dialog" aria-modal="true" aria-label={`Delete ${project.name}`}>
      <div className="am-dialog">
        <div className="am-dialog-icon" style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--red)' }}>
          <TeamDeleteIcon style={{ width: 24, height: 24 }} />
        </div>
        <h3>Delete project?</h3>
        <p>"{project.name}" will be permanently removed.</p>
        {error && <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>}
        <div className="am-dialog-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-fill am-btn-danger" onClick={confirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  useEffect(() => {
    api<{ projects: Project[] }>('/projects')
      .then(r => { setProjects(r.projects); setLoading(false); })
      .catch(err => { setFetchError(err.message); setLoading(false); });
  }, []);

  function onAdded(p: Project) { setProjects(prev => [...prev, p]); }
  function onEdited(p: Project) { setProjects(prev => prev.map(x => x.id === p.id ? p : x)); setEditing(null); }
  function onDeleted(id: string) { setProjects(prev => prev.filter(x => x.id !== id)); setDeleting(null); }

  return (
    <>
      <AdminPageHeader title="Projects" subtitle="Manage community projects." icon="projects">
        <button className="btn btn-fill" style={{ flexShrink: 0 }} onClick={() => setShowAdd(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Project
        </button>
      </AdminPageHeader>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="db-shimmer" style={{ height: 96, borderRadius: 12 }} />)}
        </div>
      ) : fetchError ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <h3>Failed to load</h3><p>{fetchError}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state" style={{ maxWidth: 480, margin: '0 auto' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          <h3>No projects yet</h3>
          <p>Click "Add Project" to publish your first community project.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {projects.map(p => (
            <div key={p.id} style={{ background: 'var(--cream-3)', border: 'var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--cream-2)', flexShrink: 0, overflow: 'hidden' }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                    </svg>
                  </div>
                )}
              </div>
              <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{p.name}</h3>
                <a href={isValidUrl(p.github_url) ? p.github_url : undefined} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={p.github_url}>
                  {p.github_url.replace(/^https?:\/\//, '')}
                </a>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                  <button className="btn btn-ghost" style={{ flex: 1, padding: '8px 0', fontSize: 11, justifyContent: 'center' }} onClick={() => setEditing(p)}>
                    <TeamEditIcon style={{ width: 13, height: 13 }} />
                    Edit
                  </button>
                  <button className="btn" style={{ flex: 1, padding: '8px 0', fontSize: 11, justifyContent: 'center', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)' }} onClick={() => setDeleting(p)}>
                    <TeamDeleteIcon style={{ width: 13, height: 13 }} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd  && <ProjectDialog mode="add"  onClose={() => setShowAdd(false)}  onSave={onAdded}  />}
      {editing  && <ProjectDialog mode="edit" initial={editing}  onClose={() => setEditing(null)}  onSave={onEdited}  />}
      {deleting && <DeleteDialog  project={deleting} onClose={() => setDeleting(null)} onDelete={() => onDeleted(deleting.id)} />}
    </>
  );
}
