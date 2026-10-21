import { STORIES, type Story } from '../data/stories';
import type { Attempt } from '../types';
import { forLevel } from './level';
import { loadPracticeRun } from './practice-run';
import { selectNextSentence } from './progress';
import { cancelSpeech, speakOnce, wait } from './speech';
import { loadAttempts, loadLastStoryId, saveLastStoryId } from './storage';

export type StoryLive = {
  id: number;
  story: Story;
  cancelled: boolean;
  cue: Promise<'spoken' | 'failed'>;
};

let sequence = 0;
let active: StoryLive | null = null;

export function peekStory(): StoryLive | null {
  return active && !active.cancelled ? active : null;
}

export function beginStory(storyId?: string): StoryLive {
  if (active) {
    active.cancelled = true;
    cancelSpeech();
  }
  const story = pickStory(storyId);
  saveLastStoryId(story.id);
  const session: StoryLive = {
    id: ++sequence,
    story,
    cancelled: false,
    cue: Promise.resolve('failed'),
  };
  session.cue = (async () => {
    if (session.cancelled) return 'failed';
    const result = await speakStory(story.text, () => session.cancelled);
    if (session.cancelled) return 'failed';
    return result;
  })();
  active = session;
  return session;
}

export function cancelStory(): void {
  if (active) active.cancelled = true;
  active = null;
  cancelSpeech();
}

async function speakStory(text: string, isCancelled: () => boolean): Promise<'spoken' | 'failed'> {
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  const chunks = parts.length > 0 ? parts : [text];
  for (const chunk of chunks) {
    if (isCancelled()) return 'failed';
    const result = await speakOnce(chunk, 1);
    if (result !== 'spoken' || isCancelled()) return 'failed';
    await wait(160);
  }
  return isCancelled() ? 'failed' : 'spoken';
}

function pickStory(storyId?: string): Story {
  const requested = storyId ? STORIES.find((story) => story.id === storyId) : undefined;
  if (requested) return requested;
  const attempts = loadAttempts();
  const bank = forLevel(STORIES).map((story) => ({
    id: story.id,
    difficulty: story.difficulty,
    text: story.text,
  }));
  const picked = selectNextSentence(bank, loadLastStoryId(), attempts, usedStoryIds(attempts));
  const found = STORIES.find((story) => story.id === picked.id);
  if (found) return found;
  const first = STORIES[0];
  if (!first) throw new Error('Part E has no stories');
  return first;
}

function usedStoryIds(attempts: Attempt[]): Set<string> {
  const run = loadPracticeRun();
  if (!run || run.closed || run.part !== 'E' || run.attemptIds.length === 0) return new Set();
  const wanted = new Set(run.attemptIds);
  const used = new Set<string>();
  for (const attempt of attempts) {
    if (wanted.has(attempt.id)) used.add(attempt.sentenceId);
  }
  return used;
}
