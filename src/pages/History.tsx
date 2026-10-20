import { useState } from 'react';
import { Link } from 'react-router-dom';
import { difficultyLabel } from '../data/sentences';
import { formatWhen } from '../lib/format';
import { attemptWasCorrect } from '../lib/progress';
import { deleteAttempt, loadAttempts } from '../lib/storage';

export function History() {
  const [attempts, setAttempts] = useState(() => loadAttempts());
  const [pendingId, setPendingId] = useState<string | null>(null);

  function remove(id: string) {
    deleteAttempt(id);
    setAttempts(loadAttempts());
    setPendingId(null);
  }

  return (
    <main className="page">
      <p className="eyebrow">記録</p>
      <h1>これまでの回答</h1>
      {attempts.length === 0 ? (
        <section className="card">
          <p>まだ記録がありません。</p>
          <Link to="/practice" className="btn">
            練習を始める
          </Link>
        </section>
      ) : (
        <ul className="history-list">
          {attempts.map((attempt) => (
            <li key={attempt.id} className="history-row" data-testid="history-item">
              <Link to={`/history/${attempt.id}`}>
                <span className={attemptWasCorrect(attempt) ? 'history-score' : 'history-score bad'}>
                  {attempt.overallScore}
                </span>
                <span>
                  <strong lang="en">{attempt.sentenceText}</strong>
                  <small>
                    {formatWhen(attempt.createdAt)} ·{' '}
                    {attempt.part === 'A'
                      ? `Part A · ${attempt.readingNumber ?? ''}番`
                      : attempt.part === 'B-read'
                        ? `見て読む · ${difficultyLabel(attempt.difficulty)}`
                        : `Part B · ${difficultyLabel(attempt.difficulty)}`}{' '}
                    ·{' '}
                    {attempt.noResponse ? '無回答' : attemptWasCorrect(attempt) ? '正解' : '不正解'}
                  </small>
                </span>
              </Link>
              {pendingId === attempt.id ? (
                <button type="button" className="text-btn danger-text" onClick={() => remove(attempt.id)}>
                  削除する
                </button>
              ) : (
                <button type="button" className="text-btn" onClick={() => setPendingId(attempt.id)}>
                  削除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
