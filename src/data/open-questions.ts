import type { Difficulty, OpenPromptType } from '../types';

export const OPEN_SESSION_SIZE = 2;
export const OPEN_RESPONSE_MS = 40_000;

export type OpenQuestion = {
  id: string;
  prompt: string;
  promptType: OpenPromptType;
  requiresReason: boolean;
  difficulty: Difficulty;
};

/** Original prompts. Each one can be answered from everyday experience in about 40 seconds. */
export const OPEN_QUESTIONS: OpenQuestion[] = [
  {
    id: 'f01',
    difficulty: 'easy',
    promptType: 'description',
    requiresReason: false,
    prompt: 'Describe the place where you usually eat dinner.',
  },
  {
    id: 'f02',
    difficulty: 'easy',
    promptType: 'description',
    requiresReason: false,
    prompt: 'Describe what you can see from a window you look through every day.',
  },
  {
    id: 'f03',
    difficulty: 'easy',
    promptType: 'description',
    requiresReason: false,
    prompt: 'Describe the bag or backpack you carry most often.',
  },
  {
    id: 'f04',
    difficulty: 'medium',
    promptType: 'description',
    requiresReason: false,
    prompt: 'Describe a short walk you know well, from the start to the end.',
  },
  {
    id: 'f05',
    difficulty: 'medium',
    promptType: 'description',
    requiresReason: false,
    prompt: 'Describe what your mornings look like before you leave home.',
  },
  {
    id: 'f06',
    difficulty: 'medium',
    promptType: 'description',
    requiresReason: false,
    prompt: 'Describe a shop you visit often, and what you do there.',
  },
  {
    id: 'f07',
    difficulty: 'medium',
    promptType: 'opinion',
    requiresReason: true,
    prompt: 'Do you prefer to exercise in the morning or in the evening? Explain why.',
  },
  {
    id: 'f08',
    difficulty: 'hard',
    promptType: 'opinion',
    requiresReason: true,
    prompt: 'Is it better to read the news in the morning or later in the day? Explain why.',
  },
  {
    id: 'f09',
    difficulty: 'hard',
    promptType: 'opinion',
    requiresReason: true,
    prompt: 'Do you think people should take a short break after every hour of work? Explain why.',
  },
  {
    id: 'f10',
    difficulty: 'hard',
    promptType: 'opinion',
    requiresReason: true,
    prompt: 'Is cooking at home better than eating out on a normal weekday? Explain why.',
  },
  {
    id: 'f11',
    difficulty: 'hard',
    promptType: 'opinion',
    requiresReason: true,
    prompt: 'Do you prefer to plan a weekend ahead of time, or decide on the day? Explain why.',
  },
  {
    id: 'f12',
    difficulty: 'hard',
    promptType: 'opinion',
    requiresReason: true,
    prompt: 'Is a phone call better than a text when you thank someone? Explain why.',
  },
];

export function findOpenQuestion(id: string): OpenQuestion | undefined {
  return OPEN_QUESTIONS.find((question) => question.id === id);
}

export function openKindLabel(type: OpenPromptType): string {
  return type === 'description' ? '描写' : '意見';
}
