import { OPEN_QUESTIONS, type OpenQuestion } from '../data/open-questions';
import type { Attempt } from '../types';
import { forLevel } from './level';
import { loadPracticeRun } from './practice-run';
import { selectNextSentence } from './progress';
import { cancelSpeech, speakOnce } from './speech';
import { loadAttempts, loadLastOpenId, saveLastOpenId } from './storage';

export type OpenLive = {
  id: number;
  question: OpenQuestion;
  cancelled: boolean;
  cue: Promise<'spoken' | 'failed'>;
};

let sequence = 0;
let active: OpenLive | null = null;

export function peekOpenQuestion(): OpenLive | null {
  return active && !active.cancelled ? active : null;
}

export function beginOpenQuestion(questionId?: string): OpenLive {
  if (active) {
    active.cancelled = true;
    cancelSpeech();
  }
  const question = pickOpenQuestion(questionId);
  saveLastOpenId(question.id);
  const session: OpenLive = {
    id: ++sequence,
    question,
    cancelled: false,
    cue: Promise.resolve('failed'),
  };
  session.cue = (async () => {
    if (session.cancelled) return 'failed';
    const result = await speakOnce(question.prompt, 1);
    if (session.cancelled) return 'failed';
    return result;
  })();
  active = session;
  return session;
}

export function cancelOpenQuestion(): void {
  if (active) active.cancelled = true;
  active = null;
  cancelSpeech();
}

function pickOpenQuestion(questionId?: string): OpenQuestion {
  const requested = questionId ? OPEN_QUESTIONS.find((question) => question.id === questionId) : undefined;
  if (requested) return requested;
  const attempts = loadAttempts();
  const bank = forLevel(OPEN_QUESTIONS).map((question) => ({
    id: question.id,
    difficulty: question.difficulty,
    text: question.prompt,
  }));
  const picked = selectNextSentence(bank, loadLastOpenId(), attempts, usedOpenIds(attempts));
  const found = OPEN_QUESTIONS.find((question) => question.id === picked.id);
  if (found) return found;
  const first = OPEN_QUESTIONS[0];
  if (!first) throw new Error('Part F has no questions');
  return first;
}

function usedOpenIds(attempts: Attempt[]): Set<string> {
  const run = loadPracticeRun();
  if (!run || run.closed || run.part !== 'F' || run.attemptIds.length === 0) return new Set();
  const wanted = new Set(run.attemptIds);
  const used = new Set<string>();
  for (const attempt of attempts) {
    if (wanted.has(attempt.id)) used.add(attempt.sentenceId);
  }
  return used;
}
