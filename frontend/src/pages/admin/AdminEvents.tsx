import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { api } from '../../lib/api';
import { uploadImage } from '../../lib/upload';
import { TeamDeleteIcon, TeamEditIcon } from '../../components/admin/TeamIcons';

interface FestModule {
  id: string;
  name: string;
  display_order: number;
  image_url: string;
  isEnabled: boolean;
}

interface ApplicationPeriod {
  startAt: string | null;
  endAt: string | null;
  isOpen: boolean;
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ModuleDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: FestModule | null;
  onClose: () => void;
  onSave: (module: FestModule) => void;
}) {
  useEscapeKey(onClose);
  const [name, setName] = useState(initial?.name ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.image_url ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imageFile) return;
    const objectUrl = URL.createObjectURL(imageFile);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  function chooseImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    setError('');
    setImageFile(file);
  }

  function removeImage() {
    setImageFile(null);
    setImageUrl('');
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a module name.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        setUploading(true);
        finalImageUrl = await uploadImage(imageFile, 'Events');
      }
      const saved = await api<FestModule>(
        initial ? `/itu-fest/modules/${initial.id}` : '/itu-fest/modules',
        {
          method: initial ? 'PATCH' : 'POST',
          body: JSON.stringify({ name: trimmedName, imageUrl: finalImageUrl }),
        }
      );
      onSave(initial ? { ...initial, ...saved } : saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this module.');
    } finally {
      setUploading(false);
      setBusy(false);
    }
  }

  return (
    <div className="am-overlay" role="dialog" aria-modal="true" aria-labelledby="fest-module-dialog-title">
      <form className="am-dialog fest-module-dialog" onSubmit={submit}>
        <h3 id="fest-module-dialog-title">{initial ? 'Edit Module' : 'Add Module'}</h3>
        <label className="si-field">
          <span className="si-label">Module name</span>
          <input
            className="si-input"
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="e.g. Competitive Programming"
            maxLength={120}
            autoFocus
            required
          />
        </label>
        <div className="si-field">
          <span className="si-label">Module picture <span className="fest-module-optional">(optional)</span></span>
          <button
            type="button"
            className="fest-module-image-picker"
            onClick={() => fileRef.current?.click()}
            aria-label={preview ? 'Change module picture' : 'Choose module picture'}
          >
            {preview ? (
              <img src={preview} alt="Module preview" />
            ) : (
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                Choose an image
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} hidden />
          {preview && <button type="button" className="fest-module-remove-image" onClick={removeImage}>Remove picture</button>}
        </div>
        {error && <p className="fest-module-error" role="alert">{error}</p>}
        <div className="am-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-fill" disabled={busy}>
            {busy ? (uploading ? 'Uploading…' : 'Saving…') : initial ? 'Save Changes' : 'Add Module'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteModuleDialog({
  module,
  onClose,
  onDelete,
}: {
  module: FestModule;
  onClose: () => void;
  onDelete: () => void;
}) {
  useEscapeKey(onClose);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    setError('');
    try {
      await api(`/itu-fest/modules/${module.id}`, { method: 'DELETE', body: JSON.stringify({}) });
      onDelete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this module.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="am-overlay" role="dialog" aria-modal="true" aria-labelledby="fest-module-delete-title">
      <div className="am-dialog fest-module-dialog">
        <h3 id="fest-module-delete-title">Delete module?</h3>
        <p><strong>{module.name}</strong> will be permanently removed.</p>
        {error && <p className="fest-module-error" role="alert">{error}</p>}
        <div className="am-dialog-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-fill am-btn-danger" onClick={confirmDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete Module'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminEvents() {
  const [modules, setModules] = useState<FestModule[]>([]);
  const [period, setPeriod] = useState<ApplicationPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FestModule | null>(null);
  const [deleting, setDeleting] = useState<FestModule | null>(null);
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [updatingAvailability, setUpdatingAvailability] = useState<string | null>(null);
  useEscapeKey(() => setEditingPeriod(false), editingPeriod);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError('');
    Promise.all([
      api<{ modules: FestModule[] }>('/itu-fest/modules/manage'),
      api<ApplicationPeriod>('/itu-fest/period'),
    ])
      .then(([moduleResult, periodResult]) => {
        if (!cancelled) {
          setModules(moduleResult.modules.map(module => ({
            ...module,
            isEnabled: Boolean(module.isEnabled),
          })));
          setPeriod(periodResult);
        }
      })
      .catch(cause => {
        if (!cancelled) setFetchError(cause instanceof Error ? cause.message : 'Could not load ITU Fest modules.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  function openPeriodEditor() {
    setStartAt(toLocalDateTimeInput(period?.startAt ?? null));
    setEndAt(toLocalDateTimeInput(period?.endAt ?? null));
    setPeriodError('');
    setEditingPeriod(true);
  }

  async function savePeriod() {
    if ((startAt && !endAt) || (!startAt && endAt)) {
      setPeriodError('Enter both a start and end date, or leave both empty to close applications.');
      return;
    }
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
      setPeriodError('The end date must be after the start date.');
      return;
    }
    setSavingPeriod(true);
    setPeriodError('');
    try {
      const updated = await api<ApplicationPeriod>('/itu-fest/period', {
        method: 'PATCH',
        body: JSON.stringify({
          startAt: startAt ? new Date(startAt).toISOString() : null,
          endAt: endAt ? new Date(endAt).toISOString() : null,
        }),
      });
      setPeriod(updated);
      setEditingPeriod(false);
    } catch (cause) {
      setPeriodError(cause instanceof Error ? cause.message : 'Could not save ITU Fest application dates.');
    } finally {
      setSavingPeriod(false);
    }
  }

  function saveModule(module: FestModule) {
    if (editing) {
      setModules(current => current.map(item => item.id === module.id ? module : item));
      setEditing(null);
    } else {
      setModules(current => [...current, module]);
      setShowAdd(false);
    }
  }

  async function toggleModuleAvailability(module: FestModule) {
    setUpdatingAvailability(module.id);
    setAvailabilityError('');
    try {
      const updated = await api<{ id: string; isEnabled: boolean }>(
        `/itu-fest/modules/${module.id}/availability`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isEnabled: !module.isEnabled }),
        }
      );
      setModules(current => current.map(item => (
        item.id === updated.id ? { ...item, isEnabled: updated.isEnabled } : item
      )));
    } catch (cause) {
      setAvailabilityError(cause instanceof Error ? cause.message : 'Could not change module availability.');
    } finally {
      setUpdatingAvailability(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="ITU Fest"
        subtitle="Create modules and select a card to view its applicants."
        icon="events"
      >
        <div className="fest-admin-header-actions">
          <button
            className={`btn btn-fill fest-apply-date-button${period?.isOpen ? ' fest-apply-date-open' : ''}`}
            onClick={openPeriodEditor}
            disabled={loading}
          >
            Apply Date
          </button>
          <button className="btn btn-fill" onClick={() => setShowAdd(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Module
          </button>
        </div>
      </AdminPageHeader>

      {availabilityError && <p className="fest-module-error" role="alert">{availabilityError}</p>}
      {loading ? (
        <div className="fest-module-grid" role="status" aria-label="Loading modules">
          {[1, 2, 3].map(index => <div key={index} className="fest-module-card-skeleton db-shimmer" />)}
        </div>
      ) : fetchError ? (
        <div className="empty-state">
          <h3>Could not load ITU Fest modules</h3>
          <p>{fetchError}</p>
          <button className="btn btn-fill" onClick={() => setReloadKey(key => key + 1)}>Try again</button>
        </div>
      ) : modules.length === 0 ? (
        <div className="empty-state">
          <h3>No competition modules yet</h3>
          <p>Add modules such as Competitive Programming, Robotics, AI Hackathon, Web Development, or App Development.</p>
          <button className="btn btn-fill" onClick={() => setShowAdd(true)}>Add First Module</button>
        </div>
      ) : (
        <div className="fest-module-grid">
          {modules.map((module, index) => (
            <article className={`fest-module-card${module.isEnabled ? '' : ' is-disabled'}`} key={module.id}>
              <Link
                className="fest-module-art"
                to={`/admin/events/${module.id}`}
                aria-label={`View applicants for ${module.name}`}
              >
                {module.image_url ? (
                  <img src={module.image_url} alt="" />
                ) : (
                  <svg viewBox="0 0 48 48" fill="none">
                    <path d="M24 7v5m0 0H12v8c0 6 5.4 10 12 10s12-4 12-10v-8H24Zm-8 23h16m-8 0v7m-8 0h16M12 16H7v4c0 3 2 5 5 5m24-9h5v4c0 3-2 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span className="fest-module-number">{String(index + 1).padStart(2, '0')}</span>
                <h2 className="fest-module-title">{module.name}</h2>
              </Link>
              <div className="fest-module-card-actions">
                <button
                  type="button"
                  className="fest-module-icon-button"
                  aria-label={`Edit ${module.name}`}
                  title="Edit module"
                  onClick={() => setEditing(module)}
                >
                  <TeamEditIcon style={{ width: 18, height: 18 }} />
                </button>
                <button
                  type="button"
                  className="fest-module-icon-button fest-module-icon-delete"
                  aria-label={`Delete ${module.name}`}
                  title="Delete module"
                  onClick={() => setDeleting(module)}
                >
                  <TeamDeleteIcon style={{ width: 18, height: 18 }} />
                </button>
                <button
                  type="button"
                  className={`fest-module-icon-button fest-module-availability-button${module.isEnabled ? ' is-enabled' : ' is-disabled'}`}
                  aria-label={`${module.isEnabled ? 'Disable' : 'Enable'} ${module.name}`}
                  aria-pressed={module.isEnabled}
                  title={module.isEnabled ? 'Disable applications for this module' : 'Enable applications for this module'}
                  disabled={updatingAvailability === module.id}
                  onClick={() => void toggleModuleAvailability(module)}
                >
                  {module.isEnabled ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                    </svg>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showAdd && <ModuleDialog initial={null} onClose={() => setShowAdd(false)} onSave={saveModule} />}
      {editing && <ModuleDialog initial={editing} onClose={() => setEditing(null)} onSave={saveModule} />}
      {deleting && (
        <DeleteModuleDialog
          module={deleting}
          onClose={() => setDeleting(null)}
          onDelete={() => {
            setModules(current => current.filter(module => module.id !== deleting.id));
            setDeleting(null);
          }}
        />
      )}
      {editingPeriod && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-labelledby="fest-period-title">
          <section className="am-dialog recruitment-period-dialog">
            <h3 id="fest-period-title">ITU Fest Application Dates</h3>
            <p>Set when students can apply. Leave both dates empty to close applications.</p>
            <div className="recruitment-period-fields">
              <label>
                Start date and time
                <input type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)} />
              </label>
              <label>
                End date and time
                <input type="datetime-local" value={endAt} onChange={event => setEndAt(event.target.value)} />
              </label>
            </div>
            {periodError && <p className="recruitment-form-error" role="alert">{periodError}</p>}
            <div className="am-dialog-actions">
              <button type="button" className="btn" onClick={() => setEditingPeriod(false)} disabled={savingPeriod}>Cancel</button>
              <button type="button" className="btn btn-fill" onClick={() => void savePeriod()} disabled={savingPeriod}>
                {savingPeriod ? 'Saving…' : 'Save Dates'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
