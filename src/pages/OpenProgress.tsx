import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { OPEN_QUESTIONS, openKindLabel } from '../data/open-questions';
import { forLevel, usePracticeLevel } from '../lib/level';
import { beginOpenQuestion } from '../lib/open-session';
import { openPracticeRun } from '../lib/practice-run';
import { MASTER_STREAK, progressByItem, statusLabel } from '../lib/progress';
import { getAudioContext } from '../lib/speech';
import { loadAttempts } from '../lib/storage';

export function OpenProgress() {
  const navigate = useNavigate();
  const { level } = usePracticeLevel();
  const questions = forLevel(OPEN_QUESTIONS, level);
  const [attempts] = useState(() => loadAttempts());
  const progress = progressByItem(attempts);
  const checkedCount = questions.filter((question) => progress.get(question.id)?.checked).length;
  const masteredCount = questions.filter((question) => progress.get(question.id)?.mastered).length;

  function start(questionId: string) {
    getAudioContext();
    openPracticeRun('F');
    beginOpenQuestion(questionId);
    navigate('/f/practice', { state: { autostart: true } });
  }

  return (
    <main className="page">
      <p className="eyebrow">Part F</p>
      <h1>Progress</h1>
      <p className="lede">
        70点未満の設問にはチェックが付きます。{MASTER_STREAK}
        回連続で70点以上になると、その設問は理解できたものとします。チェックが付いている設問を優先しますが、まだ済んでいない設問も出します。
      </p>
      <LevelPicker />
      <p className="muted" data-testid="part-f-counts">
        Check {checkedCount} · Done {masteredCount} · {questions.length}
      </p>
      <ul className="question-list">
        {questions.map((question, index) => {
          const status = progress.get(question.id);
          const showText = Boolean(status && status.attempts > 0);
          return (
            <li key={question.id} className="question-row" data-testid="part-f-row">
              <span className={status?.checked ? 'mark on' : status?.mastered ? 'mark done' : 'mark'}>
                {status?.mastered ? 'OK' : status?.checked ? '✓' : ''}
              </span>
              <span>
                <strong>
                  {index + 1}. {openKindLabel(question.promptType)} · {statusLabel(status)}
                </strong>
                <small lang="en">{showText ? question.prompt : 'Hidden until this item is used.'}</small>
              </span>
              <button type="button" className="btn secondary" onClick={() => start(question.id)}>
                This one
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
