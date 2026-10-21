import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { BUILDS } from '../data/builds';
import { forLevel, usePracticeLevel } from '../lib/level';
import { spokenWordCount } from '../data/sentences';
import { beginBuild } from '../lib/build-session';
import { openPracticeRun } from '../lib/practice-run';
import { MASTER_STREAK, progressByItem, statusLabel } from '../lib/progress';
import { getAudioContext } from '../lib/speech';
import { loadAttempts } from '../lib/storage';

export function BuildProgress() {
  const navigate = useNavigate();
  const { level } = usePracticeLevel();
  const builds = forLevel(BUILDS, level);
  const [attempts] = useState(() => loadAttempts());
  const progress = progressByItem(attempts);
  const checkedCount = builds.filter((build) => progress.get(build.id)?.checked).length;
  const masteredCount = builds.filter((build) => progress.get(build.id)?.mastered).length;

  function start(buildId: string) {
    getAudioContext();
    openPracticeRun('D');
    beginBuild(buildId);
    navigate('/d/practice', { state: { autostart: true } });
  }

  return (
    <main className="page">
      <p className="eyebrow">Part D</p>
      <h1>Progress</h1>
      <p className="lede">
        間違えた問題にはチェックが付きます。{MASTER_STREAK}
        回連続で正解すると、その問題は理解できたものとします。チェックが付いている問題を優先しますが、まだ済んでいない問題も出します。
      </p>
      <LevelPicker />
      <p className="muted" data-testid="part-d-counts">
        Check {checkedCount} · Done {masteredCount} · {builds.length}
      </p>
      <ul className="question-list">
        {builds.map((build, index) => {
          const status = progress.get(build.id);
          const showText = Boolean(status && status.attempts > 0);
          const sentence = build.acceptableSentences[0] ?? '';
          return (
            <li key={build.id} className="question-row" data-testid="part-d-row">
              <span className={status?.checked ? 'mark on' : status?.mastered ? 'mark done' : 'mark'}>
                {status?.mastered ? 'OK' : status?.checked ? '✓' : ''}
              </span>
              <span>
                <strong>
                  {index + 1}. {spokenWordCount(sentence)} words · {statusLabel(status)}
                </strong>
                <small lang="en">{showText ? sentence : 'Hidden until this item is used.'}</small>
              </span>
              <button type="button" className="btn secondary" onClick={() => start(build.id)}>
                This one
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
