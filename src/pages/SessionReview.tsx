import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GeminiReviews } from '../components/GeminiReviews';
import { loadGeminiKey, saveGeminiKey } from '../lib/gemini';
import { markGeminiJobsSeen, refreshGeminiJob, requestGeminiReview } from '../lib/gemini-job';
import {
  loadPracticeRun,
  loadSavedSession,
  practicePartLabel,
  practiceRunSize,
  type LiteralReview,
  type SavedSession,
} from '../lib/practice-run';
import { attemptWasCorrect } from '../lib/progress';
import { loadAttempt } from '../lib/storage';
import { useGeminiJobs, usePollPendingJobs } from '../lib/use-gemini-jobs';
import type { Attempt } from '../types';

export function SessionReview() {
  const { id } = useParams();
  const loaded = sessionFrom(id);
  const [fresh, setFresh] = useState<{ id: string; session: SavedSession } | null>(null);
  const run = fresh && fresh.id === loaded?.id ? fresh.session : loaded;
  const { jobs, uploadingRunIds } = useGeminiJobs();
  const [apiKey, setApiKey] = useState(() => loadGeminiKey());
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [pendingNote, setPendingNote] = useState('');

  const job = run ? jobs.find((item) => item.runId === run.id) : undefined;
  const uploading = run ? uploadingRunIds.includes(run.id) : false;
  usePollPendingJobs(job?.status === 'pending' ? [job] : []);

  useEffect(() => {
    if (job?.status === 'done' && !job.seen) markGeminiJobsSeen([job.interactionId]);
  }, [job?.interactionId, job?.status, job?.seen]);

  if (!run || run.attemptIds.length === 0) {
    return (
      <main className="page">
        <h1>No session</h1>
        <p className="lede">練習を始めると、10問程度が終わったところでまとめが出ます。</p>
        <Link to="/history" className="btn secondary">
          記録を見る
        </Link>
      </main>
    );
  }

  const session = run;
  const attempts = session.attemptIds
    .map((attemptId) => loadAttempt(attemptId))
    .filter((attempt): attempt is Attempt => attempt != null);
  const correctCount = attempts.filter((attempt) => attemptWasCorrect(attempt)).length;
  const average =
    attempts.length === 0
      ? 0
      : Math.round(attempts.reduce((sum, attempt) => sum + attempt.overallScore, 0) / attempts.length);
  const reviewList: LiteralReview[] | undefined =
    job?.status === 'done' && job.reviews ? job.reviews : job ? undefined : session.reviews;
  const reviews = new Map((reviewList ?? []).map((review) => [review.attemptId, review]));
  const showResults = !uploading && Boolean(reviewList && reviewList.length > 0);
  const showPending = uploading || job?.status === 'pending';
  const showAsk = !showPending && !showResults;

  const onRequest = async () => {
    const key = apiKey.trim();
    if (!key) {
      setError('Gemini の APIキーを入れてください。');
      return;
    }
    setError('');
    setPendingNote('');
    saveGeminiKey(key);
    try {
      await requestGeminiReview({ runId: session.id, part: session.part, attempts, apiKey: key });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gemini への依頼に失敗しました。');
    }
  };

  const onCheck = async () => {
    if (!job) return;
    const key = apiKey.trim() || loadGeminiKey();
    if (!key) {
      setError('Gemini の APIキーを入れてください。');
      return;
    }
    saveGeminiKey(key);
    setChecking(true);
    setError('');
    setPendingNote('');
    try {
      const next = await refreshGeminiJob(job, key);
      if (next.status === 'pending') setPendingNote('まだ終わっていません。時間をおいて、もう一度確認できます。');
      if (next.status === 'done') {
        const saved = loadSavedSession(session.id);
        if (saved) setFresh({ id: saved.id, session: saved });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '結果を確認できませんでした。');
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="page">
      <p className="eyebrow">{practicePartLabel(session.part)}</p>
      <h1>Session</h1>
      <p className="lede">
        {session.part === 'A'
          ? '1セットが終わったので、ここまでの結果をまとめています。'
          : `${practiceRunSize(session.part)}問が終わったので、ここまでの結果をまとめています。`}
      </p>
      <p className="score-kicker">On this device</p>
      <p className="score" data-testid="session-correct">
        {correctCount}/{attempts.length}
      </p>
      <p className="muted">正解した問の数です。練習点の平均は {average} です。本番の Versant スコアではありません。</p>
      <p className="disclaimer">
        この10問は区切りです。正否とチェックはブラウザに残るので、次の練習は間違えた問題から続きます。このまとめでは、各問の合格と3連続は変えません。
      </p>

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
                  <small className={correct ? 'good' : 'bad'}>
                    {correct ? 'Correct' : 'Incorrect'} · {attempt.overallScore}
                  </small>
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
        <p className="muted">
          発音の点数は出しません。各問の合格とチェックも書き換えません。アプリに共通のキーはありません。使う人が自分の Gemini APIキーを貼ります。利用料はそのキーのアカウントにかかり、キーはこの端末にだけ残します。
        </p>
        {declined && showAsk ? <p className="note">依頼しませんでした。端末の判定のままです。</p> : null}
        {showAsk && (error || job?.status === 'error') ? (
          <p className="note">{error || job?.error || '採点に失敗しました。もう一度依頼できます。'}</p>
        ) : null}
        {showPending ? (
          <div data-testid="gemini-pending">
            <p className="note">
              {uploading
                ? '録音を送っています。送り終わるまで、このタブは開いたままにしてください。受付が終われば、離れてもあとから確認できます。'
                : '採点を受け付けました。この画面を離れても、戻ってから結果を確認できます。上の案内からも開けます。'}
            </p>
            {pendingNote ? <p className="note">{pendingNote}</p> : null}
            {error ? <p className="note">{error}</p> : null}
            {error ? (
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
            ) : null}
            {uploading ? null : (
              <div className="actions">
                <button type="button" className="btn" data-testid="check-gemini" disabled={checking} onClick={() => void onCheck()}>
                  {checking ? '確認しています' : '結果を確認'}
                </button>
                <Link to="/gemini" className="btn secondary">
                  確認ページ
                </Link>
              </div>
            )}
          </div>
        ) : null}
        {showAsk ? (
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
              {job?.status === 'error' || declined ? null : (
                <button
                  type="button"
                  className="btn secondary"
                  data-testid="skip-gemini"
                  onClick={() => {
                    setError('');
                    setDeclined(true);
                  }}
                >
                  依頼しない
                </button>
              )}
            </div>
          </>
        ) : null}
      </section>

      {showResults && reviewList ? (
        <section className="card">
          <h2>Gemini の聞き取り</h2>
          <GeminiReviews attempts={attempts} reviews={reviewList} />
        </section>
      ) : null}

      <div className="actions">
        <Link to={againPath(session.part)} className="btn">
          Again
        </Link>
        <Link to="/history" className="btn secondary">
          History
        </Link>
      </div>
    </main>
  );
}

function sessionFrom(id: string | undefined): SavedSession | null {
  if (id) return loadSavedSession(id);
  const current = loadPracticeRun();
  if (!current || current.attemptIds.length === 0) return null;
  return loadSavedSession(current.id);
}

function againPath(part: SavedSession['part']): string {
  if (part === 'A') return '/a';
  if (part === 'B-read') return '/read';
  return '/practice';
}
