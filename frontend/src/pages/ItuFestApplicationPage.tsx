import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import {
  nextFestSection,
  type FestFormAnswers,
  type FestModuleForm,
  type FestFormQuestion,
} from '../lib/ituFestForm';
import { GlobalStyles, Navbar } from './LandingPage';

interface FestModule {
  id: string;
  name: string;
  image_url?: string;
}

interface ApplicationStatus {
  isOpen: boolean;
  startAt: string | null;
  endAt: string | null;
}

interface FormResult {
  module: FestModule;
  form: FestModuleForm | null;
}

type EmailCheck = {
  email: string;
  status: 'checking' | 'valid' | 'invalid' | 'error';
  message?: string;
};

function getApplicationClosedMessage(period: ApplicationStatus | null) {
  if (!period) {
    return 'Could not load the ITU Fest application dates. Please refresh the page and try again.';
  }
  if (!period.startAt || !period.endAt) {
    return 'ITU Fest application dates have not been announced yet.';
  }
  const now = Date.now();
  const startAt = new Date(period.startAt);
  const endAt = new Date(period.endAt);
  const formatDate = (date: Date) => date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  if (now < startAt.getTime()) {
    return `Applications open on ${formatDate(startAt)}. Please return then to apply.`;
  }
  if (now > endAt.getTime()) {
    return `The application deadline passed on ${formatDate(endAt)}. Applications are now closed.`;
  }
  return 'Applications are temporarily unavailable. Please try again shortly.';
}

export default function ItuFestApplicationPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const [modules, setModules] = useState<FestModule[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselSliding, setCarouselSliding] = useState(false);
  const [period, setPeriod] = useState<ApplicationStatus | null>(null);
  const [form, setForm] = useState<FestModuleForm | null>(null);
  const [selectedModule, setSelectedModule] = useState<FestModule | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [currentSectionId, setCurrentSectionId] = useState('');
  const [sectionPath, setSectionPath] = useState<string[]>([]);
  const [answers, setAnswers] = useState<FestFormAnswers>({});
  const [loadingForm, setLoadingForm] = useState(true);
  const [loadingModuleForm, setLoadingModuleForm] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingQuestion, setUploadingQuestion] = useState('');
  const [emailChecks, setEmailChecks] = useState<Record<string, EmailCheck>>({});
  const emailCheckTimers = useRef(new Map<string, number>());
  const emailCheckVersions = useRef(new Map<string, number>());

  useEffect(() => () => {
    emailCheckTimers.current.forEach(timer => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<{ modules: FestModule[] }>('/itu-fest/modules'),
      api<ApplicationStatus>('/itu-fest/period'),
    ])
      .then(([moduleResult, applicationPeriod]) => {
        if (!active) return;
        setModules(moduleResult.modules);
        setPeriod(applicationPeriod);
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load the ITU Fest application form.');
      })
      .finally(() => { if (active) setLoadingForm(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timers = emailCheckTimers.current;
    const versions = emailCheckVersions.current;
    if (!moduleId) {
      setForm(null);
      setSelectedModule(null);
      setCurrentSectionId('');
      setSectionPath([]);
      setAnswers({});
      setEmailChecks({});
      setError('');
      setLoadingModuleForm(false);
      return;
    }
    let active = true;
    setLoadingModuleForm(true);
    setError('');
    setAnswers({});
    setEmailChecks({});
    setSectionPath([]);
    api<FormResult>(`/itu-fest/modules/${moduleId}/form`)
      .then(result => {
        if (!active) return;
        setForm(result.form);
        setSelectedModule(result.module);
        setCurrentSectionId(result.form?.sections[0]?.id ?? '');
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load this competition form.');
      })
      .finally(() => { if (active) setLoadingModuleForm(false); });
    return () => {
      active = false;
      timers.forEach(timer => window.clearTimeout(timer));
      timers.clear();
      versions.forEach((version, questionId) => {
        versions.set(questionId, version + 1);
      });
    };
  }, [moduleId]);

  const currentSection = useMemo(
    () => form?.sections.find(section => section.id === currentSectionId) ?? null,
    [form, currentSectionId]
  );
  const currentSectionIndex = currentSection ? form?.sections.findIndex(section => section.id === currentSection.id) ?? -1 : -1;
  const emailQuestions = form?.sections.flatMap(section => section.questions.filter(question => question.type === 'email')) ?? [];
  const lockedAccountEmailQuestionId = emailQuestions.length > 1 ? emailQuestions[0].id : null;
  const modulesWithImages = modules.filter(item => item.image_url);

  useEffect(() => {
    setCarouselIndex(0);
    setCarouselSliding(false);
    if (modulesWithImages.length < 2) return;
    const timer = window.setInterval(() => {
      setCarouselSliding(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [modulesWithImages.length]);

  if (loading) return <main className="account-profile-state" role="status">Checking your account…</main>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.email.toLowerCase().endsWith('@itu.edu.pk')) return <Navigate to="/member" replace />;
  const accountEmail = user.email.trim().toLowerCase();

  function getDuplicateEmailQuestionIds(answersToCheck: FestFormAnswers) {
    const addresses = new Map<string, string>();
    const duplicates = new Set<string>();
    for (const question of emailQuestions) {
      const answer = question.id === lockedAccountEmailQuestionId
        ? accountEmail
        : answersToCheck[question.id];
      if (typeof answer !== 'string' || !answer.trim()) continue;
      const address = answer.trim().toLowerCase();
      const previousQuestionId = addresses.get(address);
      if (previousQuestionId) {
        duplicates.add(previousQuestionId);
        duplicates.add(question.id);
      } else {
        addresses.set(address, question.id);
      }
    }
    return duplicates;
  }

  const duplicateEmailQuestionIds = getDuplicateEmailQuestionIds(answers);

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers(current => ({ ...current, [questionId]: value }));
  }

  function setEmailAnswer(questionId: string, value: string) {
    setAnswer(questionId, value);
    const version = (emailCheckVersions.current.get(questionId) ?? 0) + 1;
    emailCheckVersions.current.set(questionId, version);
    const previousTimer = emailCheckTimers.current.get(questionId);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);

    const address = value.trim().toLowerCase();
    if (!address) {
      setEmailChecks(current => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setEmailChecks(current => ({
        ...current,
        [questionId]: { email: address, status: 'invalid', message: 'Enter a valid email address.' },
      }));
      return;
    }
    const answerValues = {
      ...answers,
      [questionId]: address,
    };
    const duplicateIds = getDuplicateEmailQuestionIds(answerValues);
    if (duplicateIds.has(questionId)) {
      setEmailChecks(current => ({
        ...current,
        [questionId]: {
          email: address,
          status: 'invalid',
          message: 'Use a different email for each participant.',
        },
      }));
      return;
    }
    if (!moduleId) return;

    setEmailChecks(current => ({
      ...current,
      [questionId]: { email: address, status: 'checking' },
    }));
    const timer = window.setTimeout(async () => {
      try {
        const result = await api<{ exists: boolean; alreadyApplied: boolean }>('/itu-fest/email-check', {
          method: 'POST',
          body: JSON.stringify({ email: address, moduleId }),
        });
        if (emailCheckVersions.current.get(questionId) !== version) return;
        const valid = result.exists && !result.alreadyApplied;
        setEmailChecks(current => ({
          ...current,
          [questionId]: {
            email: address,
            status: valid ? 'valid' : 'invalid',
            message: result.alreadyApplied
              ? 'This participant has already applied to this module.'
              : result.exists
                ? 'This email is linked to an ACM website account.'
                : 'No ACM website account was found for this email.',
          },
        }));
      } catch (cause) {
        if (emailCheckVersions.current.get(questionId) !== version) return;
        setEmailChecks(current => ({
          ...current,
          [questionId]: {
            email: address,
            status: 'error',
            message: cause instanceof Error ? cause.message : 'Could not verify this email address.',
          },
        }));
      }
    }, 400);
    emailCheckTimers.current.set(questionId, timer);
  }

  async function verifyCurrentSectionEmails(answersToCheck: FestFormAnswers) {
    const visibleSectionIds = new Set([...sectionPath, ...(currentSection ? [currentSection.id] : [])]);
    const questions = form?.sections
      .filter(section => visibleSectionIds.has(section.id))
      .flatMap(section => section.questions.filter(question => question.type === 'email')) ?? [];
    const duplicateIds = getDuplicateEmailQuestionIds(answersToCheck);
    const duplicate = questions.find(question => duplicateIds.has(question.id));
    if (duplicate) {
      const duplicateAnswer = answersToCheck[duplicate.id];
      setEmailChecks(current => ({
        ...current,
        [duplicate.id]: {
          email: typeof duplicateAnswer === 'string' ? duplicateAnswer : accountEmail,
          status: 'invalid',
          message: 'Use a different email for each participant.',
        },
      }));
      setError('Each participant must use a different email address.');
      return false;
    }
    for (const question of questions) {
      const answer = answersToCheck[question.id];
      const address = typeof answer === 'string' ? answer.trim().toLowerCase() : '';
      if (!address) continue;

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        setEmailChecks(current => ({
          ...current,
          [question.id]: { email: address, status: 'invalid', message: 'Enter a valid email address.' },
        }));
        setError(`Enter a valid email address for: ${question.title}`);
        return false;
      }

      const timer = emailCheckTimers.current.get(question.id);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        emailCheckTimers.current.delete(question.id);
      }
      const version = (emailCheckVersions.current.get(question.id) ?? 0) + 1;
      emailCheckVersions.current.set(question.id, version);
      if (!moduleId) return false;
      setEmailChecks(current => ({
        ...current,
        [question.id]: { email: address, status: 'checking' },
      }));
      try {
        const result = await api<{ exists: boolean; alreadyApplied: boolean }>('/itu-fest/email-check', {
          method: 'POST',
          body: JSON.stringify({ email: address, moduleId }),
        });
        if (emailCheckVersions.current.get(question.id) !== version) return false;
        const valid = result.exists && !result.alreadyApplied;
        setEmailChecks(current => ({
          ...current,
          [question.id]: {
            email: address,
            status: valid ? 'valid' : 'invalid',
            message: result.alreadyApplied
              ? 'This participant has already applied to this module.'
              : result.exists
                ? 'This email is linked to an ACM website account.'
                : 'No ACM website account was found for this email.',
          },
        }));
        if (!valid) {
          setError(result.alreadyApplied
            ? `A team member has already applied to this module: ${question.title}`
            : `Use an email address with an account on this ACM website for: ${question.title}`);
          return false;
        }
      } catch (cause) {
        if (emailCheckVersions.current.get(question.id) !== version) return false;
        const message = cause instanceof Error ? cause.message : 'Could not verify this email address.';
        setEmailChecks(current => ({
          ...current,
          [question.id]: { email: address, status: 'error', message },
        }));
        setError(message);
        return false;
      }
    }
    return true;
  }

  function questionIsAnswered(question: FestFormQuestion, answersToCheck = answers) {
    const answer = answersToCheck[question.id];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer?.trim());
  }

  async function uploadPhoto(questionId: string, file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP photo.');
      return;
    }
    setUploadingQuestion(questionId);
    setError('');
    try {
      const uploaded = await api<{ photoUrl: string }>('/itu-fest/form-photo', {
        method: 'POST',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      setAnswer(questionId, uploaded.photoUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not upload this photo.');
    } finally {
      setUploadingQuestion('');
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moduleId || !period?.isOpen || !currentSection || uploadingQuestion || submitting) return;
    const submissionAnswers = { ...answers };
    if (lockedAccountEmailQuestionId && currentSection.questions.some(question => question.id === lockedAccountEmailQuestionId)) {
      submissionAnswers[lockedAccountEmailQuestionId] = accountEmail;
      setAnswers(current => ({ ...current, [lockedAccountEmailQuestionId]: accountEmail }));
      setEmailChecks(current => ({
        ...current,
        [lockedAccountEmailQuestionId]: {
          email: accountEmail,
          status: 'valid',
          message: 'Using the email for your signed-in ACM account.',
        },
      }));
    }
    const missing = currentSection.questions.find(question => question.required && !questionIsAnswered(question, submissionAnswers));
    if (missing) {
      setError(`Please answer: ${missing.title}`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (!(await verifyCurrentSectionEmails(submissionAnswers))) return;
      const nextSectionId = form ? nextFestSection(form, currentSection, submissionAnswers) : null;
      if (nextSectionId) {
        if (sectionPath.includes(nextSectionId)) {
          setError('This answer creates a section loop. Please contact the ITU Fest team.');
          return;
        }
        setSectionPath(path => [...path, currentSection.id]);
        setCurrentSectionId(nextSectionId);
        window.scrollTo(0, 0);
        return;
      }
      await api('/itu-fest/applications', {
        method: 'POST',
        body: JSON.stringify({ moduleId, answers: submissionAnswers }),
      });
      setHasApplied(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  }

  function goBackSection() {
    if (sectionPath.length === 0) {
      navigate('/itu-fest/apply');
      return;
    }
    const path = [...sectionPath];
    const previousId = path.pop();
    setSectionPath(path);
    if (previousId) {
      setCurrentSectionId(previousId);
      const previousIndex = form?.sections.findIndex(section => section.id === previousId) ?? -1;
      const discardedQuestionIds = new Set(
        form?.sections
          .slice(previousIndex + 1)
          .flatMap(section => section.questions.map(question => question.id)) ?? []
      );
      setAnswers(current => Object.fromEntries(
        Object.entries(current).filter(([questionId]) => !discardedQuestionIds.has(questionId))
      ));
    }
    setError('');
  }

  function renderQuestion(question: FestFormQuestion) {
    const currentAnswer = answers[question.id];
    const answerValues = Array.isArray(currentAnswer) ? currentAnswer : [];
    return (
      <div className="recruitment-form-field fest-student-question" key={question.id}>
        <label htmlFor={`fest-question-${question.id}`}>
          {question.title}{question.required && <span aria-hidden="true"> *</span>}
        </label>
        {question.description && <p>{question.description}</p>}
        {question.type === 'email' && (
          <>
            <input
              id={`fest-question-${question.id}`}
              type="email"
              maxLength={254}
              autoComplete="email"
              value={question.id === lockedAccountEmailQuestionId
                ? accountEmail
                : typeof currentAnswer === 'string' ? currentAnswer : ''}
              onChange={event => setEmailAnswer(question.id, event.target.value)}
              readOnly={question.id === lockedAccountEmailQuestionId}
              required={question.required}
              aria-describedby={`fest-email-help-${question.id} fest-email-status-${question.id}`}
            />
            <p className="fest-email-help" id={`fest-email-help-${question.id}`}>
              {question.id === lockedAccountEmailQuestionId
                ? 'Using the email for your signed-in ACM account.'
                : 'Use an ACM account email. If needed, create an account with this email.'}
            </p>
            <p
              id={`fest-email-status-${question.id}`}
              className={`fest-email-status fest-email-status-${duplicateEmailQuestionIds.has(question.id) ? 'invalid' : emailChecks[question.id]?.status ?? 'idle'}`}
              role={duplicateEmailQuestionIds.has(question.id) || emailChecks[question.id]?.status === 'invalid' || emailChecks[question.id]?.status === 'error' ? 'alert' : 'status'}
            >
              {duplicateEmailQuestionIds.has(question.id)
                ? 'Use a different email for each participant.'
                : emailChecks[question.id]?.status === 'checking'
                  ? 'Checking ACM account…'
                  : emailChecks[question.id]?.message ?? ''}
            </p>
          </>
        )}
        {question.type === 'short_answer' && (
          <input
            id={`fest-question-${question.id}`}
            type="text"
            maxLength={500}
            value={typeof currentAnswer === 'string' ? currentAnswer : ''}
            onChange={event => setAnswer(question.id, event.target.value)}
            required={question.required}
          />
        )}
        {question.type === 'long_answer' && (
          <textarea
            id={`fest-question-${question.id}`}
            rows={5}
            maxLength={10000}
            value={typeof currentAnswer === 'string' ? currentAnswer : ''}
            onChange={event => setAnswer(question.id, event.target.value)}
            required={question.required}
          />
        )}
        {question.type === 'dropdown' && (
          <select
            id={`fest-question-${question.id}`}
            value={typeof currentAnswer === 'string' ? currentAnswer : ''}
            onChange={event => setAnswer(question.id, event.target.value)}
            required={question.required}
          >
            <option value="">Select an option</option>
            {question.options.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}
          </select>
        )}
        {question.type === 'multiple_choice' && (
          <div className="fest-student-choice-list">
            {question.options.map(option => (
              <label key={option.id}>
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={currentAnswer === option.id}
                  onChange={() => setAnswer(question.id, option.id)}
                  required={question.required}
                />
                {option.label}
              </label>
            ))}
          </div>
        )}
        {question.type === 'checkboxes' && (
          <div className="fest-student-choice-list">
            {question.options.map(option => (
              <label key={option.id}>
                <input
                  type="checkbox"
                  checked={answerValues.includes(option.id)}
                  onChange={event => setAnswer(
                    question.id,
                    event.target.checked
                      ? [...answerValues, option.id]
                      : answerValues.filter(value => value !== option.id)
                  )}
                />
                {option.label}
              </label>
            ))}
          </div>
        )}
        {question.type === 'photo' && (
          <div className="fest-student-photo-field">
            <input
              id={`fest-question-${question.id}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={event => {
                void uploadPhoto(question.id, event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            {uploadingQuestion === question.id && <span role="status">Uploading photo…</span>}
            {typeof currentAnswer === 'string' && currentAnswer && (
              <a href={currentAnswer} target="_blank" rel="noreferrer">View uploaded photo</a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      <Navbar showNavigation={false} rightAction={{ label: 'BACK TO HOME', to: '/member' }} />
      <main className="recruitment-application-page">
        <section className="recruitment-application-card">
          <span className="recruitment-eyebrow">ACM ITU · ITU Fest</span>
          {loadingForm ? (
            <p role="status">Loading application form…</p>
          ) : !period?.isOpen ? (
            <>
              <h1>Competition Application</h1>
              <div className="recruitment-success">
                <h2>Applications are closed</h2>
                <p>{getApplicationClosedMessage(period)}</p>
                {!period && error && <p className="recruitment-form-error" role="alert">{error}</p>}
              </div>
            </>
          ) : hasApplied ? (
            <>
              <h1>Competition Application</h1>
              <div className="recruitment-success" role="status">
                <h2>Application submitted</h2>
                <p>Thank you for applying to ITU Fest. We look forward to seeing you compete.</p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setHasApplied(false);
                    setSelectedModuleId('');
                    navigate('/itu-fest/apply');
                  }}
                >
                  Apply to another module
                </button>
                <button type="button" className="btn btn-fill" onClick={() => navigate('/member')}>Back to home</button>
              </div>
            </>
          ) : !moduleId ? (
            <>
              <h1>Competition Application</h1>
              <p>First choose the ITU Fest competition you want to apply for. You’ll then complete its module-specific form.</p>
              {error && <p className="recruitment-form-error" role="alert">{error}</p>}
              <form className="recruitment-form" onSubmit={event => {
                event.preventDefault();
                if (selectedModuleId) navigate(`/itu-fest/apply/${selectedModuleId}`);
              }}>
                {modulesWithImages.length > 0 && (
                  <div className="itu-fest-apply-carousel" aria-label="ITU Fest competition modules">
                    <div
                      className={`itu-fest-apply-carousel-track${carouselSliding ? ' is-sliding' : ''}`}
                      onTransitionEnd={() => {
                        if (!carouselSliding) return;
                        setCarouselIndex(index => (index + 1) % modulesWithImages.length);
                        setCarouselSliding(false);
                      }}
                    >
                      {[0, 1].map(offset => {
                        const item = modulesWithImages[(carouselIndex + offset) % modulesWithImages.length];
                        return <img src={item.image_url} alt={item.name} key={item.id} />;
                      })}
                    </div>
                  </div>
                )}
                <div className="recruitment-form-field">
                  <label htmlFor="itu-fest-module">Which module or competition would you like to apply for?</label>
                  <select
                    id="itu-fest-module"
                    value={selectedModuleId}
                    onChange={event => setSelectedModuleId(event.target.value)}
                    required
                  >
                    <option value="">Select a competition</option>
                    {modules.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-fill" disabled={!selectedModuleId}>Continue to form</button>
              </form>
            </>
          ) : loadingModuleForm ? (
            <p role="status">Loading {selectedModule?.name ?? 'competition'} application form…</p>
          ) : error && !form ? (
            <div className="recruitment-success" role="alert">
              <h1>Competition form unavailable</h1>
              <p>{error}</p>
              <button type="button" className="btn" onClick={goBackSection}>Choose another competition</button>
            </div>
          ) : !form || !currentSection ? (
            <div className="recruitment-success">
              <h1>{selectedModule?.name ?? 'Competition'} application</h1>
              <h2>Form not available yet</h2>
              <p>The ITU Fest team has not prepared this competition’s application form yet.</p>
              <button type="button" className="btn" onClick={goBackSection}>Choose another competition</button>
            </div>
          ) : (
            <>
              <h1>{form.title}</h1>
              {form.description && <p className="fest-form-student-description">{form.description}</p>}
              <form className="recruitment-form" onSubmit={event => { void submitApplication(event); }}>
                <section className="fest-student-section">
                  <span className="recruitment-eyebrow">
                    Section {currentSectionIndex + 1} of {form.sections.length}
                  </span>
                  <h2>{currentSection.title}</h2>
                  {currentSection.description && <p>{currentSection.description}</p>}
                </section>
                {currentSection.questions.map(renderQuestion)}
                {error && <p className="recruitment-form-error" role="alert">{error}</p>}
                <div className="fest-student-form-actions">
                  {sectionPath.length > 0 && (
                    <button type="button" className="btn btn-ghost" onClick={goBackSection} disabled={submitting || Boolean(uploadingQuestion)}>
                      Previous section
                    </button>
                  )}
                  <button type="submit" className="btn btn-fill" disabled={submitting || Boolean(uploadingQuestion)}>
                    {submitting ? 'Submitting…' : nextFestSection(form, currentSection, answers) ? 'Next section' : 'Submit application'}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </main>
    </>
  );
}
