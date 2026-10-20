import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WordDiff } from '../components/WordDiff';
import { loadGeminiKey, saveGeminiKey, transcribeAttempts } from '../lib/gemini';
import { loadPracticeRun, practiceRunSize, savePracticeReviews, type PracticePart } from '../lib/practice-run';
import { attemptWasCorrect } from '../lib/progress';
import { loadAttempt } from '../lib/storage';
import type { Attempt } from '../types';

export function SessionReview() {
  const [run, setRun] = useState(() => loadPracticeRun());
  const [apiKey, setApiKey] = useState(() => loadGeminiKey());
  const [phase, setPhase] = useState<'ask' | 'sending' | 'done' | 'declined'>(() =>
    loadPracticeRun()?.reviews?.length ? 'done' : 'ask',
  );
  const [error, setError] = useState('');

  if (!run || run.attemptIds.length === 0) {
    return (
      <main className="page">
        <h1>セッションがありません</h1>
        <p className="lede">練習を始めると、10問程度が終わったところでまとめが出ます。</p>
        <Link to="/" className="btn secondary">
          ホームへ
        </Link>
      </main>
    );
  }

  const attempts = run.attemptIds
    .map((id) => loadAttempt(id))
    .filter((attempt): attempt is Attempt => attempt != null);
  const correctCount = attempts.filter((attempt) => attemptWasCorrect(attempt)).length;
  const average =
    attempts.length === 0
      ? 0
      : Math.round(attempts.reduce((sum, attempt) => sum + attempt.overallScore, 0) / attempts.length);
  const reviews = new Map((run.reviews ?? []).map((review) => [review.attemptId, review]));
  const changed = attempts.filter((attempt) => {
    const review = reviews.get(attempt.id);
    return review && !review.unavailable && review.correct !== attemptWasCorrect(attempt);
  }).length;

  async function onRequest() {
    const key = apiKey.trim();
    if (!key) {
      setError('Gemini の APIキーを入れてください。');
      return;
    }
    setError('');
    saveGeminiKey(key);
    setPhase('sending');
    try {
      const next = await transcribeAttempts(attempts, key);
      savePracticeReviews(next);
      setRun(loadPracticeRun());
      setPhase('done');
    } catch (caught) {
      setPhase('ask');
      setError(caught instanceof Error ? caught.message : 'Gemini への依頼に失敗しました。');
    }
  }

  return (
    <main className="page">
      <p className="eyebrow">{partLabel(run.part)} · セッション</p>
      <h1>まとめの採点</h1>
      <p className="lede">
        {run.part === 'A' ? '1セットが終わったので、ここまでの結果をまとめています。' : `${practiceRunSize(run.part)}問が終わったので、ここまでの結果をまとめています。`}
      </p>
      <p className="score-kicker">端末の音声認識</p>
      <p className="score" data-testid="session-correct">
        {correctCount}/{attempts.length}
      </p>
      <p className="muted">正解した問の数です。練習点の平均は {average} です。本番の Versant スコアではありません。</p>
      <p className="disclaimer">各問の合格、チェック、3回連続は、このまとめでは変えません。</p>

      <section className="card">
        <h2>各問</h2>
        <ul className="session-list">
          {attempts.map((attempt, index) => {
            const correct = attemptWasCorrect(attempt);
            const review = reviews.get(attempt.id);
            return (
              <li key={attempt.id}>
                <Link to={`/history/${attempt.id}`}>
                  <span>{index + 1}</span>
                  <strong lang="en">{attempt.sentenceText}</strong>
                  <small className={correct ? 'good' : 'bad'}>{correct ? '正解' : '不正解'} · {attempt.overallScore}</small>
                </Link>
                {review?.unavailable ? <p className="muted">{review.unavailable}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" data-testid="gemini-ask">
        <h2>Gemini に聞き直してもらいますか？</h2>
        <p>
          このセッションの録音だけをまとめて送ります。正解文は送りません。Gemini には、聞こえた単語をそのまま書き起こすよう頼み、返ってきた文字を今と同じ方法で正解文と比べます。
        </p>
        <p className="muted">発音点は出しません。各問の合格とチェックも書き換えません。アプリに共通のキーはありません。使う人が自分の Gemini APIキーを貼ります。利用料はそのキーのアカウントにかかり、キーはこの端末にだけ残します。</p>
        {phase === 'declined' ? (
          <p className="note">依頼しませんでした。端末の判定のままです。</p>
        ) : null}
        {phase === 'sending' ? <p className="note">録音を送っています。10問分なので、少し待ちます。</p> : null}
        {error ? <p className="note">{error}</p> : null}
        {phase !== 'sending' ? (
          <>
            <label className="field">
              <span>Gemini APIキー</span>
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                data-testid="gemini-key"
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>
            <div className="actions">
              <button type="button" className="btn" data-testid="request-gemini" onClick={() => void onRequest()}>
                Geminiに採点を依頼する
              </button>
              {phase === 'ask' ? (
                <button
                  type="button"
                  className="btn secondary"
                  data-testid="skip-gemini"
                  onClick={() => {
                    setError('');
                    setPhase('declined');
                  }}
                >
                  依頼しない
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      {phase === 'done' && run.reviews ? (
        <section className="card" data-testid="gemini-result">
          <h2>聞き直しの結果</h2>
          <p>
            端末の判定と食い違った問は {changed} 問です。食い違いがある問は、録音ではその単語が聞こえていない可能性があります。
          </p>
          {attempts.map((attempt, index) => {
            const review = reviews.get(attempt.id);
            if (!review || review.unavailable) return null;
            const localCorrect = attemptWasCorrect(attempt);
            const differed = review.correct !== localCorrect;
            return (
              <article key={attempt.id} className={differed ? 'review-block differed' : 'review-block'}>
                <h3>
                  {index + 1}. {differed ? '判定が食い違います' : '端末と同じ判定です'}
                </h3>
                <p className={review.correct ? 'verdict good' : 'verdict bad'}>{review.correct ? '聞き直しでは正解' : '聞き直しでは不正解'}</p>
                <p className="muted">端末の認識: {localCorrect ? '正解' : '不正解'}</p>
                <p lang="en">{review.transcript || '（聞こえた単語はありません）'}</p>
                <WordDiff ops={review.ops} />
              </article>
            );
          })}
        </section>
      ) : null}

      <div className="actions">
        <Link to={againPath(run.part)} className="btn">
          もう一度練習する
        </Link>
        <Link to="/history" className="btn secondary">
          記録一覧
        </Link>
      </div>
    </main>
  );
}

function partLabel(part: PracticePart): string {
  if (part === 'A') return 'Part A';
  if (part === 'B-read') return '見て読む';
  return 'Part B';
}

function againPath(part: PracticePart): string {
  if (part === 'A') return '/a';
  if (part === 'B-read') return '/read';
  return '/practice';
}
