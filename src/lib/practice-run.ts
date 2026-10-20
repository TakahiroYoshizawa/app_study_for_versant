import type { DiffOp } from '../types';

const RUN_KEY = 'versant.practice.run';

export type PracticePart = 'A' | 'B' | 'B-read';

export type LiteralReview = {
  attemptId: string;
  transcript: string;
  correct: boolean;
  normalizedHeard: string;
  ops: DiffOp[];
  unavailable?: string;
};

export type PracticeRun = {
  id: string;
  part: PracticePart;
  attemptIds: string[];
  closed: boolean;
  reviews?: LiteralReview[];
};

export function practiceRunSize(part: PracticePart): number {
  return part === 'A' ? 8 : 10;
}

export function loadPracticeRun(): PracticeRun | null {
  try {
    const raw = sessionStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const run = parsed as Partial<PracticeRun>;
    if (run.part !== 'A' && run.part !== 'B' && run.part !== 'B-read') return null;
    if (!Array.isArray(run.attemptIds) || typeof run.id !== 'string') return null;
    return {
      id: run.id,
      part: run.part,
      attemptIds: run.attemptIds.filter((id): id is string => typeof id === 'string'),
      closed: Boolean(run.closed),
      reviews: Array.isArray(run.reviews) ? run.reviews.filter(isReview) : undefined,
    };
  } catch {
    return null;
  }
}

export function openPracticeRun(part: PracticePart): PracticeRun {
  const run: PracticeRun = {
    id: crypto.randomUUID(),
    part,
    attemptIds: [],
    closed: false,
  };
  writeRun(run);
  return run;
}

export function appendPracticeAttempt(part: PracticePart, attemptId: string, setComplete = false): PracticeRun {
  const existing = loadPracticeRun();
  const run = !existing || existing.closed || existing.part !== part ? openPracticeRun(part) : existing;
  if (!run.attemptIds.includes(attemptId)) run.attemptIds.push(attemptId);
  if (run.attemptIds.length >= practiceRunSize(part) || setComplete) run.closed = true;
  writeRun(run);
  return run;
}

export function savePracticeReviews(reviews: LiteralReview[]): void {
  const run = loadPracticeRun();
  if (!run) return;
  run.reviews = reviews;
  writeRun(run);
}

export function practiceRunProgress(attemptId: string): { index: number; size: number; closing: boolean; finished: boolean } | null {
  const run = loadPracticeRun();
  if (!run) return null;
  const index = run.attemptIds.indexOf(attemptId);
  if (index < 0) return null;
  return {
    index: index + 1,
    size: practiceRunSize(run.part),
    closing: run.closed && index === run.attemptIds.length - 1,
    finished: run.closed,
  };
}

function writeRun(run: PracticeRun): void {
  sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
}

function isReview(value: unknown): value is LiteralReview {
  if (!value || typeof value !== 'object') return false;
  const review = value as Partial<LiteralReview>;
  return (
    typeof review.attemptId === 'string' &&
    typeof review.transcript === 'string' &&
    typeof review.correct === 'boolean' &&
    Array.isArray(review.ops)
  );
}
