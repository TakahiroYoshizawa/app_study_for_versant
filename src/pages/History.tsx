import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatWhen } from '../lib/format';
import { OPEN_PASS, openSummary } from '../lib/open-score';
import { attemptWasCorrect } from '../lib/progress';
import { deleteSavedSession, sessionsForHistory, type SavedSession } from '../lib/practice-run';
import { getAudioContext } from '../lib/speech';
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
      <p className="lede">セッションが終わったところで、採点と Gemini の聞き取りを残します。</p>
      {sessions.length === 0 ? (
        <section className="card">
          <p>まだ記録がありません。</p>
          <Link to="/practice" className="btn" onClick={() => getAudioContext()}>
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
                  <span className={(summary.open ? summary.good : summary.correct === summary.total && summary.total > 0) ? 'history-score' : 'history-score bad'}>
                    {summary.badge ?? `${summary.correct}/${summary.total}`}
                  </span>
                  <span>
                    <strong>
                      {partLabel(session.part)} · {session.closed ? 'まとめ' : '途中'}
                    </strong>
                    <small>
                      {formatWhen(session.createdAt)}
                      {summary.open
                        ? ` · ${summary.gemini}`
                        : ` · 端末 ${summary.correct}/${summary.total} 正解${summary.gemini ? ` · Gemini ${summary.gemini}` : ' · Gemini 未依頼'}`}
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

function summarize(session: SavedSession): { correct: number; total: number; gemini: string | null; badge?: string; open?: boolean; good?: boolean } {
  const attempts = session.attemptIds
    .map((id) => loadAttempt(id))
    .filter((attempt) => attempt != null);
  if (session.part === 'F') {
    const stats = openSummary(attempts);
    return {
      correct: stats.passed,
      total: stats.scored,
      gemini: stats.mean == null ? '未採点' : `練習点 ${stats.mean}${stats.unscored > 0 ? ` · 未採点 ${stats.unscored}` : ''}`,
      badge: stats.mean == null ? '—' : String(stats.mean),
      open: true,
      good: stats.mean != null && stats.mean >= OPEN_PASS,
    };
  }
  const correct = attempts.filter((attempt) => attemptWasCorrect(attempt)).length;
  const reviews = session.reviews ?? [];
  if (reviews.length === 0) return { correct, total: attempts.length, gemini: null };
  const story = reviews.filter((review) => !review.unavailable && (review.storyPoints?.length ?? 0) > 0);
  if (story.length > 0) {
    let covered = 0;
    let partial = 0;
    let totalPoints = 0;
    for (const review of story) {
      for (const point of review.storyPoints ?? []) {
        totalPoints += 1;
        if (point.status === 'covered') covered += 1;
        else if (point.status === 'partial') partial += 1;
      }
    }
    return {
      correct,
      total: attempts.length,
      gemini: `要点 ${covered}/${totalPoints}${partial > 0 ? ` · 一部 ${partial}` : ''}`,
    };
  }
  const detailed = reviews.filter((review) => !review.unavailable && review.words.length > 0);
  if (detailed.length === 0) return { correct, total: attempts.length, gemini: '以前の結果あり' };
  const risks = detailed.filter((review) => !review.correct).length;
  const notes = detailed.filter((review) => review.pronunciation.length > 0).length;
  return { correct, total: attempts.length, gemini: `減点候補 ${risks} · 発音 ${notes}` };
}

function partLabel(part: SavedSession['part']): string {
  if (part === 'A') return '音読';
  if (part === 'B-read') return '見て読む';
  if (part === 'C') return '質問';
  if (part === 'D') return '並べ替え';
  if (part === 'E') return '再話';
  if (part === 'F') return '自由回答';
  return 'リピート';
}
