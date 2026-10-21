import { pollBackgroundReview, startBackgroundReview, type GeminiPoll } from './gemini';
import {
  isLiteralReview,
  loadPracticeRun,
  loadSavedSession,
  savePracticeReviews,
  type LiteralReview,
  type PracticePart,
} from './practice-run';
import { loadAttempt } from './storage';
import type { Attempt } from '../types';

const JOBS_KEY = 'versant.gemini.jobs';
const MAX_JOBS = 12;

export type GeminiJob = {
  interactionId: string;
  runId: string;
  part: PracticePart;
  attemptIds: string[];
  createdAt: string;
  status: 'pending' | 'done' | 'error';
  error?: string;
  reviews?: LiteralReview[];
  seen?: boolean;
};

const inflight = new Map<string, Promise<GeminiJob>>();
const listeners = new Set<() => void>();

export function subscribeGemini(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function uploadingRunIds(): string[] {
  return [...inflight.keys()];
}

export function loadGeminiJobs(): GeminiJob[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isJob);
  } catch {
    return [];
  }
}

export function requestGeminiReview(input: {
  runId: string;
  part: PracticePart;
  attempts: Attempt[];
  apiKey: string;
}): Promise<GeminiJob> {
  const running = inflight.get(input.runId);
  if (running) return running;
  const pending = loadGeminiJobs().find((job) => job.runId === input.runId && job.status === 'pending');
  if (pending) return Promise.resolve(pending);

  const promise = submit(input).finally(() => {
    inflight.delete(input.runId);
    notify();
  });
  inflight.set(input.runId, promise);
  notify();
  return promise;
}

export async function refreshGeminiJob(job: GeminiJob, apiKey: string): Promise<GeminiJob> {
  const attempts = attemptsFor(job);
  let poll: GeminiPoll;
  try {
    poll = await pollBackgroundReview(job.interactionId, attempts, apiKey);
  } catch (caught) {
    throw caught instanceof Error ? caught : new Error('結果を確認できませんでした。');
  }
  if (poll.status === 'pending') return job;
  const next = applyPoll(job, poll);
  persist(next);
  return next;
}

export function markGeminiJobsSeen(ids: string[]): void {
  if (ids.length === 0) return;
  const jobs = loadGeminiJobs();
  let changed = false;
  const next = jobs.map((job) => {
    if (!ids.includes(job.interactionId) || job.seen || job.status !== 'done') return job;
    changed = true;
    return { ...job, seen: true };
  });
  if (!changed || !writeJobs(next)) return;
  notify();
}

async function submit(input: { runId: string; part: PracticePart; attempts: Attempt[]; apiKey: string }): Promise<GeminiJob> {
  const started = await startBackgroundReview(input.attempts, input.apiKey);
  const job: GeminiJob = {
    interactionId: started.id,
    runId: input.runId,
    part: input.part,
    attemptIds: input.attempts.map((attempt) => attempt.id),
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  const next = applyPoll(job, started.poll);
  persist(next);
  return next;
}

function applyPoll(job: GeminiJob, poll: GeminiPoll): GeminiJob {
  if (poll.status === 'pending') return { ...job, status: 'pending', error: undefined };
  if (poll.status === 'failed') return { ...job, status: 'error', error: poll.message, reviews: undefined };
  const current = loadPracticeRun();
  const saved = loadSavedSession(job.runId) ?? (current?.id === job.runId ? current : null);
  if (saved) savePracticeReviews(poll.reviews, saved);
  return { ...job, status: 'done', reviews: poll.reviews, error: undefined, seen: false };
}

function persist(job: GeminiJob): void {
  const jobs = loadGeminiJobs().filter((item) => item.runId !== job.runId && item.interactionId !== job.interactionId);
  if (!writeJobs([job, ...jobs].slice(0, MAX_JOBS))) {
    throw new Error('この端末に結果を保存できませんでした。');
  }
  notify();
}

function attemptsFor(job: GeminiJob): Attempt[] {
  return job.attemptIds.flatMap((id) => {
    const attempt = loadAttempt(id);
    return attempt ? [attempt] : [];
  });
}

function writeJobs(jobs: GeminiJob[]): boolean {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
    return true;
  } catch {
    return false;
  }
}

function notify(): void {
  for (const listener of listeners) listener();
}

function isJob(value: unknown): value is GeminiJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<GeminiJob>;
  if (typeof job.interactionId !== 'string' || typeof job.runId !== 'string' || typeof job.createdAt !== 'string') return false;
  if (job.part !== 'A' && job.part !== 'B' && job.part !== 'B-read') return false;
  if (job.status !== 'pending' && job.status !== 'done' && job.status !== 'error') return false;
  if (!Array.isArray(job.attemptIds) || job.attemptIds.some((id) => typeof id !== 'string')) return false;
  if (job.reviews != null && (!Array.isArray(job.reviews) || job.reviews.some((review) => !isLiteralReview(review)))) return false;
  return true;
}
