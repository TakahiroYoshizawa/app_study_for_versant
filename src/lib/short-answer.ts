const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bi'm\b/g, 'i am'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bwasn't\b/g, 'was not'],
  [/\bweren't\b/g, 'were not'],
  [/\bi've\b/g, 'i have'],
  [/\byou've\b/g, 'you have'],
  [/\bwe've\b/g, 'we have'],
  [/\bthey've\b/g, 'they have'],
  [/\bi'll\b/g, 'i will'],
  [/\byou'll\b/g, 'you will'],
  [/\bhe'll\b/g, 'he will'],
  [/\bshe'll\b/g, 'she will'],
  [/\bwe'll\b/g, 'we will'],
  [/\bthey'll\b/g, 'they will'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bwhat's\b/g, 'what is'],
  [/\blet's\b/g, 'let us'],
  [/\bthere's\b/g, 'there is'],
  [/\bhere's\b/g, 'here is'],
  [/\byou're\b/g, 'you are'],
  [/\bwe're\b/g, 'we are'],
  [/\bthey're\b/g, 'they are'],
];

const FILLERS = new Set(['um', 'uh', 'er', 'ah', 'hmm']);
const LIGHT = new Set(['a', 'an', 'the']);

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export type ShortAnswerScore = {
  correct: boolean;
  score: number;
  matchedAnswer: string | null;
  normalizedHeard: string;
  normalizedAnswers: string[];
};

export function normalizeAnswer(text: string, dropFillers: boolean): string[] {
  let value = text.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'");
  value = value.replace(/[\u2010\u2011\u2012\u2013\u2014-]/g, ' ');
  value = expandClockForms(value);
  for (const [pattern, replacement] of CONTRACTIONS) value = value.replace(pattern, replacement);
  value = value.replace(/'s\b/g, 's');
  value = value.replace(/[^a-z0-9\s]/g, ' ');
  const tokens = value.split(/\s+/).filter(Boolean);
  const kept = dropFillers ? tokens.filter((token) => !FILLERS.has(token)) : tokens;
  return dropZeroMinutes(kept).flatMap(expandNumber);
}

/** Speech recognition writes "six" as "6:00" or "6 pm". On-the-hour forms drop the zero minutes. */
function expandClockForms(text: string): string {
  const folded = text.replace(/[：﹕∶꞉]/g, ':');
  const timed = folded.replace(
    /\b(\d{1,2})\s*[:.]\s*(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?\b/g,
    (original, hour: string, minute: string, second?: string) => {
      const h = Number(hour);
      const m = Number(minute);
      const s = second == null ? 0 : Number(second);
      if (h > 24 || m > 59 || s > 59) return original;
      if (m === 0 && s === 0) return String(h);
      if (s === 0) return `${h} ${m}`;
      return `${h} ${m} ${s}`;
    },
  );
  return timed.replace(/\b(\d{1,2})\s*([ap])\.?\s*m\.?\b/g, '$1').replace(/\b(\d{1,2})([ap]m)\b/g, '$1');
}

export function scoreShortAnswer(
  transcript: string,
  acceptableAnswers: readonly string[],
  noResponse: boolean,
): ShortAnswerScore {
  const normalizedAnswers = acceptableAnswers.map((answer) => normalizeAnswer(answer, false).join(' '));
  if (noResponse) {
    return { correct: false, score: 0, matchedAnswer: null, normalizedHeard: '', normalizedAnswers };
  }
  const normalizedHeard = normalizeAnswer(transcript, true).join(' ');
  if (!normalizedHeard) {
    return { correct: false, score: 0, matchedAnswer: null, normalizedHeard: '', normalizedAnswers };
  }
  const index = normalizedAnswers.findIndex((answer) => answer.length > 0 && answer === normalizedHeard);
  if (index < 0) {
    return { correct: false, score: 0, matchedAnswer: null, normalizedHeard, normalizedAnswers };
  }
  return {
    correct: true,
    score: 100,
    matchedAnswer: acceptableAnswers[index] ?? null,
    normalizedHeard,
    normalizedAnswers,
  };
}

export function closestAnswer(normalizedHeard: string, acceptableAnswers: readonly string[]): string | null {
  const heard = contentTokens(normalizedHeard);
  if (heard.length === 0) return null;
  let best: { answer: string; overlap: number } | null = null;
  for (const answer of acceptableAnswers) {
    const tokens = new Set(contentTokens(normalizeAnswer(answer, false).join(' ')));
    const overlap = heard.filter((token) => tokens.has(token)).length;
    if (overlap === 0) continue;
    if (!best || overlap > best.overlap || (overlap === best.overlap && answer.length < best.answer.length)) {
      best = { answer, overlap };
    }
  }
  return best?.answer ?? null;
}

export function startedLate(latencyMs: number | null, noResponse: boolean): boolean {
  return !noResponse && latencyMs != null && latencyMs >= 3000 && latencyMs < 6000;
}

export function answerWordsPerMinute(transcript: string, speakingMs: number, noResponse: boolean): number | null {
  if (noResponse) return null;
  const words = normalizeAnswer(transcript, true).length;
  if (words === 0 || speakingMs < 400) return null;
  return Math.round(words / (speakingMs / 60_000));
}

function contentTokens(text: string): string[] {
  return text.split(/\s+/).filter((token) => token && !LIGHT.has(token));
}

function dropZeroMinutes(tokens: string[]): string[] {
  const out: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? '';
    const next = tokens[index + 1];
    if (next && /^(0|00)$/.test(next) && /^\d{1,2}$/.test(token) && Number(token) <= 24) {
      out.push(token);
      index += 1;
      continue;
    }
    out.push(token);
  }
  return out;
}

function expandNumber(token: string): string[] {
  if (!/^\d{1,3}$/.test(token)) return [token];
  const value = Number(token);
  if (!Number.isInteger(value) || value > 100) return [token];
  return wordsForNumber(value).split(' ');
}

function wordsForNumber(value: number): string {
  if (value < 20) return ONES[value] ?? String(value);
  if (value === 100) return 'one hundred';
  const ten = Math.floor(value / 10);
  const one = value % 10;
  const tens = TENS[ten] ?? String(value);
  if (one === 0) return tens;
  return `${tens} ${ONES[one] ?? ''}`.trim();
}
