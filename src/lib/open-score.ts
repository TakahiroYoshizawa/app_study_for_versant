import type { Attempt, GeminiStatus, OpenFeedback } from '../types';
import { normalizeAnswer } from './short-answer';

export const OPEN_PASS = 70;

export type OpenModelItem = {
  id: string;
  answeredPrompt: boolean;
  reasonPresent: boolean;
  taskCompletion: number;
  vocabulary: number;
  coherence: number;
  practiceNoteJa: string;
};

export function isBlankTranscript(transcript: string): boolean {
  return normalizeAnswer(transcript, true).length === 0;
}

export function headlineOpenScore(task: number, vocabulary: number, coherence: number): number {
  return Math.round((100 * (0.5 * task + 0.25 * vocabulary + 0.25 * coherence)) / 4);
}

export function applyOpenScore(item: OpenModelItem, requiresReason: boolean): { feedback: OpenFeedback; score: number } {
  let task = item.taskCompletion;
  if (!item.answeredPrompt) task = 0;
  else if (requiresReason && !item.reasonPresent) task = Math.min(task, 2);
  const feedback: OpenFeedback = {
    answeredPrompt: item.answeredPrompt,
    reasonPresent: item.reasonPresent,
    taskCompletion: task,
    vocabulary: item.vocabulary,
    coherence: item.coherence,
    practiceNoteJa: item.practiceNoteJa,
  };
  return { feedback, score: headlineOpenScore(task, item.vocabulary, item.coherence) };
}

export function parseOpenScores(text: string): { ok: true; byId: Map<string, OpenModelItem | null> } | { ok: false } {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false };
  }
  const items = parsed && typeof parsed === 'object' ? (parsed as { items?: unknown }).items : undefined;
  if (!Array.isArray(items)) return { ok: false };
  const byId = new Map<string, OpenModelItem | null>();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as { id?: unknown }).id;
    if (typeof id !== 'string' || !id.trim() || byId.has(id)) continue;
    byId.set(id, parseOpenItem(item));
  }
  return { ok: true, byId };
}

export function sanitizeOpenFeedback(value: unknown): OpenFeedback | undefined {
  const item = parseOpenItem(value);
  if (!item) return undefined;
  return {
    answeredPrompt: item.answeredPrompt,
    reasonPresent: item.reasonPresent,
    taskCompletion: item.taskCompletion,
    vocabulary: item.vocabulary,
    coherence: item.coherence,
    practiceNoteJa: item.practiceNoteJa,
  };
}

export function isOpenGraded(attempt: Pick<Attempt, 'geminiStatus'>): boolean {
  return attempt.geminiStatus === 'ok' || attempt.geminiStatus === 'not_used';
}

export function openBand(score: number): string {
  if (score >= 90) return 'ほぼ話せている';
  if (score >= 70) return '揃っている';
  if (score >= 40) return '部分的';
  return '不足';
}

export function openStatusLabel(status: GeminiStatus | undefined): string {
  if (status === 'no_key') return 'キーがありません';
  if (status === 'error') return '通信に失敗';
  if (status === 'invalid_json') return '結果を読めません';
  if (status === 'not_used') return '空の回答';
  return '未採点';
}

export function openSummary(attempts: Attempt[]): { mean: number | null; scored: number; unscored: number; passed: number } {
  const scored = attempts.filter((attempt) => isOpenGraded(attempt));
  const passed = scored.filter((attempt) => attempt.overallScore >= OPEN_PASS).length;
  if (scored.length === 0) return { mean: null, scored: 0, unscored: attempts.length, passed: 0 };
  const mean = Math.round(scored.reduce((sum, attempt) => sum + attempt.overallScore, 0) / scored.length);
  return { mean, scored: scored.length, unscored: attempts.length - scored.length, passed };
}

function parseOpenItem(value: unknown): OpenModelItem | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === 'string' && row.id.trim() ? row.id : 'item';
  const answered = row.answered_prompt ?? row.answeredPrompt;
  const reason = row.reason_present ?? row.reasonPresent;
  const task = row.task_completion ?? row.taskCompletion;
  const vocabulary = row.vocabulary;
  const coherence = row.coherence;
  const note = row.practice_note_ja ?? row.practiceNoteJa;
  if (typeof answered !== 'boolean' || typeof reason !== 'boolean') return null;
  const taskScore = asScale(task);
  const vocabularyScore = asScale(vocabulary);
  const coherenceScore = asScale(coherence);
  if (taskScore == null || vocabularyScore == null || coherenceScore == null) return null;
  if (typeof note !== 'string' || !note.trim()) return null;
  return {
    id,
    answeredPrompt: answered,
    reasonPresent: reason,
    taskCompletion: taskScore,
    vocabulary: vocabularyScore,
    coherence: coherenceScore,
    practiceNoteJa: note.trim(),
  };
}

function asScale(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isInteger(number) || number < 0 || number > 4) return null;
  return number;
}
