import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { GlobalStyles, Navbar } from './LandingPage';

interface RecruitmentTeam {
  id: string;
  name: string;
  responsibilities: string;
}

interface RecruitmentStatus {
  isOpen: boolean;
  teams: RecruitmentTeam[];
}

interface ApplicationStatus {
  hasApplied: boolean;
}

type AgreementKey = 'commitTime' | 'attendEvents' | 'professionalConduct';

const AGREEMENTS: { key: AgreementKey; label: string }[] = [
  { key: 'commitTime', label: 'I can commit the required weekly time' },
  { key: 'attendEvents', label: 'I will attend mandatory meetings/events' },
  { key: 'professionalConduct', label: 'I agree to act professionally and respectfully' },
];

const COMMITMENTS = ['1-5 hours/week', '6-10 hours/week', '10-15 hours/week'];
const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export default function RecruitmentApplicationPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<RecruitmentStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [teamId, setTeamId] = useState('');
  const [reason, setReason] = useState('');
  const [commitment, setCommitment] = useState('');
  const [agreements, setAgreements] = useState<Record<AgreementKey, boolean>>({
    commitTime: false,
    attendEvents: false,
    professionalConduct: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api<RecruitmentStatus>('/recruitment/status'),
      api<ApplicationStatus>('/recruitment/applications/mine'),
    ])
      .then(([statusResult, applicationResult]) => {
        if (!active) return;
        if (statusResult.status === 'fulfilled') {
          setStatus(statusResult.value);
        } else {
          setStatusError(statusResult.reason instanceof Error
            ? statusResult.reason.message
            : 'Could not load recruitment information.');
        }
        if (applicationResult.status === 'fulfilled') {
          setSubmitted(applicationResult.value.hasApplied);
        } else {
          setStatusError(applicationResult.reason instanceof Error
            ? applicationResult.reason.message
            : 'Could not check your application status.');
        }
      })
      .finally(() => { if (active) setLoadingStatus(false); });
    return () => { active = false; };
  }, []);

  const selectedTeam = useMemo(
    () => status?.teams.find(team => team.id === teamId),
    [status?.teams, teamId]
  );
  const reasonWords = countWords(reason);
  const canSubmit = Boolean(
    status?.isOpen &&
    selectedTeam &&
    reason.trim() &&
    reasonWords <= 20 &&
    commitment &&
    Object.values(agreements).every(Boolean) &&
    !submitting
  );

  if (loading) return <main className="account-profile-state" role="status">Checking your account…</main>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.email.toLowerCase().endsWith('@itu.edu.pk')) {
    return <Navigate to="/member" replace />;
  }

  const submitApplication = async () => {
    if (!canSubmit || !selectedTeam) return;
    setSubmitting(true);
    setError('');
    try {
      await api('/recruitment/applications', {
        method: 'POST',
        body: JSON.stringify({ teamId, reason: reason.trim(), commitment, agreements }),
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof Error && err.message === 'You have already applied for this recruitment period.') {
        setSubmitted(true);
      } else {
        setError(err instanceof Error ? err.message : 'Could not submit your application.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <GlobalStyles />
      <Navbar showNavigation={false} rightAction={{ label: 'BACK TO HOME', to: '/member' }} />
      <main className="recruitment-application-page">
        <section className="recruitment-application-card">
          <span className="recruitment-eyebrow">ACM ITU · Recruitment</span>
          <h1>Team Application</h1>
          {loadingStatus ? (
            <p role="status">Loading application form…</p>
          ) : submitted ? (
            <div className="recruitment-success" role="status">
              <h2>Application submitted</h2>
              <p>Thank you for applying. The ACM ITU team will review your application.</p>
              <button type="button" className="btn btn-fill" onClick={() => navigate('/member')}>Back to home</button>
            </div>
          ) : statusError ? (
            <p className="recruitment-form-error" role="alert">{statusError}</p>
          ) : !status?.isOpen ? (
            <div className="recruitment-success">
              <h2>Applications are closed</h2>
              <p>There is no active recruitment period right now.</p>
            </div>
          ) : (
            <form className="recruitment-form" onSubmit={event => { event.preventDefault(); void submitApplication(); }}>
              <div className="recruitment-form-field">
                <label htmlFor="recruitment-team">Q1. What team do you want to join?</label>
                <select id="recruitment-team" value={teamId} onChange={event => setTeamId(event.target.value)} required>
                  <option value="">Select a team</option>
                  {status.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
                {selectedTeam?.responsibilities && (
                  <p className="recruitment-team-responsibilities">
                    <strong>Team responsibilities:</strong> {selectedTeam.responsibilities}
                  </p>
                )}
              </div>

              <div className="recruitment-form-field">
                <label htmlFor="recruitment-reason">Q2. Why do you want to join this team? (20 words maximum)</label>
                <textarea
                  id="recruitment-reason"
                  rows={3}
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  placeholder="Share your reason in up to 20 words."
                  required
                />
                <span className={reasonWords > 20 ? 'recruitment-word-count is-invalid' : 'recruitment-word-count'}>
                  {reasonWords} / 20 words
                </span>
              </div>

              <fieldset className="recruitment-form-field recruitment-commitment">
                <legend>Q3. How much time can you commit?</legend>
                {COMMITMENTS.map(option => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="commitment"
                      value={option}
                      checked={commitment === option}
                      onChange={() => setCommitment(option)}
                    />
                    {option}
                  </label>
                ))}
              </fieldset>

              <fieldset className="recruitment-form-field recruitment-agreements">
                <legend>Agreement (all are required)</legend>
                {AGREEMENTS.map(agreement => (
                  <label key={agreement.key}>
                    <input
                      type="checkbox"
                      checked={agreements[agreement.key]}
                      onChange={event => setAgreements(current => ({
                        ...current,
                        [agreement.key]: event.target.checked,
                      }))}
                    />
                    {agreement.label}
                  </label>
                ))}
              </fieldset>

              {error && <p className="recruitment-form-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn-fill" disabled={!canSubmit}>
                {submitting ? 'Submitting…' : 'Submit application'}
              </button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
