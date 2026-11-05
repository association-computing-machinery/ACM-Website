export type FestQuestionType =
  | 'short_answer'
  | 'long_answer'
  | 'email'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'photo';

export interface FestFormOption {
  id: string;
  label: string;
  nextSectionId: string | null;
}

export interface FestFormQuestion {
  id: string;
  title: string;
  description: string;
  type: FestQuestionType;
  required: boolean;
  options: FestFormOption[];
}

export interface FestFormSection {
  id: string;
  title: string;
  description: string;
  questions: FestFormQuestion[];
}

export interface FestModuleForm {
  title: string;
  description: string;
  sections: FestFormSection[];
}

export type FestFormAnswers = Record<string, string | string[]>;

export function nextFestSection(
  form: FestModuleForm,
  section: FestFormSection,
  answers: FestFormAnswers
): string | null {
  for (const question of section.questions) {
    const answer = answers[question.id];
    if (answer === undefined) continue;
    const selected = Array.isArray(answer) ? answer : [answer];
    const routed = question.options.find(option => (
      option.nextSectionId && selected.includes(option.id)
    ));
    if (routed?.nextSectionId) return routed.nextSectionId;
  }
  const index = form.sections.findIndex(item => item.id === section.id);
  return form.sections[index + 1]?.id ?? null;
}
