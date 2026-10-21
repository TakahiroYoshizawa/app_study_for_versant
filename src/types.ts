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

export type GeminiStatus = 'not_used' | 'ok' | 'no_key' | 'error' | 'invalid_json';

export type OpenPromptType = 'description' | 'opinion';

export type OpenFeedback = {
  answeredPrompt: boolean;
  reasonPresent: boolean;
  taskCompletion: number;
  vocabulary: number;
  coherence: number;
  practiceNoteJa: string;
};

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
  part?: 'A' | 'B' | 'B-read' | 'C' | 'D' | 'E' | 'F';
  matchedAnswer?: string | null;
  storyPoints?: { id: string; label: string; covered: boolean }[];
  geminiStatus?: GeminiStatus;
  countsForProgress?: boolean;
  promptType?: OpenPromptType;
  requiresReason?: boolean;
  openFeedback?: OpenFeedback;
  readingSetId?: string;
  readingNumber?: number;
  readingAskOrder?: number[];
  continueSet?: boolean;
  readOtherSentence?: boolean;
  ops: DiffOp[];
  audioDataUrl?: string;
  audioSkippedReason?: string;
};
