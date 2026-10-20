import { useState } from 'react';
import { Link } from 'react-router-dom';
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
        <h1>No session</h1>
        <p className="lede">練習を始めると、10問程度が終わったところでまとめが出ます。</p>
        <Link to="/" className="btn secondary">
          Home
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
  const sentenceRisks = attempts.filter((attempt) => {
    const review = reviews.get(attempt.id);
    return review && !review.unavailable && !review.correct;
  }).length;
  const pronunciationNotes = attempts.filter((attempt) => {
    const review = reviews.get(attempt.id);
    return review && !review.unavailable && review.pronunciation.length > 0;
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
      <p className="eyebrow">{partLabel(run.part)}</p>
      <h1>Session</h1>
      <p className="lede">
        {run.part === 'A' ? '1セットが終わったので、ここまでの結果をまとめています。' : `${practiceRunSize(run.part)}問が終わったので、ここまでの結果をまとめています。`}
      </p>
      <p className="score-kicker">On this device</p>
      <p className="score" data-testid="session-correct">
        {correctCount}/{attempts.length}
      </p>
      <p className="muted">正解した問の数です。練習点の平均は {average} です。本番の Versant スコアではありません。</p>
      <p className="disclaimer">各問の合格、チェック、3回連続は、このまとめでは変えません。</p>

      <section className="card">
        <h2>Items</h2>
        <ul className="session-list">
          {attempts.map((attempt, index) => {
            const correct = attemptWasCorrect(attempt);
            const review = reviews.get(attempt.id);
            return (
              <li key={attempt.id}>
                <Link to={`/history/${attempt.id}`}>
                  <span>{index + 1}</span>
                  <strong lang="en">{attempt.sentenceText}</strong>
                  <small className={correct ? 'good' : 'bad'}>{correct ? 'Correct' : 'Incorrect'} · {attempt.overallScore}</small>
                </Link>
                {review?.unavailable ? <p className="muted">{review.unavailable}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" data-testid="gemini-ask">
        <h2>Gemini に聞きますか？</h2>
        <p>
          録音と正解文をまとめて送ります。単語が確かに聞こえるか、余分な語や言い直しがあるか、気になる発音はどこかを答えさせます。正答を増やす採点ではありません。
        </p>
        <p className="muted">発音の点数は出しません。各問の合格とチェックも書き換えません。アプリに共通のキーはありません。使う人が自分の Gemini APIキーを貼ります。利用料はそのキーのアカウントにかかり、キーはこの端末にだけ残します。</p>
        {phase === 'declined' ? (
          <p className="note">依頼しませんでした。端末の判定のままです。</p>
        ) : null}
        {phase === 'sending' ? <p className="note">録音を送っています。10問分なので、少し待ちます。</p> : null}
        {error ? <p className="note">{error}</p> : null}
        {phase !== 'sending' ? (
          <>
            <label className="field">
              <span>Gemini API key</span>
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
                Geminiに聞く
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
          <h2>Gemini の聞き取り</h2>
          <p>
            文として減点されうる問は {sentenceRisks} 問です。発音の指摘がある問は {pronunciationNotes} 問です。本番の点数ではなく、合格とチェックも変えていません。
          </p>
          {attempts.map((attempt, index) => {
            const review = reviews.get(attempt.id);
            if (!review || review.unavailable) return null;
            const risk = !review.correct;
            return (
              <article key={attempt.id} className={risk || review.pronunciation.length > 0 ? 'review-block differed' : 'review-block'}>
                <h3>
                  {index + 1}. {risk ? '文として減点されうる' : '文の抜けは見つからなかった'}
                </h3>
                <p className="muted">端末の判定は {attemptWasCorrect(attempt) ? '正解' : '不正解'} のままです。</p>
                <ul className="hearing-list">
                  {review.words.map((word, wordIndex) => (
                    <li key={`${word.word}-${wordIndex}`}>
                      <span lang="en">{word.word}</span>
                      <small className={word.status === 'clear' ? 'good' : 'bad'}>{hearingLabel(word.status)}</small>
                    </li>
                  ))}
                </ul>
                {review.extras.length > 0 ? <p>余分な語: <span lang="en">{review.extras.join(' ')}</span></p> : null}
                {review.restart ? <p>言い直しています。</p> : null}
                {review.pronunciation.length > 0 ? (
                  <ul>
                    {review.pronunciation.map((note) => (
                      <li key={`${note.word}-${note.note}`}>{note.note}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">気になる発音の指摘はありません。</p>
                )}
                <p className="muted" lang="en">
                  {review.transcript || '（聞こえた単語はありません）'}
                </p>
              </article>
            );
          })}
        </section>
      ) : null}

      <div className="actions">
        <Link to={againPath(run.part)} className="btn">
          Again
        </Link>
        <Link to="/history" className="btn secondary">
          History
        </Link>
      </div>
    </main>
  );
}

function hearingLabel(status: 'clear' | 'uncertain' | 'missing'): string {
  if (status === 'clear') return '聞こえる';
  if (status === 'uncertain') return 'あいまい';
  return '言っていない';
}

function partLabel(part: PracticePart): string {
  if (part === 'A') return 'Part A';
  if (part === 'B-read') return 'Read along';
  return 'Part B';
}

function againPath(part: PracticePart): string {
  if (part === 'A') return '/a';
  if (part === 'B-read') return '/read';
  return '/practice';
}
