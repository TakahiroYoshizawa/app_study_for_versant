import { scoreRepeat } from './score';

const timing = { noResponse: false, latencyMs: null, speakingMs: 1000 };

export function likelyReadAnother(target: string, transcript: string, others: string[]): boolean {
  if (!transcript.trim()) return false;
  const mine = scoreRepeat(target, transcript, timing).contentScore;
  return others.some((text) => {
    const score = scoreRepeat(text, transcript, timing).contentScore;
    return score >= mine + 30 && score >= 60;
  });
}
