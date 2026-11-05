import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api } from '../../lib/api';
import {
  type FestFormQuestion,
  type FestFormSection,
  type FestFormOption,
  type FestModuleForm,
  type FestQuestionType,
} from '../../lib/ituFestForm';

interface ModuleInfo {
  id: string;
  name: string;
}

const QUESTION_TYPES: { value: FestQuestionType; label: string }[] = [
  { value: 'short_answer', label: 'Short answer' },
  { value: 'long_answer', label: 'Long answer' },
  { value: 'email', label: 'Email (registered ACM account)' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'photo', label: 'Photo attachment' },
];

const CHOICE_TYPES = new Set<FestQuestionType>(['multiple_choice', 'checkboxes', 'dropdown']);
const makeId = () => crypto.randomUUID();

function makeSection(index: number): FestFormSection {
  return { id: makeId(), title: `Section ${index + 1}`, description: '', questions: [] };
}

function makeQuestion(type: FestQuestionType = 'short_answer'): FestFormQuestion {
  return {
    id: makeId(),
    title: 'Untitled question',
    description: '',
    type,
    required: false,
    options: CHOICE_TYPES.has(type) ? [makeOption('Option 1'), makeOption('Option 2')] : [],
  };
}

function makeOption(label: string): FestFormOption {
  return { id: makeId(), label, nextSectionId: null };
}

export default function AdminFestModuleFormBuilder() {
  const { moduleId } = useParams();
  const [module, setModule] = useState<ModuleInfo | null>(null);
  const [form, setForm] = useState<FestModuleForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!moduleId) {
      setError('A competition module was not specified.');
      setLoading(false);
      return;
    }
    let active = true;
    api<{ module: ModuleInfo; form: FestModuleForm | null }>(`/itu-fest/modules/${moduleId}/form`)
      .then(result => {
        if (!active) return;
        setModule(result.module);
        setForm(result.form ?? {
          title: `${result.module.name} Application`,
          description: '',
          sections: [makeSection(0)],
        });
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load this module form.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [moduleId]);

  function updateForm(update: (current: FestModuleForm) => FestModuleForm) {
    setForm(current => current ? update(current) : current);
    setSuccess('');
  }

  function updateSection(sectionId: string, update: (section: FestFormSection) => FestFormSection) {
    updateForm(current => ({
      ...current,
      sections: current.sections.map(section => section.id === sectionId ? update(section) : section),
    }));
  }

  function updateQuestion(sectionId: string, questionId: string, update: (question: FestFormQuestion) => FestFormQuestion) {
    updateSection(sectionId, section => ({
      ...section,
      questions: section.questions.map(question => question.id === questionId ? update(question) : question),
    }));
  }

  function addSection() {
    updateForm(current => ({ ...current, sections: [...current.sections, makeSection(current.sections.length)] }));
  }

  function removeSection(sectionId: string) {
    updateForm(current => ({
      ...current,
      sections: current.sections
        .filter(section => section.id !== sectionId)
        .map(section => ({
          ...section,
          questions: section.questions.map(question => ({
            ...question,
            options: question.options.map(option => (
              option.nextSectionId === sectionId ? { ...option, nextSectionId: null } : option
            )),
          })),
        })),
    }));
  }

  function changeQuestionType(sectionId: string, questionId: string, type: FestQuestionType) {
    updateQuestion(sectionId, questionId, question => ({
      ...question,
      type,
      options: CHOICE_TYPES.has(type)
        ? question.options.length >= 2 ? question.options : [makeOption('Option 1'), makeOption('Option 2')]
        : [],
    }));
  }

  async function saveForm() {
    if (!moduleId || !form) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await api<{ form: FestModuleForm }>(`/itu-fest/modules/${moduleId}/form`, {
        method: 'PUT',
        body: JSON.stringify({ form }),
      });
      setForm(saved.form);
      setSuccess('Module application form saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this module form.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="fest-form-builder-page">
      <AdminPageHeader
        title={module ? `${module.name} Form` : 'Module Form'}
        subtitle="Build the separate application form students complete for this competition."
        icon="events"
        leading={(
          <Link
            to={moduleId ? `/admin/events/${moduleId}` : '/admin/events'}
            className="fest-applicants-back"
            aria-label="Back to module applicants"
            title="Back to module applicants"
          >
            <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
              <path d="M669.6 849.6c8.8 8 22.4 7.2 30.4-1.6s7.2-22.4-1.6-30.4l-309.6-280c-8-7.2-8-17.6 0-24.8l309.6-270.4c8.8-8 9.6-21.6 2.4-30.4-8-8.8-21.6-9.6-30.4-2.4L360.8 480.8c-27.2 24-28 64-0.8 88.8l309.6 280z" />
            </svg>
          </Link>
        )}
      >
        <button type="button" className="btn btn-fill" onClick={() => void saveForm()} disabled={loading || saving || !form}>
          {saving ? 'Saving…' : 'Save Form'}
        </button>
      </AdminPageHeader>

      {loading ? (
        <p className="ub-empty" role="status">Loading form builder…</p>
      ) : error && !form ? (
        <div className="empty-state" role="alert"><h3>Could not load form builder</h3><p>{error}</p></div>
      ) : form ? (
        <>
          {error && <p className="fest-form-message is-error" role="alert">{error}</p>}
          {success && <p className="fest-form-message" role="status">{success}</p>}
          <div className="fest-form-builder">
            <section className="fest-form-editor-card fest-form-section-card">
              <label className="fest-form-builder-label">
                Form title
                <input
                  value={form.title}
                  maxLength={160}
                  onChange={event => updateForm(current => ({ ...current, title: event.target.value }))}
                  placeholder="Application form title"
                />
              </label>
              <label className="fest-form-builder-label">
                Form description
                <textarea
                  value={form.description}
                  maxLength={2000}
                  rows={2}
                  onChange={event => updateForm(current => ({ ...current, description: event.target.value }))}
                  placeholder="Instructions or information for applicants"
                />
              </label>
            </section>

            {form.sections.map((section, sectionIndex) => (
              <section className="fest-form-editor-card fest-form-section-card" key={section.id}>
                <div className="fest-form-builder-section-head">
                  <span>SECTION {sectionIndex + 1}</span>
                  {form.sections.length > 1 && (
                    <button type="button" className="fest-form-text-button is-danger" onClick={() => removeSection(section.id)}>
                      Remove section
                    </button>
                  )}
                </div>
                <label className="fest-form-builder-label">
                  Section title
                  <input
                    value={section.title}
                    maxLength={160}
                    onChange={event => updateSection(section.id, current => ({ ...current, title: event.target.value }))}
                    placeholder="Section title"
                  />
                </label>
                <label className="fest-form-builder-label">
                  Section description
                  <textarea
                    value={section.description}
                    maxLength={2000}
                    rows={2}
                    onChange={event => updateSection(section.id, current => ({ ...current, description: event.target.value }))}
                    placeholder="Optional instructions for this section"
                  />
                </label>

                {section.questions.map((question, questionIndex) => (
                  <article className="fest-form-question-editor" key={question.id}>
                    <div className="fest-form-question-topline">
                      <span>QUESTION {questionIndex + 1}</span>
                      <button
                        type="button"
                        className="fest-form-text-button is-danger"
                        onClick={() => updateSection(section.id, current => ({
                          ...current,
                          questions: current.questions.filter(item => item.id !== question.id),
                        }))}
                      >
                        Remove question
                      </button>
                    </div>
                    <label className="fest-form-builder-label">
                      Question title
                      <input
                        value={question.title}
                        maxLength={300}
                        onChange={event => updateQuestion(section.id, question.id, current => ({ ...current, title: event.target.value }))}
                        placeholder="Question"
                      />
                    </label>
                    <label className="fest-form-builder-label">
                      Help text
                      <textarea
                        value={question.description}
                        maxLength={1000}
                        rows={2}
                        onChange={event => updateQuestion(section.id, question.id, current => ({ ...current, description: event.target.value }))}
                        placeholder="Optional description"
                      />
                    </label>
                    <div className="fest-form-question-settings">
                      <label className="fest-form-builder-label">
                        Answer type
                        <select value={question.type} onChange={event => changeQuestionType(section.id, question.id, event.target.value as FestQuestionType)}>
                          {QUESTION_TYPES.map(type => <option value={type.value} key={type.value}>{type.label}</option>)}
                        </select>
                      </label>
                      <label className="fest-form-required">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={event => updateQuestion(section.id, question.id, current => ({ ...current, required: event.target.checked }))}
                        />
                        Required
                      </label>
                    </div>
                    {CHOICE_TYPES.has(question.type) && (
                      <div className="fest-form-options">
                        {question.options.map((option, optionIndex) => (
                          <div className="fest-form-option-row" key={option.id}>
                            <input
                              value={option.label}
                              maxLength={200}
                              aria-label={`Choice ${optionIndex + 1}`}
                              onChange={event => updateQuestion(section.id, question.id, current => ({
                                ...current,
                                options: current.options.map(item => item.id === option.id ? { ...item, label: event.target.value } : item),
                              }))}
                              placeholder={`Choice ${optionIndex + 1}`}
                            />
                            <select
                              value={option.nextSectionId ?? ''}
                              aria-label={`Go to section for choice ${optionIndex + 1}`}
                              onChange={event => updateQuestion(section.id, question.id, current => ({
                                ...current,
                                options: current.options.map(item => (
                                  item.id === option.id ? { ...item, nextSectionId: event.target.value || null } : item
                                )),
                              }))}
                            >
                              <option value="">Continue in order</option>
                              {form.sections.map((target, targetIndex) => (
                                <option key={target.id} value={target.id}>Go to Section {targetIndex + 1}: {target.title}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="fest-form-remove-option"
                              aria-label={`Remove choice ${optionIndex + 1}`}
                              disabled={question.options.length <= 2}
                              onClick={() => updateQuestion(section.id, question.id, current => ({
                                ...current,
                                options: current.options.filter(item => item.id !== option.id),
                              }))}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="fest-form-text-button"
                          disabled={question.options.length >= 30}
                          onClick={() => updateQuestion(section.id, question.id, current => ({
                            ...current,
                            options: [...current.options, makeOption(`Option ${current.options.length + 1}`)],
                          }))}
                        >
                          + Add choice
                        </button>
                        {question.type === 'checkboxes' && (
                          <p className="fest-form-routing-note">For checkbox routing, the first selected choice with a destination is used.</p>
                        )}
                      </div>
                    )}
                  </article>
                ))}

                <button
                  type="button"
                  className="btn btn-ghost fest-form-add-question"
                  onClick={() => updateSection(section.id, current => ({
                    ...current,
                    questions: [...current.questions, makeQuestion()],
                  }))}
                >
                  + Add question
                </button>
              </section>
            ))}

            <div className="fest-form-builder-footer">
              <button type="button" className="btn btn-ghost" onClick={addSection} disabled={form.sections.length >= 30}>
                + Add section
              </button>
              <button type="button" className="btn btn-fill" onClick={() => void saveForm()} disabled={saving}>
                {saving ? 'Saving…' : 'Save Form'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
