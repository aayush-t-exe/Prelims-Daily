import raw from '../../assets/questions.json';

export const SUBJECTS = [
  'Polity',
  'History',
  'Geography',
  'Economy',
  'Environment & Ecology',
  'Science & Technology',
] as const;

export type Subject = (typeof SUBJECTS)[number];
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  subject: Subject;
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  answerIndex: number;
  explanation: string;
}

/** Short labels for chips and tight UI. */
export const SUBJECT_SHORT: Record<Subject, string> = {
  Polity: 'Polity',
  History: 'History',
  Geography: 'Geography',
  Economy: 'Economy',
  'Environment & Ecology': 'Environment',
  'Science & Technology': 'Sci-Tech',
};

export const QUESTIONS = raw as Question[];

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return byId.get(id);
}
