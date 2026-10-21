import type { DiffOp } from '../types';
import { isRepeatCorrect } from './progress';
import { normalizeWords, scoreRepeat, type RepeatScore } from './score';

const ARTICLES = new Set(['a', 'an', 'the']);

export type SentenceBuildScore = RepeatScore & {
  acceptedIndex: number;
  acceptedSentence: string;
  chunksCovered: boolean[];
  correct: boolean;
};

export function scoreSentenceBuild(
  transcript: string,
  acceptableSentences: readonly string[],
  chunks: readonly string[],
  timing: { noResponse: boolean; latencyMs: number | null; speakingMs: number },
): SentenceBuildScore {
  const sentences = acceptableSentences.length > 0 ? acceptableSentences : [''];
  const ranked = sentences.map((sentence, index) => {
    const scored = scoreRepeat(sentence, transcript, timing);
    return { index, sentence, scored, order: wordOrder(scored) };
  });
  ranked.sort((a, b) => b.scored.contentScore - a.scored.contentScore || b.order - a.order || a.index - b.index);
  const best = ranked[0];
  if (!best) {
    return {
      ...scoreRepeat('', transcript, timing),
      acceptedIndex: 0,
      acceptedSentence: '',
      chunksCovered: chunks.map(() => false),
      correct: false,
    };
  }
  return {
    ...best.scored,
    acceptedIndex: best.index,
    acceptedSentence: best.sentence,
    chunksCovered: coveredChunks(chunks, best.scored.ops),
    correct: isRepeatCorrect(best.scored.ops, timing.noResponse),
  };
}

/** Whether each chunk's content words were among the adopted sentence's matches. */
export function coveredChunks(chunks: readonly string[], ops: readonly DiffOp[]): boolean[] {
  const bag = ops.flatMap((op) => (op.type === 'match' ? [op.word] : []));
  return chunks.map((chunk) => {
    const tokens = contentWords(normalizeWords(chunk));
    if (tokens.length === 0) return false;
    const next = [...bag];
    for (const token of tokens) {
      const index = next.indexOf(token);
      if (index < 0) return false;
      next.splice(index, 1);
    }
    bag.splice(0, bag.length, ...next);
    return true;
  });
}

function wordOrder(scored: RepeatScore): number {
  const total = scored.normalizedTarget.split(' ').filter(Boolean).length;
  if (total === 0) return 0;
  const matches = scored.ops.filter((op) => op.type === 'match').length;
  return matches / total;
}

function contentWords(tokens: string[]): string[] {
  const content = tokens.filter((token) => !ARTICLES.has(token));
  return content.length > 0 ? content : tokens;
}
