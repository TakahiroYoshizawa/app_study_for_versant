import type { Attempt } from '../types';

const ATTEMPTS_KEY = 'versant.partb.attempts';
const LAST_SENTENCE_KEY = 'versant.partb.lastSentence';
const LAST_READ_KEY = 'versant.partb.lastReadSentence';
const MAX_ATTEMPTS = 2000;
const AUDIO_KEEP = 30;
const MAX_AUDIO_CHARS = 280_000;

function isDifficulty(value: unknown): value is Attempt['difficulty'] {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

function isEnd(value: unknown): value is Attempt['end'] {
  return value === 'silence' || value === 'timeout' || value === 'no-response' || value === 'manual';
}

function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== 'object') return false;
  const attempt = value as Partial<Attempt>;
  return (
    typeof attempt.id === 'string' &&
    typeof attempt.createdAt === 'string' &&
    typeof attempt.sentenceId === 'string' &&
    typeof attempt.sentenceText === 'string' &&
    isDifficulty(attempt.difficulty) &&
    typeof attempt.transcript === 'string' &&
    typeof attempt.noResponse === 'boolean' &&
    typeof attempt.contentScore === 'number' &&
    typeof attempt.overallScore === 'number' &&
    isEnd(attempt.end) &&
    Array.isArray(attempt.ops)
  );
}

function hydrate(attempt: Attempt): Attempt {
  return {
    ...attempt,
    normalizedTarget: attempt.normalizedTarget ?? '',
    normalizedHeard: attempt.normalizedHeard ?? '',
    hadSignal: attempt.hadSignal ?? !attempt.noResponse,
    micAvailable: attempt.micAvailable ?? true,
    recognitionAvailable: attempt.recognitionAvailable ?? true,
    recognitionBlocked: attempt.recognitionBlocked ?? false,
    latencyMs: attempt.latencyMs ?? null,
    speakingMs: attempt.speakingMs ?? 0,
    elapsedMs: attempt.elapsedMs ?? 0,
    wpm: attempt.wpm ?? null,
    latencyFactor: attempt.latencyFactor ?? (attempt.noResponse ? 0 : 1),
  };
}

export function loadAttempts(): Attempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAttempt).map(hydrate);
  } catch {
    return [];
  }
}

export function loadAttempt(id: string): Attempt | null {
  return loadAttempts().find((attempt) => attempt.id === id) ?? null;
}

function withoutAudio(attempt: Attempt, reason: string): Attempt {
  if (!attempt.audioDataUrl) return attempt;
  const rest = { ...attempt };
  delete rest.audioDataUrl;
  return { ...rest, audioSkippedReason: reason };
}

function writeAttempts(attempts: Attempt[]): Attempt[] {
  const trimmed = attempts.slice(0, MAX_ATTEMPTS).map((attempt, index) =>
    index < AUDIO_KEEP ? attempt : withoutAudio(attempt, '古い録音は残していません。正否は残しています。'),
  );
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    const compact = trimmed.map((attempt) => withoutAudio(attempt, '容量の都合で音声は保存していません。正否は残しています。'));
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(compact));
    return compact;
  }
}

export function saveAttempt(attempt: Attempt): Attempt {
  const prepared =
    attempt.audioDataUrl && attempt.audioDataUrl.length > MAX_AUDIO_CHARS
      ? {
          ...attempt,
          audioDataUrl: undefined,
          audioSkippedReason: '録音データが大きいため、音声は保存していません。',
        }
      : attempt;
  const next = [prepared, ...loadAttempts().filter((item) => item.id !== prepared.id)];
  const saved = writeAttempts(next);
  return saved.find((item) => item.id === prepared.id) ?? prepared;
}

export function deleteAttempt(id: string): void {
  writeAttempts(loadAttempts().filter((attempt) => attempt.id !== id));
}

export function loadLastSentenceId(): string | null {
  return localStorage.getItem(LAST_SENTENCE_KEY);
}

export function saveLastSentenceId(id: string): void {
  localStorage.setItem(LAST_SENTENCE_KEY, id);
}

export function loadLastReadSentenceId(): string | null {
  return localStorage.getItem(LAST_READ_KEY);
}

export function saveLastReadSentenceId(id: string): void {
  localStorage.setItem(LAST_READ_KEY, id);
}
