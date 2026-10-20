import { SENTENCES } from '../data/sentences';
import type { Sentence } from '../types';
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
  const bank = visible ? SENTENCES.map((sentence) => ({ ...sentence, id: `read:${sentence.id}` })) : SENTENCES;
  const requested = sentenceId
    ? bank.find((sentence) => sentence.id === sentenceId || sentence.id === `read:${sentenceId}`)
    : undefined;
  const sentence =
    requested ??
    selectNextSentence(bank, visible ? loadLastReadSentenceId() : loadLastSentenceId(), loadAttempts());
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

export function cancelActive(): void {
  if (active) active.cancelled = true;
  active = null;
  cancelSpeech();
}
