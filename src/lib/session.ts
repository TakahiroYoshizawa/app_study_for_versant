import { SENTENCES } from '../data/sentences';
import type { Attempt, Sentence } from '../types';
import { forLevel } from './level';
import { loadPracticeRun } from './practice-run';
import { selectNextSentence } from './progress';
import { cancelSpeech, speakPassage } from './speech';
import { loadAttempts, loadLastReadSentenceId, loadLastSentenceId, saveLastReadSentenceId, saveLastSentenceId } from './storage';

export const INSTRUCTION = 'Please repeat the sentence that you will hear.';

export type PromptPhase = 'instruction' | 'listen';

export type LiveSession = {
  id: number;
  sentence: Sentence;
  visible: boolean;
  cancelled: boolean;
  intro: Promise<void>;
  onPhase: (phase: PromptPhase) => void;
};

let sequence = 0;
let active: LiveSession | null = null;

export function peekActive(): LiveSession | null {
  return active && !active.cancelled ? active : null;
}

export function beginItem(sentenceId?: string, visible = false): LiveSession {
  if (active) {
    active.cancelled = true;
    cancelSpeech();
  }
  const attempts = loadAttempts();
  const source = forLevel(SENTENCES);
  const bank = visible ? source.map((sentence) => ({ ...sentence, id: `read:${sentence.id}` })) : source;
  const requested = sentenceId
    ? bank.find((sentence) => sentence.id === sentenceId || sentence.id === `read:${sentenceId}`)
    : undefined;
  const sentence =
    requested ??
    selectNextSentence(
      bank,
      visible ? loadLastReadSentenceId() : loadLastSentenceId(),
      attempts,
      visible ? readAlongUsedIds(attempts) : undefined,
    );
  if (visible) saveLastReadSentenceId(sentence.id);
  else saveLastSentenceId(sentence.id);
  const session: LiveSession = {
    id: ++sequence,
    sentence,
    visible,
    cancelled: false,
    intro: Promise.resolve(),
    onPhase: () => {},
  };
  session.intro = (async () => {
    if (visible) {
      await speakPassage(sentence.text, 0.98, () => session.cancelled, 'male');
      return;
    }
    await speakPassage(INSTRUCTION, 0.96, () => session.cancelled);
    if (session.cancelled) return;
    session.onPhase('listen');
    await speakPassage(sentence.text, 0.98, () => session.cancelled);
  })();
  active = session;
  return session;
}

function readAlongUsedIds(attempts: Attempt[]): Set<string> {
  const run = loadPracticeRun();
  if (!run || run.closed || run.part !== 'B-read' || run.attemptIds.length === 0) return new Set();
  const wanted = new Set(run.attemptIds);
  const used = new Set<string>();
  for (const attempt of attempts) {
    if (wanted.has(attempt.id)) used.add(attempt.sentenceId);
  }
  return used;
}

export function cancelActive(): void {
  if (active) active.cancelled = true;
  active = null;
  cancelSpeech();
}
