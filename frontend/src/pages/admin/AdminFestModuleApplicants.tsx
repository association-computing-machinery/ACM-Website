import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api } from '../../lib/api';
import type { FestFormAnswers, FestModuleForm } from '../../lib/ituFestForm';

interface Applicant {
  id: string;
  moduleName: string;
  appliedAt: string;
  applicantName: string;
  applicantEmail: string;
  answers: FestFormAnswers;
  formSnapshot: FestModuleForm | null;
}

interface ModuleApplicants {
  module: { id: string; name: string };
  form: FestModuleForm | null;
  applicants: Applicant[];
}

function formatAppliedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminFestModuleApplicants() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ModuleApplicants | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Applicant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [expandedApplicantId, setExpandedApplicantId] = useState<string | null>(null);

  useEffect(() => {
    if (!moduleId) {
      setError('A competition module was not specified.');
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    api<ModuleApplicants>(`/itu-fest/modules/${moduleId}/applications`)
      .then(data => { if (active) setResult(data); })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load module applicants.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [moduleId]);

  async function deleteApplication() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api(`/itu-fest/applications/${deleteTarget.id}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
      setResult(current => current
        ? { ...current, applicants: current.applicants.filter(applicant => applicant.id !== deleteTarget.id) }
        : current);
      setDeleteTarget(null);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete this application.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="fest-applicants-page">
      <AdminPageHeader
        title={result?.module.name ?? 'Module Applicants'}
        subtitle="Students who have applied to this competition module."
        icon="events"
        leading={(
          <Link to="/admin/events" className="fest-applicants-back" aria-label="Back to ITU Fest modules" title="Back to ITU Fest modules">
            <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
              <path d="M669.6 849.6c8.8 8 22.4 7.2 30.4-1.6s7.2-22.4-1.6-30.4l-309.6-280c-8-7.2-8-17.6 0-24.8l309.6-270.4c8.8-8 9.6-21.6 2.4-30.4-8-8.8-21.6-9.6-30.4-2.4L360.8 480.8c-27.2 24-28 64-0.8 88.8l309.6 280z" />
            </svg>
          </Link>
        )}
      >
        {moduleId && (
          <button type="button" className="btn btn-fill" onClick={() => navigate(`/admin/events/${moduleId}/form`)}>
            Form
          </button>
        )}
      </AdminPageHeader>

      <div className="recruitment-admin-section-head fest-applicants-section-head">
        <div>
          <h2>Participants</h2>
          {!loading && !error && <p>{result?.applicants.length ?? 0} applicant{result?.applicants.length === 1 ? '' : 's'}</p>}
        </div>
      </div>
      {loading ? (
        <p className="ub-empty" role="status">Loading applicants…</p>
      ) : error ? (
        <div className="empty-state" role="alert">
          <h3>Could not load applicants</h3>
          <p>{error}</p>
        </div>
      ) : result?.applicants.length ? (
        <div className="ub-card recruitment-applications-list">
          {result.applicants.map(applicant => {
            const responseForm = applicant.formSnapshot ?? result.form;
            return (
              <article className="fest-applicant-card" key={applicant.id}>
                <div className="fest-applicant-row">
                  <div className="fest-applicant-identity">
                    <h3>{applicant.applicantName}</h3>
                    <a href={`mailto:${applicant.applicantEmail}`}>{applicant.applicantEmail}</a>
                  </div>
                  <span className="fest-applicant-date">Applied {formatAppliedAt(applicant.appliedAt)}</span>
                  <div className="fest-applicant-actions">
                    <button
                      type="button"
                      className="fest-applicant-icon-button"
                      aria-label={`${expandedApplicantId === applicant.id ? 'Hide' : 'View'} ${applicant.applicantName}'s responses`}
                      aria-expanded={expandedApplicantId === applicant.id}
                      onClick={() => setExpandedApplicantId(current => current === applicant.id ? null : applicant.id)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="fest-applicant-icon-button is-delete"
                      onClick={() => {
                        setDeleteError('');
                        setDeleteTarget(applicant);
                      }}
                      aria-label={`Delete ${applicant.applicantName}'s application`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                      </svg>
                    </button>
                  </div>
                </div>
                {expandedApplicantId === applicant.id && (
                  <div className="fest-applicant-response-content">
                    {responseForm ? responseForm.sections.map(section => {
                      const answeredQuestions = section.questions.filter(question => {
                        const answer = applicant.answers?.[question.id];
                        return answer !== undefined && answer !== '' && (!Array.isArray(answer) || answer.length > 0);
                      });
                      if (!answeredQuestions.length) return null;
                      return (
                        <section className="fest-applicant-response-section" key={section.id}>
                          <h4>{section.title}</h4>
                          <div className="fest-applicant-response-grid">
                            {answeredQuestions.map(question => {
                              const answer = applicant.answers[question.id];
                              if (answer === undefined || answer === '') return null;
                              const values = Array.isArray(answer) ? answer : [answer];
                              const display = values.map(value => (
                                question.options.find(option => option.id === value)?.label ?? value
                              ));
                              return (
                                <div className="fest-applicant-answer" key={question.id}>
                                  <strong>{question.title}</strong>
                                  {question.type === 'photo'
                                    ? display.map(url => <a href={url} target="_blank" rel="noreferrer" key={url}>View attached photo</a>)
                                    : question.type === 'email'
                                      ? display.map(email => <a href={`mailto:${email}`} key={email}>{email}</a>)
                                      : <span>{display.join(', ')}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    }) : <p className="fest-applicant-unavailable">The form definition is unavailable.</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No applicants yet</h3>
          <p>Students who apply to {result?.module.name} will appear here.</p>
        </div>
      )}
      {deleteTarget && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-labelledby="fest-delete-application-title">
          <section className="am-dialog recruitment-delete-dialog">
            <h3 id="fest-delete-application-title">Delete this response?</h3>
            <p>
              The application from <strong>{deleteTarget.applicantName}</strong> for {deleteTarget.moduleName} will be permanently deleted.
            </p>
            {deleteError && <p className="recruitment-form-error" role="alert">{deleteError}</p>}
            <div className="am-dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="btn btn-fill am-btn-danger" onClick={() => void deleteApplication()} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete response'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
