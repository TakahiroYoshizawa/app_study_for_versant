import type { StoryPoint } from '../data/stories';
import { normalizeAnswer } from './short-answer';

export const STORY_RESPONSE_MS = 30_000;
export const STORY_START_LIMIT_MS = 8_000;
export const STORY_SILENCE_MS = 4_000;
export const STORY_PASS_RATIO = 0.6;

export type StoryPointHit = {
  id: string;
  label: string;
  covered: boolean;
};

export type StoryScore = {
  correct: boolean;
  score: number;
  normalizedHeard: string;
  points: StoryPointHit[];
};

export function storyCoveragePassed(weight: number, total: number): boolean {
  if (total <= 0 || weight <= 0) return false;
  return weight / total >= STORY_PASS_RATIO;
}

export function scoreStory(transcript: string, points: readonly StoryPoint[], noResponse: boolean): StoryScore {
  const empty = points.map((point) => ({ id: point.id, label: point.label, covered: false }));
  if (noResponse) return { correct: false, score: 0, normalizedHeard: '', points: empty };
  const heard = normalizeStory(transcript);
  if (!heard) return { correct: false, score: 0, normalizedHeard: '', points: empty };
  const hits = points.map((point) => ({
    id: point.id,
    label: point.label,
    covered: point.cues.some((cue) => includesPhrase(heard, cue)),
  }));
  const covered = hits.filter((point) => point.covered).length;
  return {
    correct: storyCoveragePassed(covered, points.length),
    score: points.length === 0 ? 0 : Math.round((100 * covered) / points.length),
    normalizedHeard: heard,
    points: hits,
  };
}

export function normalizeStory(text: string): string {
  let value = text.normalize('NFKC');
  value = value.replace(/\bcouldn't\b/gi, 'could not');
  value = value.replace(/\bwouldn't\b/gi, 'would not');
  value = value.replace(/\bshouldn't\b/gi, 'should not');
  value = value.replace(/\bhadn't\b/gi, 'had not');
  value = value.replace(/\bhaven't\b/gi, 'have not');
  value = value.replace(/\bhasn't\b/gi, 'has not');
  value = value.replace(/\boclock\b/gi, 'o clock');
  return normalizeAnswer(value, true).join(' ');
}

function includesPhrase(heard: string, cue: string): boolean {
  const phrase = normalizeStory(cue);
  if (!phrase) return false;
  return ` ${heard} `.includes(` ${phrase} `);
}
