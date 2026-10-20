import { isRepeatCorrect } from './progress';
import type { LiteralReview } from './practice-run';
import { scoreRepeat } from './score';
import type { Attempt } from '../types';

const KEY = 'versant.gemini.apiKey';
const MODEL = 'gemini-3.8-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const TRANSCRIBE_PROMPT = `You transcribe short English speech clips. You do not grade them.

Each clip is introduced by a text line:
ID: <id>

For every clip, write a literal transcript of the words actually spoken.
- Keep mistakes, restarts, repetitions, and extra words.
- Do not replace a word with a more likely or more correct English word.
- Do not fill in words that were not spoken.
- Do not omit words that were spoken.
- Preserve the spoken order.
- If a stretch cannot be identified as a word, write [unclear].
- Ignore silence.
- Do not comment on accent, fluency, pronunciation, or correctness.
- No expected sentence is provided. Do not assume one.
- Return every ID exactly once.
- The transcript is spoken words only. Keep apostrophes inside words such as don't.`;

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
        },
        required: ['id', 'transcript'],
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

export async function transcribeAttempts(attempts: Attempt[], apiKey: string): Promise<LiteralReview[]> {
  const ready = attempts.filter((attempt) => attempt.audioDataUrl);
  const heard = ready.length > 0 ? await requestTranscripts(ready, apiKey) : new Map<string, string>();
  return attempts.map((attempt) => {
    if (!attempt.audioDataUrl) {
      return emptyReview(attempt.id, attempt.audioSkippedReason ?? '録音がないため、聞き直しできません。');
    }
    const transcript = heard.get(attempt.id);
    if (transcript == null) return emptyReview(attempt.id, 'この録音の書き起こしが返りませんでした。');
    return reviewFromTranscript(attempt, transcript);
  });
}

export function reviewFromTranscript(attempt: Attempt, transcript: string): LiteralReview {
  const literal = transcript.replace(/\[unclear\]/gi, ' ').replace(/\s+/g, ' ').trim();
  const scored = scoreRepeat(attempt.sentenceText, literal, {
    noResponse: literal.length === 0,
    latencyMs: attempt.latencyMs,
    speakingMs: attempt.speakingMs,
  });
  return {
    attemptId: attempt.id,
    transcript: transcript.trim(),
    correct: isRepeatCorrect(scored.ops, literal.length === 0),
    normalizedHeard: scored.normalizedHeard,
    ops: scored.ops,
  };
}

function emptyReview(attemptId: string, unavailable: string): LiteralReview {
  return { attemptId, transcript: '', correct: false, normalizedHeard: '', ops: [], unavailable };
}

async function requestTranscripts(attempts: Attempt[], apiKey: string): Promise<Map<string, string>> {
  const parts: Array<Record<string, unknown>> = [{ text: TRANSCRIBE_PROMPT }];
  for (const attempt of attempts) {
    const audio = audioPart(attempt.audioDataUrl ?? '');
    if (!audio) continue;
    parts.push({ text: `ID: ${attempt.id}` });
    parts.push({ inlineData: audio });
  }
  if (parts.length < 3) throw new Error('送れる録音がありません。');

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0,
          responseFormat: {
            text: {
              mimeType: 'APPLICATION_JSON',
              schema: RESPONSE_SCHEMA,
            },
          },
        },
      }),
    });
  } catch {
    throw new Error('Gemini に接続できませんでした。通信を確認してもう一度依頼してください。');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(response.status, payload));
  return transcriptsFrom(payload);
}

function audioPart(dataUrl: string): { mimeType: string; data: string } | null {
  const matched = dataUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/i);
  if (!matched) return null;
  const mimeType = matched[1].toLowerCase();
  const data = matched[2].replace(/\s+/g, '');
  if (!mimeType.startsWith('audio/') || !data) return null;
  return { mimeType, data };
}

function transcriptsFrom(payload: unknown): Map<string, string> {
  const text = responseText(payload);
  if (!text) throw new Error('Gemini から書き起こしが返りませんでした。');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini の応答を読み取れませんでした。');
  }
  const items = (parsed as { items?: unknown }).items;
  if (!Array.isArray(items)) throw new Error('Gemini の応答を読み取れませんでした。');
  const heard = new Map<string, string>();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { id?: unknown; transcript?: unknown };
    if (typeof row.id !== 'string' || typeof row.transcript !== 'string') continue;
    heard.set(row.id, row.transcript);
  }
  return heard;
}

function responseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== 'object') return '';
  const content = (candidates[0] as { content?: { parts?: unknown } }).content;
  if (!content || !Array.isArray(content.parts)) return '';
  return content.parts
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const row = part as { text?: unknown; thought?: unknown };
      if (row.thought || typeof row.text !== 'string') return '';
      return row.text;
    })
    .join('')
    .trim();
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
