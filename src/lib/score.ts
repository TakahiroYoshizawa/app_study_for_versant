import type { DiffOp } from '../types';

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bi'm\b/g, 'i am'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bwe'll\b/g, 'we will'],
  [/\bi'll\b/g, 'i will'],
  [/\byou'll\b/g, 'you will'],
  [/\bthey'll\b/g, 'they will'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bthere's\b/g, 'there is'],
  [/\blet's\b/g, 'let us'],
  [/\bwe're\b/g, 'we are'],
  [/\bthey're\b/g, 'they are'],
  [/\byou're\b/g, 'you are'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bwasn't\b/g, 'was not'],
  [/\bweren't\b/g, 'were not'],
  [/\bhaven't\b/g, 'have not'],
  [/\bhasn't\b/g, 'has not'],
  [/\bhadn't\b/g, 'had not'],
  [/\bwouldn't\b/g, 'would not'],
  [/\bcouldn't\b/g, 'could not'],
  [/\bshouldn't\b/g, 'should not'],
  [/\bi've\b/g, 'i have'],
  [/\byou've\b/g, 'you have'],
  [/\bwe've\b/g, 'we have'],
  [/\bthey've\b/g, 'they have'],
];

const NUMBER_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
};

const FILLERS = new Set(['um', 'uh', 'erm', 'hmm', 'mm', 'uhh', 'umm']);

export function normalizeWords(text: string): string[] {
  let value = text.toLowerCase().replace(/[’‘]/g, "'");
  for (const [pattern, replacement] of CONTRACTIONS) {
    value = value.replace(pattern, replacement);
  }
  value = value.replace(/[^a-z0-9\s]/g, ' ');
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => NUMBER_WORDS[token] ?? token)
    .filter((token) => !FILLERS.has(token));
}

export function diffWords(reference: string[], heard: string[]): DiffOp[] {
  const rows = reference.length + 1;
  const cols = heard.length + 1;
  const lcs: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (reference[i - 1] === heard[j - 1]) lcs[i][j] = lcs[i - 1][j - 1] + 1;
      else lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = reference.length;
  let j = heard.length;
  while (i > 0 && j > 0) {
    if (reference[i - 1] === heard[j - 1]) {
      ops.push({ type: 'match', word: reference[i - 1] });
      i -= 1;
      j -= 1;
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      ops.push({ type: 'missing', expected: reference[i - 1] });
      i -= 1;
    } else {
      ops.push({ type: 'extra', actual: heard[j - 1] });
      j -= 1;
    }
  }
  while (i > 0) {
    ops.push({ type: 'missing', expected: reference[i - 1] });
    i -= 1;
  }
  while (j > 0) {
    ops.push({ type: 'extra', actual: heard[j - 1] });
    j -= 1;
  }
  ops.reverse();
  return collapseSubstitutions(ops);
}

function collapseSubstitutions(ops: DiffOp[]): DiffOp[] {
  const collapsed: DiffOp[] = [];
  for (let index = 0; index < ops.length; index += 1) {
    const current = ops[index];
    const next = ops[index + 1];
    if (current?.type === 'missing' && next?.type === 'extra') {
      collapsed.push({ type: 'sub', expected: current.expected, actual: next.actual });
      index += 1;
      continue;
    }
    if (current?.type === 'extra' && next?.type === 'missing') {
      collapsed.push({ type: 'sub', expected: next.expected, actual: current.actual });
      index += 1;
      continue;
    }
    if (current) collapsed.push(current);
  }
  return collapsed;
}

export function latencyFactor(latencyMs: number | null, noResponse: boolean): number {
  if (noResponse || latencyMs == null) return 0;
  if (latencyMs <= 1000) return 1;
  if (latencyMs >= 6000) return 0.6;
  const raw = 1 - ((latencyMs - 1000) / 5000) * 0.4;
  return Math.round(raw * 100) / 100;
}

export type RepeatScore = {
  contentScore: number;
  latencyFactor: number;
  overallScore: number;
  ops: DiffOp[];
  normalizedTarget: string;
  normalizedHeard: string;
  wpm: number | null;
};

export function scoreRepeat(
  target: string,
  transcript: string,
  timing: { noResponse: boolean; latencyMs: number | null; speakingMs: number },
): RepeatScore {
  const reference = normalizeWords(target);
  const heard = timing.noResponse ? [] : normalizeWords(transcript);
  const ops = diffWords(reference, heard);
  let matches = 0;
  let edits = 0;
  for (const op of ops) {
    if (op.type === 'match') matches += 1;
    else edits += 1;
  }
  const total = matches + edits;
  const contentScore = timing.noResponse || total === 0 ? 0 : Math.round((matches / total) * 100);
  const factor = timing.noResponse ? 0 : latencyFactor(timing.latencyMs, false);
  const overallScore = Math.round(contentScore * factor);
  const words = heard.length;
  const wpm =
    words > 0 && timing.speakingMs >= 400
      ? Math.round(words / (timing.speakingMs / 60000))
      : null;

  return {
    contentScore,
    latencyFactor: factor,
    overallScore,
    ops,
    normalizedTarget: reference.join(' '),
    normalizedHeard: heard.join(' '),
    wpm,
  };
}

export function diffCounts(ops: DiffOp[]): {
  match: number;
  sub: number;
  missing: number;
  extra: number;
} {
  return ops.reduce(
    (counts, op) => {
      counts[op.type] += 1;
      return counts;
    },
    { match: 0, sub: 0, missing: 0, extra: 0 },
  );
}
