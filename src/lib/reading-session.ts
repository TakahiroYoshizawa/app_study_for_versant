import { findReadingSentence, findReadingSet, numberCue, READING_SETS, type ReadingSentence, type ReadingSet } from '../data/readings';
import type { Attempt } from '../types';
import { progressByItem } from './progress';
import { cancelSpeech, speakOnce } from './speech';

export type ReadingLive = {
  id: number;
  item: ReadingSentence;
  set: ReadingSet;
  continueSet: boolean;
  askOrder: number[];
  cancelled: boolean;
  cue: Promise<'spoken' | 'failed'>;
};

export function shuffledAskOrder(): number[] {
  const order = [1, 2, 3, 4, 5, 6, 7, 8];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = order[index];
    order[index] = order[swap];
    order[swap] = current;
  }
  return order;
}

let sequence = 0;
let active: ReadingLive | null = null;

export function peekReading(): ReadingLive | null {
  return active && !active.cancelled ? active : null;
}

export function beginReading(
  setId: string,
  number: number,
  continueSet: boolean,
  askOrder?: number[],
): ReadingLive {
  if (active) {
    active.cancelled = true;
    cancelSpeech();
  }
  const set = findReadingSet(setId) ?? READING_SETS[0];
  const item = findReadingSentence(set.id, number) ?? set.sentences[0];
  const order =
    askOrder && askOrder.length > 0 ? askOrder : continueSet ? [1, 2, 3, 4, 5, 6, 7, 8] : [item.number];
  const live: ReadingLive = {
    id: ++sequence,
    item,
    set,
    continueSet,
    askOrder: order,
    cancelled: false,
    cue: Promise.resolve('failed'),
  };
  live.cue = speakOnce(numberCue(item.number), 0.96);
  active = live;
  return live;
}

export function beginReadingSet(setId: string): ReadingLive {
  const order = shuffledAskOrder();
  return beginReading(setId, order[0] ?? 1, true, order);
}

export function nextAskNumber(order: number[] | undefined, current: number): number | null {
  if (!order || order.length === 0) return current < 8 ? current + 1 : null;
  const index = order.indexOf(current);
  if (index < 0 || index >= order.length - 1) return null;
  return order[index + 1] ?? null;
}

export function cancelReading(): void {
  if (active) active.cancelled = true;
  active = null;
  cancelSpeech();
}

export function selectReadingSet(attempts: Attempt[]): ReadingSet {
  const progress = progressByItem(attempts);
  const ranked = READING_SETS.map((set) => ({
    set,
    checked: set.sentences.filter((sentence) => progress.get(sentence.id)?.checked).length,
    unmastered: set.sentences.filter((sentence) => !progress.get(sentence.id)?.mastered).length,
  }));
  ranked.sort((a, b) => b.checked - a.checked || b.unmastered - a.unmastered);
  const best = ranked[0];
  const pool =
    best && best.checked > 0
      ? ranked.filter((item) => item.checked === best.checked)
      : ranked.filter((item) => item.unmastered > 0);
  const bag = pool.length > 0 ? pool : ranked;
  const index = Math.floor(Math.random() * bag.length);
  return bag[index]?.set ?? READING_SETS[0];
}
