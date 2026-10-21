import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { QUESTIONS, skillLabel } from '../data/questions';
import { forLevel, usePracticeLevel } from '../lib/level';
import { getAudioContext } from '../lib/speech';
import { MASTER_STREAK, progressByItem, statusLabel } from '../lib/progress';
import { openPracticeRun } from '../lib/practice-run';
import { beginQuestion } from '../lib/question-session';
import { loadAttempts } from '../lib/storage';

export function QuestionProgress() {
  const navigate = useNavigate();
  const { level } = usePracticeLevel();
  const questions = forLevel(QUESTIONS, level);
  const [attempts] = useState(() => loadAttempts());
  const progress = progressByItem(attempts);
  const checkedCount = questions.filter((question) => progress.get(question.id)?.checked).length;
  const masteredCount = questions.filter((question) => progress.get(question.id)?.mastered).length;

  function start(questionId: string) {
    getAudioContext();
    openPracticeRun('C');
    beginQuestion(questionId);
    navigate('/c/practice', { state: { autostart: true } });
  }

  return (
    <main className="page">
      <p className="eyebrow">Part C</p>
      <h1>Progress</h1>
      <p className="lede">
        間違えた問題にはチェックが付きます。{MASTER_STREAK}
        回連続で正解すると、その問題は理解できたものとします。チェックが付いている問題を優先しますが、まだ済んでいない問題も出します。
      </p>
      <LevelPicker />
      <p className="muted" data-testid="part-c-counts">
        Check {checkedCount} · Done {masteredCount} · {questions.length}
      </p>
      <ul className="question-list">
        {questions.map((question, index) => {
          const status = progress.get(question.id);
          const showText = Boolean(status && status.attempts > 0);
          return (
            <li key={question.id} className="question-row" data-testid="part-c-row">
              <span className={status?.checked ? 'mark on' : status?.mastered ? 'mark done' : 'mark'}>
                {status?.mastered ? 'OK' : status?.checked ? '✓' : ''}
              </span>
              <span>
                <strong>
                  {index + 1}. {skillLabel(question.skill)} · {statusLabel(status)}
                </strong>
                <small lang="en">{showText ? question.question : 'Hidden until this item is used.'}</small>
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
