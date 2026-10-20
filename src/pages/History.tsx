import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatWhen } from '../lib/format';
import { attemptWasCorrect } from '../lib/progress';
import { deleteSavedSession, sessionsForHistory, type SavedSession } from '../lib/practice-run';
import { loadAttempt } from '../lib/storage';

export function History() {
  const [sessions, setSessions] = useState(() => sessionsForHistory());
  const [pendingId, setPendingId] = useState<string | null>(null);

  function remove(id: string) {
    deleteSavedSession(id);
    setSessions(sessionsForHistory());
    setPendingId(null);
  }

  return (
    <main className="page">
      <p className="eyebrow">記録</p>
      <h1>まとめ</h1>
      <p className="lede">10問程度のセッションごとに、採点と Gemini の聞き取りを残します。</p>
      {sessions.length === 0 ? (
        <section className="card">
          <p>まだ記録がありません。</p>
          <Link to="/practice" className="btn">
            練習を始める
          </Link>
        </section>
      ) : (
        <ul className="history-list">
          {sessions.map((session) => {
            const summary = summarize(session);
            return (
              <li key={session.id} className="history-row" data-testid="history-item">
                <Link to={`/session/${session.id}`}>
                  <span className={summary.correct === summary.total && summary.total > 0 ? 'history-score' : 'history-score bad'}>
                    {summary.correct}/{summary.total}
                  </span>
                  <span>
                    <strong>
                      {partLabel(session.part)} · {session.closed ? 'まとめ' : '途中'}
                    </strong>
                    <small>
                      {formatWhen(session.createdAt)} · 端末 {summary.correct}/{summary.total} 正解
                      {summary.gemini ? ` · Gemini ${summary.gemini}` : ' · Gemini 未依頼'}
                    </small>
                  </span>
                </Link>
                {pendingId === session.id ? (
                  <button type="button" className="text-btn danger-text" onClick={() => remove(session.id)}>
                    削除する
                  </button>
                ) : (
                  <button type="button" className="text-btn" onClick={() => setPendingId(session.id)}>
                    削除
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function summarize(session: SavedSession): { correct: number; total: number; gemini: string | null } {
  const attempts = session.attemptIds
    .map((id) => loadAttempt(id))
    .filter((attempt) => attempt != null);
  const correct = attempts.filter((attempt) => attemptWasCorrect(attempt)).length;
  const reviews = session.reviews ?? [];
  if (reviews.length === 0) return { correct, total: attempts.length, gemini: null };
  const detailed = reviews.filter((review) => !review.unavailable && review.words.length > 0);
  if (detailed.length === 0) return { correct, total: attempts.length, gemini: '以前の結果あり' };
  const risks = detailed.filter((review) => !review.correct).length;
  const notes = detailed.filter((review) => review.pronunciation.length > 0).length;
  return { correct, total: attempts.length, gemini: `減点候補 ${risks} · 発音 ${notes}` };
}

function partLabel(part: SavedSession['part']): string {
  if (part === 'A') return '音読';
  if (part === 'B-read') return '見て読む';
  return 'リピート';
}
