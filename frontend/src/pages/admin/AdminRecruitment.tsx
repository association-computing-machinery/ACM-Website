import { useEffect, useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api } from '../../lib/api';

interface RecruitmentStatus {
  startAt: string | null;
  endAt: string | null;
  isOpen: boolean;
}

interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  teamName: string;
  reason: string;
  commitment: string;
  createdAt: string;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminRecruitment() {
  const [status, setStatus] = useState<RecruitmentStatus | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [deleteApplication, setDeleteApplication] = useState<Application | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api<RecruitmentStatus>('/recruitment/status'),
      api<{ applications: Application[] }>('/recruitment/applications'),
    ])
      .then(([period, applicationList]) => {
        if (!active) return;
        setStatus(period);
        setStartAt(toLocalDateTimeInput(period.startAt));
        setEndAt(toLocalDateTimeInput(period.endAt));
        setApplications(applicationList.applications);
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load recruitment data.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openPeriodEditor = () => {
    setStartAt(toLocalDateTimeInput(status?.startAt || null));
    setEndAt(toLocalDateTimeInput(status?.endAt || null));
    setError('');
    setSuccess('');
    setEditingPeriod(true);
  };

  const savePeriod = async () => {
    if ((startAt && !endAt) || (!startAt && endAt)) {
      setError('Enter both a start and end date, or leave both empty to close recruitment.');
      return;
    }
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
      setError('The end date must be after the start date.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api<RecruitmentStatus>('/recruitment/period', {
        method: 'PATCH',
        body: JSON.stringify({
          startAt: startAt ? new Date(startAt).toISOString() : null,
          endAt: endAt ? new Date(endAt).toISOString() : null,
        }),
      });
      setStatus(updated);
      setEditingPeriod(false);
      setSuccess('Recruitment period saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the recruitment period.');
    } finally {
      setSaving(false);
    }
  };

  const removeApplication = async () => {
    if (!deleteApplication) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await api(`/recruitment/applications/${deleteApplication.id}`, { method: 'DELETE' });
      setApplications(current => current.filter(application => application.id !== deleteApplication.id));
      setDeleteApplication(null);
      setSuccess('Application deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the application.');
    } finally {
      setDeleting(false);
    }
  };

  const removeAllApplications = async () => {
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const result = await api<{ deleted: number }>('/recruitment/applications', { method: 'DELETE' });
      setApplications([]);
      setSearch('');
      setTeamFilter('');
      setConfirmDeleteAll(false);
      setSuccess(`${result.deleted} application${result.deleted === 1 ? '' : 's'} deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete applications.');
    } finally {
      setDeleting(false);
    }
  };

  const teams = [...new Set(applications.map(application => application.teamName))]
    .sort((left, right) => left.localeCompare(right));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredApplications = applications.filter(application => (
    (!teamFilter || application.teamName === teamFilter) &&
    (!normalizedSearch ||
      application.applicantName.toLowerCase().includes(normalizedSearch) ||
      application.applicantEmail.toLowerCase().includes(normalizedSearch))
  ));

  return (
    <section className="recruitment-admin">
      <div className="recruitment-admin-top">
        <AdminPageHeader title="Recruitment" subtitle="Manage the recruitment period and review applications." icon="recruitment" />
        <div className="recruitment-admin-actions">
          <button type="button" className="btn recruitment-delete-all" onClick={() => setConfirmDeleteAll(true)} disabled={applications.length === 0}>
            Delete All Responses
          </button>
          <button
            type="button"
            className={`btn btn-fill${status?.isOpen ? ' recruitment-period-open' : ''}`}
            onClick={openPeriodEditor}
          >
            Recruitment Period
          </button>
        </div>
      </div>

      {error && !editingPeriod && <p className="form-message" role="alert">{error}</p>}
      {success && <p className="recruitment-admin-success" role="status">{success}</p>}

      <div className="recruitment-admin-applications">
        <div className="recruitment-admin-section-head">
          <div>
            <h2>Applications</h2>
            <p>
              {filteredApplications.length === applications.length
                ? `${applications.length} submission${applications.length === 1 ? '' : 's'}`
                : `${filteredApplications.length} of ${applications.length} submissions`}
            </p>
          </div>
        </div>
        {loading ? (
          <p className="ub-empty" role="status">Loading recruitment data…</p>
        ) : applications.length === 0 ? (
          <div className="ub-card"><p className="ub-empty">No recruitment applications have been submitted yet.</p></div>
        ) : (
          <div className="ub-card recruitment-applications-list">
            <div className="recruitment-filter-bar">
              <label className="recruitment-filter-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  placeholder="Search by applicant name or email"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  aria-label="Search applications by applicant name or email"
                />
              </label>
              <label className="recruitment-filter-team">
                <span>Filter by team</span>
                <select value={teamFilter} onChange={event => setTeamFilter(event.target.value)} aria-label="Filter applications by team">
                  <option value="">All teams</option>
                  {teams.map(team => <option key={team} value={team}>{team}</option>)}
                </select>
              </label>
            </div>
            {filteredApplications.length === 0 ? (
              <p className="ub-empty">No applications match these filters.</p>
            ) : filteredApplications.map(application => (
              <article className="recruitment-application-row" key={application.id}>
                <div className="recruitment-application-main">
                  <div>
                    <h3>{application.applicantName}</h3>
                    <a href={`mailto:${application.applicantEmail}`}>{application.applicantEmail}</a>
                  </div>
                  <span className="recruitment-application-team">{application.teamName}</span>
                </div>
                <p className="recruitment-application-reason">{application.reason}</p>
                <div className="recruitment-application-meta">
                  <span>Commitment: {application.commitment}</span>
                  <time dateTime={application.createdAt}>{formatDate(application.createdAt)}</time>
                  <button
                    type="button"
                    className="recruitment-delete-one"
                    onClick={() => setDeleteApplication(application)}
                    aria-label={`Delete application from ${application.applicantName}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {editingPeriod && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-labelledby="recruitment-period-title">
          <section className="am-dialog recruitment-period-dialog">
            <h3 id="recruitment-period-title">Recruitment Period</h3>
            <p>Select when applications should open and close. Leave both fields empty to close recruitment.</p>
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
            {error && <p className="recruitment-form-error" role="alert">{error}</p>}
            <div className="am-dialog-actions">
              <button type="button" className="btn" onClick={() => setEditingPeriod(false)} disabled={saving}>Cancel</button>
              <button type="button" className="btn btn-fill" onClick={() => void savePeriod()} disabled={saving}>
                {saving ? 'Saving…' : 'Save Period'}
              </button>
            </div>
          </section>
        </div>
      )}

      {(deleteApplication || confirmDeleteAll) && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-labelledby="recruitment-delete-title">
          <section className="am-dialog recruitment-delete-dialog">
            <h3 id="recruitment-delete-title">
              {confirmDeleteAll ? 'Delete all responses?' : 'Delete this response?'}
            </h3>
            <p>
              {confirmDeleteAll
                ? `This will permanently delete all ${applications.length} recruitment responses. This action cannot be undone.`
                : `This will permanently delete ${deleteApplication?.applicantName}'s application. This action cannot be undone.`}
            </p>
            <div className="am-dialog-actions">
              <button
                type="button"
                className="btn"
                onClick={() => { setDeleteApplication(null); setConfirmDeleteAll(false); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-fill am-btn-danger"
                onClick={() => void (confirmDeleteAll ? removeAllApplications() : removeApplication())}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
