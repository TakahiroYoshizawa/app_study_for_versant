import type { LiteralReview, PronunciationNote, ReviewedWord, WordHearing } from './practice-run';
import { scoreRepeat } from './score';
import type { Attempt } from '../types';

const KEY = 'versant.gemini.apiKey';
const MODEL = 'gemini-3.8-flash';
const INTERACTIONS = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const API_REVISION = '2026-05-20';

const TRANSCRIBE_PROMPT = `You review short English practice recordings. The exam lowers the sentence score when a word is missing, substituted, added, or when the speaker starts over. It comments on pronunciation when a sound is unclear, even if the word is still recognizable. You are not the official scorer. Do not give a number, a grade, or praise.

Each clip is introduced by:
ID: <id>
Target: <sentence>

The target is what the speaker was asked to say. Do not assume they said it. Do not repair the audio into the target.

For every clip return:
- transcript: only the words you actually hear, in spoken order. Keep mistakes, restarts, repetitions, and extra words. If a stretch is not a word, write [unclear]. Do not insert the, a, to, of, her, or any other word you do not hear.
- words: one entry for each target word, in target order, using the target's own word. status is one of:
  - clear: the word is intelligible as that exact word. A mild accent can still be clear.
  - uncertain: a word was attempted there, but a sound is wrong, mumbled, or it could be a different word.
  - missing: that word was not spoken. A swallowed small word is missing.
- extras: words that were spoken and are not in the target. Do not list a full restart here.
- restart: true only if the speaker began the sentence again.
- pronunciation: only sound problems you can actually hear. Each note is Japanese, names the word, and names the problem, such as 「left の l が r に近い」「語末の t が落ちている」「子音のあいだに母音が入っている」「bag の母音がアに近い」「強勢が別の単語にある」. Skip pitch, voice quality, and fluency. Do not write a note for a missing word. If you are unsure, omit the note.

Return every ID once.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          transcript: { type: 'string' },
          words: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                status: { type: 'string', enum: ['clear', 'uncertain', 'missing'] },
              },
              required: ['word', 'status'],
            },
          },
          extras: { type: 'array', items: { type: 'string' } },
          restart: { type: 'boolean' },
          pronunciation: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                note: { type: 'string' },
              },
              required: ['word', 'note'],
            },
          },
        },
        required: ['id', 'transcript', 'words', 'extras', 'restart', 'pronunciation'],
      },
    },
  },
  required: ['items'],
};

export function loadGeminiKey(): string {
  return localStorage.getItem(KEY)?.trim() ?? '';
}

export function saveGeminiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, trimmed);
}

export type GeminiPoll =
  | { status: 'pending' }
  | { status: 'done'; reviews: LiteralReview[] }
  | { status: 'failed'; message: string };

export async function startBackgroundReview(attempts: Attempt[], apiKey: string): Promise<{ id: string; poll: GeminiPoll }> {
  const ready = attempts.filter((attempt) => attempt.audioDataUrl);
  const input: Array<Record<string, unknown>> = [{ type: 'text', text: TRANSCRIBE_PROMPT }];
  for (const attempt of ready) {
    const audio = audioPart(attempt.audioDataUrl ?? '');
    if (!audio) continue;
    input.push({ type: 'text', text: `ID: ${attempt.id}\nTarget: ${attempt.sentenceText}` });
    input.push({ type: 'audio', mime_type: audio.mimeType, data: audio.data });
  }
  if (input.length < 3) throw new Error('送れる録音がありません。');

  const payload = await geminiFetch(INTERACTIONS, apiKey, {
    method: 'POST',
    body: JSON.stringify({
      model: MODEL,
      background: true,
      store: true,
      input,
      response_format: [
        {
          type: 'text',
          mime_type: 'application/json',
          schema: RESPONSE_SCHEMA,
        },
      ],
    }),
  });
  const id = payload && typeof payload === 'object' ? (payload as { id?: unknown }).id : undefined;
  if (typeof id !== 'string' || !id.trim()) throw new Error('Gemini から受付番号が返りませんでした。');
  return { id, poll: interpretInteraction(payload, attempts) };
}

export async function pollBackgroundReview(id: string, attempts: Attempt[], apiKey: string): Promise<GeminiPoll> {
  let response: Response;
  try {
    response = await fetch(`${INTERACTIONS}/${encodeURIComponent(id)}`, {
      headers: geminiHeaders(apiKey),
    });
  } catch {
    throw new Error('Gemini に接続できませんでした。通信を確認してもう一度確認してください。');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (response.status === 404) {
    return { status: 'failed', message: 'この採点はもう見つかりません。セッションのまとめからもう一度依頼してください。' };
  }
  if (!response.ok) throw new Error(errorMessage(response.status, payload));
  return interpretInteraction(payload, attempts);
}

export function interpretInteraction(payload: unknown, attempts: Attempt[]): GeminiPoll {
  const status = payload && typeof payload === 'object' ? (payload as { status?: unknown }).status : undefined;
  if (status === 'failed' || status === 'cancelled') {
    return { status: 'failed', message: failureMessage(payload, status) };
  }
  if (status !== 'completed' && status !== 'incomplete') return { status: 'pending' };
  const text = outputText(payload);
  if (!text) {
    return {
      status: 'failed',
      message: status === 'incomplete' ? '結果が途中で切れていました。もう一度依頼してください。' : 'Gemini から結果が返りませんでした。',
    };
  }
  try {
    return { status: 'done', reviews: literalReviews(attempts, reviewsFromText(text)) };
  } catch (caught) {
    return { status: 'failed', message: caught instanceof Error ? caught.message : 'Gemini の応答を読み取れませんでした。' };
  }
}

function literalReviews(attempts: Attempt[], heard: Map<string, ModelReview>): LiteralReview[] {
  return attempts.map((attempt) => {
    if (!attempt.audioDataUrl) {
      return emptyReview(attempt.id, attempt.audioSkippedReason ?? '録音がないため、聞き直しできません。');
    }
    const review = heard.get(attempt.id);
    if (!review) return emptyReview(attempt.id, 'この録音の結果が返りませんでした。');
    return reviewFromModel(attempt, review);
  });
}

async function geminiFetch(url: string, apiKey: string, init: { method: string; body: string }): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method,
      headers: geminiHeaders(apiKey, true),
      body: init.body,
    });
  } catch {
    throw new Error('Gemini に接続できませんでした。通信を確認してもう一度依頼してください。');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(response.status, payload));
  return payload;
}

function geminiHeaders(apiKey: string, json = false): HeadersInit {
  const headers: Record<string, string> = {
    'x-goog-api-key': apiKey,
    'Api-Revision': API_REVISION,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

export function reviewFromModel(attempt: Attempt, review: ModelReview): LiteralReview {
  const literal = review.transcript.replace(/\[unclear\]/gi, ' ').replace(/\s+/g, ' ').trim();
  const scored = scoreRepeat(attempt.sentenceText, literal, {
    noResponse: literal.length === 0,
    latencyMs: attempt.latencyMs,
    speakingMs: attempt.speakingMs,
  });
  const words = review.words;
  const sentenceRisk = words.some((word) => word.status !== 'clear') || review.extras.length > 0 || review.restart;
  return {
    attemptId: attempt.id,
    transcript: review.transcript.trim(),
    correct: words.length > 0 && !sentenceRisk,
    normalizedHeard: scored.normalizedHeard,
    ops: scored.ops,
    words,
    extras: review.extras,
    restart: review.restart,
    pronunciation: review.pronunciation,
    unavailable: words.length === 0 ? '単語ごとの結果が返りませんでした。' : undefined,
  };
}

function emptyReview(attemptId: string, unavailable: string): LiteralReview {
  return {
    attemptId,
    transcript: '',
    correct: false,
    normalizedHeard: '',
    ops: [],
    words: [],
    extras: [],
    restart: false,
    pronunciation: [],
    unavailable,
  };
}

type ModelReview = {
  transcript: string;
  words: ReviewedWord[];
  extras: string[];
  restart: boolean;
  pronunciation: PronunciationNote[];
};

function audioPart(dataUrl: string): { mimeType: string; data: string } | null {
  const matched = dataUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/i);
  if (!matched) return null;
  const mimeType = matched[1].toLowerCase();
  const data = matched[2].replace(/\s+/g, '');
  if (!mimeType.startsWith('audio/') || !data) return null;
  return { mimeType, data };
}

function reviewsFromText(text: string): Map<string, ModelReview> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Gemini の応答を読み取れませんでした。');
  }
  const items = (parsed as { items?: unknown }).items;
  if (!Array.isArray(items)) throw new Error('Gemini の応答を読み取れませんでした。');
  const heard = new Map<string, ModelReview>();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as {
      id?: unknown;
      transcript?: unknown;
      words?: unknown;
      extras?: unknown;
      restart?: unknown;
      pronunciation?: unknown;
    };
    if (typeof row.id !== 'string' || typeof row.transcript !== 'string') continue;
    heard.set(row.id, {
      transcript: row.transcript,
      words: wordsFrom(row.words),
      extras: stringList(row.extras),
      restart: row.restart === true,
      pronunciation: notesFrom(row.pronunciation),
    });
  }
  return heard;
}

function wordsFrom(value: unknown): ReviewedWord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { word?: unknown; status?: unknown };
    if (typeof row.word !== 'string' || !isHearing(row.status)) return [];
    const word = row.word.trim();
    return word ? [{ word, status: row.status }] : [];
  });
}

function notesFrom(value: unknown): PronunciationNote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { word?: unknown; note?: unknown };
    if (typeof row.word !== 'string' || typeof row.note !== 'string') return [];
    const word = row.word.trim();
    const note = row.note.trim();
    return word && note ? [{ word, note }] : [];
  });
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => (typeof item === 'string' && item.trim() ? [item.trim()] : []));
}

function isHearing(value: unknown): value is WordHearing {
  return value === 'clear' || value === 'uncertain' || value === 'missing';
}

function outputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const steps = (payload as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return '';
  const chunks: string[] = [];
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    if ((step as { type?: unknown }).type !== 'model_output') continue;
    const content = (step as { content?: unknown }).content;
    if (typeof content === 'string') {
      chunks.push(content);
      continue;
    }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const row = part as { type?: unknown; text?: unknown; thought?: unknown };
      if (row.thought || row.type === 'thought') continue;
      if (row.type != null && row.type !== 'text') continue;
      if (typeof row.text === 'string') chunks.push(row.text);
    }
  }
  return chunks.join('').trim();
}

function failureMessage(payload: unknown, status: 'failed' | 'cancelled'): string {
  if (status === 'cancelled') return 'この採点は取り消されていました。もう一度依頼してください。';
  const errors = payload && typeof payload === 'object' ? (payload as { errors?: unknown }).errors : undefined;
  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (!item || typeof item !== 'object') continue;
      const message = (item as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim() && message.trim().length <= 180) return message.trim();
    }
  }
  return apiDetail(payload) || 'Gemini 側で失敗しました。しばらくしてからもう一度依頼してください。';
}

function errorMessage(status: number, payload: unknown): string {
  const detail = apiDetail(payload);
  if (status === 400) return detail || 'Gemini がこの録音を受け付けませんでした。';
  if (status === 401 || status === 403) return 'APIキーが正しくないか、このモデルを使う権限がありません。';
  if (status === 429) return 'Gemini の利用上限に達しました。しばらくしてからもう一度依頼してください。';
  if (status >= 500) return 'Gemini 側で失敗しました。しばらくしてからもう一度依頼してください。';
  return detail || 'Gemini への依頼に失敗しました。';
}

function apiDetail(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const error = (payload as { error?: { message?: unknown } }).error;
  const message = error && typeof error.message === 'string' ? error.message.trim() : '';
  if (!message || message.length > 180) return '';
  return message;
}
