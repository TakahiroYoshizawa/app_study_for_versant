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
    if (attempt.countsForProgress === false) continue;
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
  usedIds?: ReadonlySet<string>,
): Sentence {
  const progress = progressByItem(attempts);
  const unused = usedIds && usedIds.size > 0 ? sentences.filter((sentence) => !usedIds.has(sentence.id)) : sentences;
  const base = unused.length > 0 ? unused : sentences;
  const pool = base.filter((sentence) => sentence.id !== excludeId);
  const source = pool.length > 0 ? pool : base;
  const checked = source.filter((sentence) => progress.get(sentence.id)?.checked);
  const fresh = source.filter((sentence) => {
    const status = progress.get(sentence.id);
    return !status?.mastered && !status?.checked;
  });
  const stillLearning = source.filter((sentence) => !progress.get(sentence.id)?.mastered);
  const bag = practiceBag(checked, fresh, stillLearning, source);
  const index = Math.floor(Math.random() * bag.length);
  return bag[index] ?? sentences[0];
}

/** Checked items stay more likely, but they do not replace the rest of the bank. */
function practiceBag(
  checked: Sentence[],
  fresh: Sentence[],
  stillLearning: Sentence[],
  source: Sentence[],
): Sentence[] {
  if (checked.length === 0) return stillLearning.length > 0 ? stillLearning : source;
  if (fresh.length === 0) return checked;
  const copies = Math.max(1, Math.round(fresh.length / (checked.length * 2)));
  const reviews: Sentence[] = [];
  for (const sentence of checked) {
    for (let copy = 0; copy < copies; copy += 1) reviews.push(sentence);
  }
  return [...fresh, ...reviews];
}

export function statusLabel(status: ItemStatus | undefined): string {
  if (!status || status.attempts === 0) return 'New';
  if (status.mastered) return 'Done';
  if (status.checked) return `Check · ${status.streak}/${MASTER_STREAK}`;
  return `${status.streak}/${MASTER_STREAK}`;
}
