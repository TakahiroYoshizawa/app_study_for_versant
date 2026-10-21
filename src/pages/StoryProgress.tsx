import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { STORIES } from '../data/stories';
import { forLevel, usePracticeLevel } from '../lib/level';
import { getAudioContext } from '../lib/speech';
import { MASTER_STREAK, progressByItem, statusLabel } from '../lib/progress';
import { openPracticeRun } from '../lib/practice-run';
import { beginStory } from '../lib/story-session';
import { loadAttempts } from '../lib/storage';

export function StoryProgress() {
  const navigate = useNavigate();
  const { level } = usePracticeLevel();
  const stories = forLevel(STORIES, level);
  const [attempts] = useState(() => loadAttempts());
  const progress = progressByItem(attempts);
  const checkedCount = stories.filter((story) => progress.get(story.id)?.checked).length;
  const masteredCount = stories.filter((story) => progress.get(story.id)?.mastered).length;

  function start(storyId: string) {
    getAudioContext();
    openPracticeRun('E');
    beginStory(storyId);
    navigate('/e/practice', { state: { autostart: true } });
  }

  return (
    <main className="page">
      <p className="eyebrow">Part E</p>
      <h1>Progress</h1>
      <p className="lede">
        要点が足りなかった話にはチェックが付きます。{MASTER_STREAK}
        回連続で正解すると、その話は理解できたものとします。チェックが付いている話を優先しますが、まだ済んでいない話も出します。
      </p>
      <LevelPicker />
      <p className="muted" data-testid="part-e-counts">
        Check {checkedCount} · Done {masteredCount} · {stories.length}
      </p>
      <ul className="question-list">
        {stories.map((story, index) => {
          const status = progress.get(story.id);
          const showText = Boolean(status && status.attempts > 0);
          return (
            <li key={story.id} className="question-row" data-testid="part-e-row">
              <span className={status?.checked ? 'mark on' : status?.mastered ? 'mark done' : 'mark'}>
                {status?.mastered ? 'OK' : status?.checked ? '✓' : ''}
              </span>
              <span>
                <strong>
                  {index + 1}. {showText ? story.title : 'Story'} · {statusLabel(status)}
                </strong>
                <small>{showText ? `${story.points.length} points` : 'Hidden until this story is used.'}</small>
              </span>
              <button type="button" className="btn secondary" onClick={() => start(story.id)}>
                This one
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
