import { QUESTIONS, type ShortQuestion } from '../data/questions';
import type { Attempt } from '../types';
import { forLevel } from './level';
import { loadPracticeRun } from './practice-run';
import { selectNextSentence } from './progress';
import { cancelSpeech, speakOnce } from './speech';
import { loadAttempts, loadLastQuestionId, saveLastQuestionId } from './storage';

export type QuestionLive = {
  id: number;
  question: ShortQuestion;
  cancelled: boolean;
  cue: Promise<'spoken' | 'failed'>;
};

let sequence = 0;
let active: QuestionLive | null = null;

export function peekQuestion(): QuestionLive | null {
  return active && !active.cancelled ? active : null;
}

export function beginQuestion(questionId?: string): QuestionLive {
  if (active) {
    active.cancelled = true;
    cancelSpeech();
  }
  const question = pickQuestion(questionId);
  saveLastQuestionId(question.id);
  const session: QuestionLive = {
    id: ++sequence,
    question,
    cancelled: false,
    cue: Promise.resolve('failed'),
  };
  session.cue = (async () => {
    if (session.cancelled) return 'failed';
    const result = await speakOnce(question.question, 1);
    if (session.cancelled) return 'failed';
    return result;
  })();
  active = session;
  return session;
}

export function cancelQuestion(): void {
  if (active) active.cancelled = true;
  active = null;
  cancelSpeech();
}

function pickQuestion(questionId?: string): ShortQuestion {
  const requested = questionId ? QUESTIONS.find((question) => question.id === questionId) : undefined;
  if (requested) return requested;
  const attempts = loadAttempts();
  const bank = forLevel(QUESTIONS).map((question) => ({
    id: question.id,
    difficulty: question.difficulty,
    text: question.question,
  }));
  const picked = selectNextSentence(bank, loadLastQuestionId(), attempts, usedQuestionIds(attempts));
  const found = QUESTIONS.find((question) => question.id === picked.id);
  if (found) return found;
  const first = QUESTIONS[0];
  if (!first) throw new Error('Part C has no questions');
  return first;
}

function usedQuestionIds(attempts: Attempt[]): Set<string> {
  const run = loadPracticeRun();
  if (!run || run.closed || run.part !== 'C' || run.attemptIds.length === 0) return new Set();
  const wanted = new Set(run.attemptIds);
  const used = new Set<string>();
  for (const attempt of attempts) {
    if (wanted.has(attempt.id)) used.add(attempt.sentenceId);
  }
  return used;
}
