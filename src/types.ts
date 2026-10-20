export type Difficulty = 'easy' | 'medium' | 'hard';

export type Sentence = {
  id: string;
  difficulty: Difficulty;
  text: string;
};

export type DiffOp =
  | { type: 'match'; word: string }
  | { type: 'sub'; expected: string; actual: string }
  | { type: 'missing'; expected: string }
  | { type: 'extra'; actual: string };

export type EndReason = 'silence' | 'timeout' | 'no-response' | 'manual';

export type Attempt = {
  id: string;
  createdAt: string;
  sentenceId: string;
  sentenceText: string;
  difficulty: Difficulty;
  transcript: string;
  normalizedTarget: string;
  normalizedHeard: string;
  noResponse: boolean;
  hadSignal: boolean;
  micAvailable: boolean;
  recognitionAvailable: boolean;
  recognitionBlocked: boolean;
  end: EndReason;
  latencyMs: number | null;
  speakingMs: number;
  elapsedMs: number;
  wpm: number | null;
  contentScore: number;
  latencyFactor: number;
  overallScore: number;
  correct?: boolean;
  part?: 'A' | 'B' | 'B-read';
  readingSetId?: string;
  readingNumber?: number;
  readingAskOrder?: number[];
  continueSet?: boolean;
  readOtherSentence?: boolean;
  ops: DiffOp[];
  audioDataUrl?: string;
  audioSkippedReason?: string;
};
