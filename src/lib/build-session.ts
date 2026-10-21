import { BUILDS, type SentenceBuild } from '../data/builds';
import type { Attempt } from '../types';
import { forLevel } from './level';
import { loadPracticeRun } from './practice-run';
import { selectNextSentence } from './progress';
import { cancelSpeech, speakChunks } from './speech';
import { loadAttempts, loadLastBuildId, saveLastBuildId } from './storage';

export type BuildLive = {
  id: number;
  build: SentenceBuild;
  cancelled: boolean;
  cue: Promise<'spoken' | 'failed'>;
};

let sequence = 0;
let active: BuildLive | null = null;

export function peekBuild(): BuildLive | null {
  return active && !active.cancelled ? active : null;
}

export function beginBuild(buildId?: string): BuildLive {
  if (active) {
    active.cancelled = true;
    cancelSpeech();
  }
  const build = pickBuild(buildId);
  saveLastBuildId(build.id);
  const session: BuildLive = {
    id: ++sequence,
    build,
    cancelled: false,
    cue: Promise.resolve('failed'),
  };
  session.cue = (async () => {
    if (session.cancelled) return 'failed';
    const result = await speakChunks(build.chunks, 400, () => session.cancelled);
    if (session.cancelled) return 'failed';
    return result;
  })();
  active = session;
  return session;
}

export function cancelBuild(): void {
  if (active) active.cancelled = true;
  active = null;
  cancelSpeech();
}

function pickBuild(buildId?: string): SentenceBuild {
  const requested = buildId ? BUILDS.find((build) => build.id === buildId) : undefined;
  if (requested) return requested;
  const attempts = loadAttempts();
  const bank = forLevel(BUILDS).map((build) => ({
    id: build.id,
    difficulty: build.difficulty,
    text: build.acceptableSentences[0] ?? '',
  }));
  const picked = selectNextSentence(bank, loadLastBuildId(), attempts, usedBuildIds(attempts));
  const found = BUILDS.find((build) => build.id === picked.id);
  if (found) return found;
  const first = BUILDS[0];
  if (!first) throw new Error('Part D has no sentence builds');
  return first;
}

function usedBuildIds(attempts: Attempt[]): Set<string> {
  const run = loadPracticeRun();
  if (!run || run.closed || run.part !== 'D' || run.attemptIds.length === 0) return new Set();
  const wanted = new Set(run.attemptIds);
  const used = new Set<string>();
  for (const attempt of attempts) {
    if (wanted.has(attempt.id)) used.add(attempt.sentenceId);
  }
  return used;
}
