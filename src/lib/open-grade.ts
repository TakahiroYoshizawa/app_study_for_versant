import type { Attempt, GeminiStatus } from '../types';
import { requestOpenScoreText } from './gemini';
import { applyOpenScore, isBlankTranscript, OPEN_PASS, parseOpenScores } from './open-score';
import { loadAttempt, saveAttempt } from './storage';

export type OpenGradeMode = 'missing' | 'rescore';

const inflight = new Map<string, Promise<void>>();

export function gradeOpenAttempts(runId: string, attemptIds: string[], apiKey: string, mode: OpenGradeMode): Promise<void> {
  const key = `${runId}:${mode}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const job = grade(attemptIds, apiKey, mode).finally(() => {
    if (inflight.get(key) === job) inflight.delete(key);
  });
  inflight.set(key, job);
  return job;
}

export function openGradeMode(attempts: Attempt[]): OpenGradeMode | null {
  const spoken = attempts.filter((attempt) => attempt.part === 'F' && !isBlankTranscript(attempt.transcript));
  if (spoken.length === 0) return null;
  const missing = spoken.some((attempt) => attempt.geminiStatus == null || attempt.geminiStatus === 'no_key');
  return missing ? 'missing' : 'rescore';
}

export function buildOpenAttempt(input: {
  questionId: string;
  prompt: string;
  promptType: Attempt['promptType'];
  requiresReason: boolean;
  difficulty: Attempt['difficulty'];
  transcript: string;
  noResponse: boolean;
  hadSignal: boolean;
  micAvailable: boolean;
  recognitionAvailable: boolean;
  recognitionBlocked: boolean;
  end: Attempt['end'];
  latencyMs: number | null;
  speakingMs: number;
  elapsedMs: number;
  wpm: number | null;
  audioDataUrl?: string;
  audioSkippedReason?: string;
}): Attempt {
  const blank = input.noResponse || isBlankTranscript(input.transcript);
  const attempt: Attempt = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sentenceId: input.questionId,
    sentenceText: input.prompt,
    difficulty: input.difficulty,
    transcript: blank ? '' : input.transcript,
    normalizedTarget: '',
    normalizedHeard: '',
    noResponse: blank,
    hadSignal: input.hadSignal,
    micAvailable: input.micAvailable,
    recognitionAvailable: input.recognitionAvailable,
    recognitionBlocked: input.recognitionBlocked,
    end: input.end,
    latencyMs: input.latencyMs,
    speakingMs: input.speakingMs,
    elapsedMs: input.elapsedMs,
    wpm: blank ? null : input.wpm,
    contentScore: 0,
    latencyFactor: blank ? 0 : 1,
    overallScore: 0,
    part: 'F',
    promptType: input.promptType,
    requiresReason: input.requiresReason,
    ops: [],
    audioDataUrl: input.audioDataUrl,
    audioSkippedReason: input.audioSkippedReason,
  };
  if (blank) {
    attempt.geminiStatus = 'not_used';
    attempt.countsForProgress = true;
    attempt.correct = false;
  } else {
    attempt.countsForProgress = false;
  }
  return attempt;
}

async function grade(attemptIds: string[], apiKey: string, mode: OpenGradeMode): Promise<void> {
  const attempts = attemptIds.flatMap((id) => {
    const attempt = loadAttempt(id);
    return attempt?.part === 'F' ? [attempt] : [];
  });
  for (const attempt of attempts) {
    if (isBlankTranscript(attempt.transcript) && attempt.geminiStatus !== 'not_used') saveAttempt(markBlank(attempt));
  }
  const targets = attempts.filter((attempt) => !isBlankTranscript(attempt.transcript) && shouldGrade(attempt, mode));
  if (targets.length === 0) return;
  if (!apiKey.trim()) {
    if (mode === 'rescore') throw new Error('APIキーがありません。Key で保存してから再採点してください。');
    for (const attempt of targets) saveAttempt(markStatus(attempt, 'no_key'));
    return;
  }
  let text = '';
  try {
    text = await requestOpenScoreText(
      targets.map((attempt) => ({
        id: attempt.id,
        prompt: attempt.sentenceText,
        promptType: attempt.promptType === 'description' ? 'description' : 'opinion',
        requiresReason: attempt.requiresReason === true,
        transcript: attempt.transcript,
      })),
      apiKey,
    );
  } catch (caught) {
    for (const attempt of targets) saveAttempt(markStatus(attempt, 'error'));
    throw caught;
  }
  const parsed = parseOpenScores(text);
  for (const attempt of targets) {
    const row = parsed.ok ? parsed.byId.get(attempt.id) : undefined;
    if (!parsed.ok || !row) {
      saveAttempt(markStatus(attempt, 'invalid_json'));
      continue;
    }
    const graded = applyOpenScore(row, attempt.requiresReason === true);
    saveAttempt({
      ...attempt,
      geminiStatus: 'ok',
      countsForProgress: true,
      correct: graded.score >= OPEN_PASS,
      overallScore: graded.score,
      contentScore: graded.score,
      openFeedback: graded.feedback,
    });
  }
}

function shouldGrade(attempt: Attempt, mode: OpenGradeMode): boolean {
  if (mode === 'rescore') return true;
  return attempt.geminiStatus == null || attempt.geminiStatus === 'no_key';
}

function markBlank(attempt: Attempt): Attempt {
  const next: Attempt = {
    ...attempt,
    transcript: '',
    noResponse: true,
    geminiStatus: 'not_used',
    countsForProgress: true,
    correct: false,
    overallScore: 0,
    contentScore: 0,
    wpm: null,
  };
  delete next.openFeedback;
  return next;
}

function markStatus(attempt: Attempt, status: GeminiStatus): Attempt {
  const next: Attempt = {
    ...attempt,
    geminiStatus: status,
    countsForProgress: false,
    overallScore: 0,
    contentScore: 0,
  };
  delete next.openFeedback;
  delete next.correct;
  return next;
}
