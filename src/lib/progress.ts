import type { Attempt, DiffOp, Sentence } from '../types';

export const MASTER_STREAK = 3;

export type ItemStatus = {
  itemId: string;
  streak: number;
  mastered: boolean;
  checked: boolean;
  attempts: number;
};

export function isRepeatCorrect(ops: DiffOp[], noResponse: boolean): boolean {
  if (noResponse || ops.length === 0) return false;
  return ops.every((op) => op.type === 'match' || op.type === 'extra');
}

export function attemptWasCorrect(attempt: Pick<Attempt, 'correct' | 'ops' | 'noResponse'>): boolean {
  if (typeof attempt.correct === 'boolean') return attempt.correct;
  return isRepeatCorrect(attempt.ops, attempt.noResponse);
}

export function progressByItem(attempts: Attempt[]): Map<string, ItemStatus> {
  const ordered = [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const map = new Map<string, ItemStatus>();
  for (const attempt of ordered) {
    const correct = attemptWasCorrect(attempt);
    const prev = map.get(attempt.sentenceId);
    const streak = correct ? Math.min(MASTER_STREAK, (prev?.streak ?? 0) + 1) : 0;
    const mastered = streak >= MASTER_STREAK;
    map.set(attempt.sentenceId, {
      itemId: attempt.sentenceId,
      streak,
      mastered,
      checked: mastered ? false : correct ? Boolean(prev?.checked) : true,
      attempts: (prev?.attempts ?? 0) + 1,
    });
  }
  return map;
}

export function selectNextSentence(
  sentences: Sentence[],
  excludeId: string | null,
  attempts: Attempt[],
): Sentence {
  const progress = progressByItem(attempts);
  const pool = sentences.filter((sentence) => sentence.id !== excludeId);
  const source = pool.length > 0 ? pool : sentences;
  const checked = source.filter((sentence) => progress.get(sentence.id)?.checked);
  const stillLearning = source.filter((sentence) => !progress.get(sentence.id)?.mastered);
  const bag = checked.length > 0 ? checked : stillLearning.length > 0 ? stillLearning : source;
  const index = Math.floor(Math.random() * bag.length);
  return bag[index] ?? sentences[0];
}

export function statusLabel(status: ItemStatus | undefined): string {
  if (!status || status.attempts === 0) return '未着手';
  if (status.mastered) return '理解できた';
  if (status.checked) return `チェック · 連続 ${status.streak}/${MASTER_STREAK}`;
  return `連続 ${status.streak}/${MASTER_STREAK}`;
}
