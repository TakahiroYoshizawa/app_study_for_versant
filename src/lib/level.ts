import { useCallback, useContext, useMemo, useState, createContext, createElement, type ReactNode } from 'react';
import type { Difficulty } from '../types';

export type PracticeLevel = 1 | 2 | 3 | 4 | 5;

const LEVELS: PracticeLevel[] = [1, 2, 3, 4, 5];
const LEVEL_KEY = 'versant.practice.level';
const DIFFICULTY_BUMP: Record<Difficulty, number> = { easy: 0, medium: 30, hard: 60 };

export function isPracticeLevel(value: unknown): value is PracticeLevel {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function loadPracticeLevel(): PracticeLevel {
  try {
    const stored = localStorage.getItem(LEVEL_KEY);
    const parsed = parseStoredLevel(stored);
    if (parsed) return parsed;
  } catch {
    // Private mode can throw. The in-memory default still works for this visit.
  }
  return 3;
}

function parseStoredLevel(value: string | null): PracticeLevel | null {
  if (value === 'easy') return 1;
  if (value === 'standard') return 3;
  if (value === 'hard') return 5;
  const number = Number(value);
  return isPracticeLevel(number) ? number : null;
}

export function savePracticeLevel(level: PracticeLevel): void {
  localStorage.setItem(LEVEL_KEY, String(level));
}

export function levelLabel(level: PracticeLevel): string {
  return String(level);
}

type ScoredItem = {
  difficulty: Difficulty;
  text?: string;
  question?: string;
  prompt?: string;
  acceptableSentences?: readonly string[];
  sentences?: readonly { text: string }[];
};

/** Higher means a later stage. The old three bands stay in order, and length splits each band. */
export function practiceScore(item: ScoredItem): number {
  return DIFFICULTY_BUMP[item.difficulty] + wordCount(practiceText(item));
}

function practiceText(item: ScoredItem): string {
  if (item.sentences && item.sentences.length > 0) return item.sentences.map((sentence) => sentence.text).join(' ');
  return item.question ?? item.prompt ?? item.acceptableSentences?.[0] ?? item.text ?? '';
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function forLevel<T extends ScoredItem>(items: readonly T[], level: PracticeLevel = loadPracticeLevel()): T[] {
  if (items.length === 0) return [];
  const stages = stagesFor(items);
  const picked = stages[level - 1] ?? [];
  return picked.length > 0 ? picked : nearestStage(stages, level - 1);
}

function stagesFor<T extends ScoredItem>(items: readonly T[]): T[][] {
  const stages: T[][] = LEVELS.map(() => []);
  const ranked = items
    .map((item, index) => ({ item, index, score: practiceScore(item) }))
    .sort((a, b) => a.score - b.score || a.index - b.index);
  ranked.forEach((entry, rank) => {
    const stage = Math.min(LEVELS.length - 1, Math.floor((rank * LEVELS.length) / ranked.length));
    stages[stage]?.push(entry.item);
  });
  return stages;
}

function nearestStage<T>(stages: T[][], index: number): T[] {
  for (let distance = 1; distance < stages.length; distance += 1) {
    const lower = stages[index - distance];
    if (lower && lower.length > 0) return lower;
    const upper = stages[index + distance];
    if (upper && upper.length > 0) return upper;
  }
  return stages.flat();
}

type LevelContextValue = {
  level: PracticeLevel;
  setLevel: (level: PracticeLevel) => void;
};

const LevelContext = createContext<LevelContextValue | null>(null);

export function PracticeLevelProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<PracticeLevel>(() => loadPracticeLevel());
  const setLevel = useCallback((next: PracticeLevel) => {
    savePracticeLevel(next);
    setLevelState(next);
  }, []);
  const value = useMemo(() => ({ level, setLevel }), [level, setLevel]);
  return createElement(LevelContext, { value }, children);
}

export function usePracticeLevel(): LevelContextValue {
  const value = useContext(LevelContext);
  if (!value) throw new Error('Practice level is only available inside the app layout');
  return value;
}
