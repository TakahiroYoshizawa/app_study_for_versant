import type { Attempt, DiffOp } from '../types';
import { deleteAttempt, loadAttempt, loadAttempts } from './storage';

const RUN_KEY = 'versant.practice.run';
const SESSIONS_KEY = 'versant.practice.sessions';
const MAX_SESSIONS = 60;

export type PracticePart = 'A' | 'B' | 'B-read';

export type WordHearing = 'clear' | 'uncertain' | 'missing';

export type ReviewedWord = {
  word: string;
  status: WordHearing;
};

export type PronunciationNote = {
  word: string;
  note: string;
};

export type LiteralReview = {
  attemptId: string;
  transcript: string;
  correct: boolean;
  normalizedHeard: string;
  ops: DiffOp[];
  words: ReviewedWord[];
  extras: string[];
  restart: boolean;
  pronunciation: PronunciationNote[];
  unavailable?: string;
};

export type PracticeRun = {
  id: string;
  part: PracticePart;
  attemptIds: string[];
  closed: boolean;
  reviews?: LiteralReview[];
};

export type SavedSession = PracticeRun & {
  createdAt: string;
};

export function practiceRunSize(part: PracticePart): number {
  return part === 'A' ? 8 : 10;
}

export function practicePartLabel(part: PracticePart): string {
  if (part === 'A') return 'Part A';
  if (part === 'B-read') return 'Read along';
  return 'Part B';
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
      reviews: normalizeReviews(run.reviews),
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

export function savePracticeReviews(reviews: LiteralReview[], run: PracticeRun): void {
  const next = { ...run, reviews };
  if (loadPracticeRun()?.id === run.id) writeRun(next);
  else archiveRun(next);
}

export function loadSavedSession(id: string): SavedSession | null {
  return sessionsForHistory().find((session) => session.id === id) ?? null;
}

export function sessionsForHistory(): SavedSession[] {
  const saved = loadSavedSessions();
  const current = loadPracticeRun();
  const merged = [...saved];
  if (current && current.attemptIds.length > 0 && !merged.some((session) => session.id === current.id)) {
    merged.push(toSaved(current));
  }
  const covered = new Set(merged.flatMap((session) => session.attemptIds));
  const loose = loadAttempts()
    .filter((attempt) => !covered.has(attempt.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return [...merged, ...chunkLoose(loose)].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

export function deleteSavedSession(id: string): void {
  const session = loadSavedSession(id);
  if (!session) return;
  writeSaved(loadSavedSessions().filter((item) => item.id !== id));
  for (const attemptId of session.attemptIds) deleteAttempt(attemptId);
  if (loadPracticeRun()?.id === id) sessionStorage.removeItem(RUN_KEY);
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
  if (run.attemptIds.length > 0) archiveRun(run);
}

function archiveRun(run: PracticeRun): void {
  if (run.attemptIds.length === 0) return;
  const saved = loadSavedSessions();
  const previous = saved.find((session) => session.id === run.id);
  const next: SavedSession = {
    ...run,
    createdAt: previous?.createdAt ?? latestTime(run) ?? new Date().toISOString(),
    reviews: run.reviews ?? previous?.reviews,
  };
  writeSaved([next, ...saved.filter((session) => session.id !== run.id)]);
}

function loadSavedSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!isSavedSession(item)) return [];
      return [
        {
          ...item,
          closed: Boolean(item.closed),
          attemptIds: item.attemptIds.filter((id): id is string => typeof id === 'string'),
          reviews: normalizeReviews(item.reviews),
        },
      ];
    });
  } catch {
    return [];
  }
}

function writeSaved(sessions: SavedSession[]): void {
  const trimmed = [...sessions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .slice(0, MAX_SESSIONS);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
}

function toSaved(run: PracticeRun): SavedSession {
  return { ...run, createdAt: latestTime(run) ?? new Date().toISOString() };
}

function latestTime(run: PracticeRun): string | null {
  const times = run.attemptIds
    .map((id) => loadAttempt(id)?.createdAt)
    .filter((value): value is string => typeof value === 'string');
  times.sort();
  return times.at(-1) ?? null;
}

function chunkLoose(attempts: Attempt[]): SavedSession[] {
  const sessions: SavedSession[] = [];
  let group: Attempt[] = [];
  const flush = () => {
    if (group.length === 0) return;
    const part = group[0]?.part ?? 'B';
    const size = practiceRunSize(part);
    for (let index = 0; index < group.length; index += size) {
      const slice = group.slice(index, index + size);
      const first = slice[0];
      const last = slice[slice.length - 1];
      if (!first || !last) continue;
      sessions.push({
        id: `legacy-${first.id}`,
        part,
        attemptIds: slice.map((attempt) => attempt.id),
        closed: slice.length >= size,
        createdAt: last.createdAt,
      });
    }
    group = [];
  };
  for (const attempt of attempts) {
    const part = attempt.part ?? 'B';
    if (group.length > 0 && (group[0]?.part ?? 'B') !== part) flush();
    group.push(attempt);
  }
  flush();
  return sessions;
}

function isSavedSession(value: unknown): value is SavedSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<SavedSession>;
  if (session.part !== 'A' && session.part !== 'B' && session.part !== 'B-read') return false;
  if (!Array.isArray(session.attemptIds) || typeof session.id !== 'string' || typeof session.createdAt !== 'string') return false;
  return true;
}

function normalizeReviews(value: unknown): LiteralReview[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const reviews = value.filter(isLiteralReview).map((review) => ({
    ...review,
    words: Array.isArray(review.words) ? review.words : [],
    extras: Array.isArray(review.extras) ? review.extras : [],
    restart: review.restart === true,
    pronunciation: Array.isArray(review.pronunciation) ? review.pronunciation : [],
  }));
  return reviews.length > 0 ? reviews : undefined;
}

export function isLiteralReview(value: unknown): value is LiteralReview {
  if (!value || typeof value !== 'object') return false;
  const review = value as Partial<LiteralReview>;
  return (
    typeof review.attemptId === 'string' &&
    typeof review.transcript === 'string' &&
    typeof review.correct === 'boolean' &&
    Array.isArray(review.ops)
  );
}
