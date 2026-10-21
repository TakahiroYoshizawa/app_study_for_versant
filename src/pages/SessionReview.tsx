import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, type NavigateFunction } from 'react-router-dom';
import { GeminiHearing } from '../components/GeminiHearing';
import { OpenFeedbackView } from '../components/OpenFeedback';
import { StoryPoints } from '../components/StoryPoints';
import { findBuild } from '../data/builds';
import { findQuestion } from '../data/questions';
import { findStory } from '../data/stories';
import { loadGeminiKey } from '../lib/gemini';
import { markGeminiJobsSeen, refreshGeminiJob, requestGeminiReview } from '../lib/gemini-job';
import { gradeOpenAttempts, openGradeMode, type OpenGradeMode } from '../lib/open-grade';
import { openSummary } from '../lib/open-score';
import {
  loadPracticeRun,
  loadSavedSession,
  practicePartLabel,
  practiceRunSize,
  type LiteralReview,
  type SavedSession,
} from '../lib/practice-run';
import { attemptWasCorrect } from '../lib/progress';
import { beginReadingSet, selectReadingSet } from '../lib/reading-session';
import { getAudioContext } from '../lib/speech';
import { loadAttempt, loadAttempts } from '../lib/storage';
import { useGeminiJobs, usePollPendingJobs } from '../lib/use-gemini-jobs';
import type { Attempt } from '../types';

export function SessionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const scoreNow = Boolean((location.state as { scoreNow?: boolean } | null)?.scoreNow);
  const loaded = sessionFrom(id);
  const [fresh, setFresh] = useState<{ id: string; session: SavedSession } | null>(null);
  const run = fresh && fresh.id === loaded?.id ? fresh.session : loaded;
  const { jobs, uploadingRunIds } = useGeminiJobs();
  const [hasKey, setHasKey] = useState(() => loadGeminiKey().length > 0);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [pendingNote, setPendingNote] = useState('');
  const [revision, setRevision] = useState(0);
  const [scoring, setScoring] = useState(false);

  const job = run ? jobs.find((item) => item.runId === run.id) : undefined;
  const uploading = run ? uploadingRunIds.includes(run.id) : false;
  usePollPendingJobs(job?.status === 'pending' ? [job] : []);

  useEffect(() => {
    setHasKey(loadGeminiKey().length > 0);
  }, [id]);

  useEffect(() => {
    if (job?.status === 'done' && !job.seen) markGeminiJobsSeen([job.interactionId]);
  }, [job?.interactionId, job?.status, job?.seen]);

  useEffect(() => {
    if (!scoreNow || !run || run.part !== 'F') return;
    let cancelled = false;
    setScoring(true);
    setError('');
    const key = loadGeminiKey();
    void gradeOpenAttempts(run.id, run.attemptIds, key, 'missing')
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '採点に失敗しました。');
      })
      .finally(() => {
        if (cancelled) return;
        setScoring(false);
        setHasKey(loadGeminiKey().length > 0);
        setRevision((value) => value + 1);
      });
    return () => {
      cancelled = true;
    };
    // Grade once when a finished Part F session opens. run.id is stable; the object is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreNow, run?.id]);

  if (!run || run.attemptIds.length === 0) {
    return (
      <main className="page">
        <h1>No session</h1>
        <p className="lede">練習を始めると、セッションが終わったところでまとめが出ます。</p>
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
  const openStats = session.part === 'F' ? openSummary(attempts) : null;
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
  const sentenceRisks = attempts.filter((attempt) => {
    const review = reviews.get(attempt.id);
    return review && !review.unavailable && review.words.length > 0 && !review.correct;
  }).length;
  const pronunciationNotes = attempts.filter((attempt) => {
    const review = reviews.get(attempt.id);
    return review && !review.unavailable && review.pronunciation.length > 0;
  }).length;

  const onRequest = async () => {
    const key = loadGeminiKey();
    if (!key) {
      setHasKey(false);
      setError('APIキーがありません。Key で保存してから聞いてください。');
      return;
    }
    setError('');
    setPendingNote('');
    setDeclined(false);
    try {
      await requestGeminiReview({ runId: session.id, part: session.part, attempts, apiKey: key });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gemini への依頼に失敗しました。');
    }
  };

  const onCheck = async () => {
    if (!job) return;
    const key = loadGeminiKey();
    if (!key) {
      setHasKey(false);
      setError('APIキーがありません。Key で保存してから確認してください。');
      return;
    }
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

  const onGradeOpen = async (mode: OpenGradeMode) => {
    setError('');
    setScoring(true);
    const key = loadGeminiKey();
    setHasKey(key.length > 0);
    try {
      await gradeOpenAttempts(session.id, session.attemptIds, key, mode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '採点に失敗しました。');
    } finally {
      setScoring(false);
      setRevision((value) => value + 1);
    }
  };

  return (
    <main className="page">
      <p className="eyebrow">{practicePartLabel(session.part)}</p>
      <h1>Session</h1>
      <p className="lede">
        {session.part === 'A'
          ? session.closed
            ? '1セットが終わったので、ここまでの結果をまとめています。'
            : '途中までの結果です。'
          : session.part === 'C'
            ? session.closed
              ? `${practiceRunSize(session.part)}問が終わったので、答え合わせをまとめています。`
              : `途中までの結果です。${practiceRunSize('C')}問が終わると、答え合わせをまとめて出します。`
            : session.part === 'F'
              ? session.closed
                ? '2問が終わったので、練習フィードバックをまとめています。'
                : '途中までの結果です。'
              : session.part === 'E'
                ? session.closed
                  ? `${practiceRunSize('E')}話が終わったので、要点がどれだけ入っていたかをまとめています。`
                  : `途中までの結果です。${practiceRunSize('E')}話が終わると、要点をまとめて出します。`
              : session.closed
              ? `${practiceRunSize(session.part)}問が終わったので、ここまでの結果をまとめています。`
              : '途中までの結果です。'}
      </p>
      {session.part === 'F' ? (
        <>
          <p className="open-label">練習フィードバック（本番では自動採点されない）</p>
          <p className="score" data-testid="open-mean">
            {openStats?.mean == null ? '—' : openStats.mean}
          </p>
          <p className="muted">
            採点できた問は {openStats?.scored ?? 0} 問です。
            {(openStats?.unscored ?? 0) > 0 ? `未採点は ${openStats?.unscored} 問です。` : ''}
            70点以上は {openStats?.passed ?? 0} 問で、その問だけチェックが進みます。本番の Versant スコアではありません。
          </p>
          {scoring ? <p className="note">採点しています。このタブは開いたままにしてください。</p> : null}
        </>
      ) : (
        <>
      <p className="score-kicker">Browser</p>
      <p className="score" data-testid="session-correct">
        {correctCount}/{attempts.length}
      </p>
      <p className="muted">
        {session.part === 'E'
          ? `ブラウザが、要点の手がかりで正解にした話の数です。練習点の平均は ${average} です。本番の Versant スコアではありません。`
          : `ブラウザが正解にした問の数です。練習点の平均は ${average} です。本番の Versant スコアではありません。`}
      </p>
      {showResults ? (
        session.part === 'E' ? (
          <p className="muted">Gemini は、言い換えていても要点が入っていれば入ったものとします。ブラウザの合否は変えていません。</p>
        ) : (
          <p className="muted">
            Gemini では、文として減点されうる問が {sentenceRisks} 問、発音の指摘がある問が {pronunciationNotes} 問です。合格とチェックは変えていません。
          </p>
        )
      ) : null}
        </>
      )}
      <p className="disclaimer">
        {session.part === 'F'
          ? '70点以上の回だけ、チェックと3連続に入ります。未採点の回はチェックを動かしません。'
          : session.part === 'A'
          ? '採点のあと次へ進むと、いまのセット以外で、まだ取り組んでいないセットを優先して出します。'
          : session.part === 'E'
            ? 'この区切りの正否とチェックはブラウザに残るので、次の練習は要点が足りなかった話から続きます。'
            : 'この区切りの正否とチェックはブラウザに残るので、次の練習は間違えた問題から続きます。'}
      </p>

      <section className="card">
        <h2>{session.part === 'F' ? '練習フィードバック' : session.part === 'C' ? '答え合わせ' : session.part === 'E' ? '話' : 'Items'}</h2>
        <ul
          className="session-list"
          key={revision}
          data-testid={session.part === 'F' ? 'part-f-answers' : session.part === 'E' ? 'part-e-answers' : session.part === 'C' ? 'part-c-answers' : showResults ? 'gemini-result' : undefined}
        >
          {attempts.map((attempt, index) => {
            if (session.part === 'F') {
              return (
                <li key={attempt.id}>
                  <Link to={`/history/${attempt.id}`} className="session-item-top">
                    <span>{index + 1}</span>
                    <strong lang="en">{attempt.sentenceText}</strong>
                  </Link>
                  <p className="muted" lang="en">
                    {attempt.transcript.trim() || '(no words recognized)'}
                  </p>
                  <OpenFeedbackView attempt={attempt} />
                </li>
              );
            }
            const correct = attemptWasCorrect(attempt);
            const review = reviews.get(attempt.id);
            const answers = session.part === 'C' ? acceptableLine(attempt) : '';
            const phrases = session.part === 'D' ? (findBuild(attempt.sentenceId)?.chunks.join(' / ') ?? '') : '';
            return (
              <li key={attempt.id}>
                <Link to={`/history/${attempt.id}`} className="session-item-top">
                  <span>{index + 1}</span>
                  <strong lang="en">{session.part === 'E' ? (findStory(attempt.sentenceId)?.title ?? 'Story') : attempt.sentenceText}</strong>
                </Link>
                <dl className="score-pair">
                  <dt>Browser</dt>
                  <dd className={correct ? 'good' : 'bad'}>
                    {correct ? 'Correct' : 'Incorrect'} · {attempt.overallScore}
                  </dd>
                  {session.part === 'C' ? (
                    <>
                      <dt>You</dt>
                      <dd lang="en">{attempt.transcript.trim() || '(no words recognized)'}</dd>
                      <dt>Answer</dt>
                      <dd lang="en">{answers}</dd>
                    </>
                  ) : null}
                  {session.part === 'D' ? (
                    <>
                      <dt>Phrases</dt>
                      <dd lang="en">{phrases}</dd>
                      <dt>Sentence</dt>
                      <dd lang="en">{attempt.sentenceText}</dd>
                    </>
                  ) : null}
                  {session.part === 'E' ? (
                    <>
                      <dt>Story</dt>
                      <dd lang="en">{attempt.sentenceText}</dd>
                      <dt>Points</dt>
                      <dd>{attempt.storyPoints ? <StoryPoints points={attempt.storyPoints} /> : '—'}</dd>
                      <dt>You</dt>
                      <dd lang="en">{attempt.transcript.trim() || '(no words recognized)'}</dd>
                    </>
                  ) : null}
                  {review ? (
                    <>
                      <dt>Gemini</dt>
                      <dd>
                        <GeminiHearing review={review} sentence={attempt.sentenceText} />
                      </dd>
                    </>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" data-testid={session.part === 'F' ? 'open-score-panel' : 'gemini-ask'}>
        {session.part === 'F' ? (
          <OpenSessionPanel attempts={attempts} scoring={scoring} error={error} hasKey={hasKey} onGrade={(mode) => void onGradeOpen(mode)} />
        ) : (
          <>
        <h2>{session.part === 'C' ? 'Scoring' : 'Gemini'}</h2>
        {session.part === 'C' ? (
          <>
            <p>正規化した答えが、用意した許容回答のどれかと完全に一致すれば 100、それ以外は 0 です。部分点はありません。</p>
            <p className="muted">このパートの点は、ブラウザの完全一致だけです。</p>
          </>
        ) : (
          <>
        {session.part === 'E' ? (
          <>
            <p>
              録音と話の要点を、Key に保存した APIキーでまとめて送ります。元の文どおりでなくても、要点が入っていれば入ったものとします。
            </p>
            <p className="muted">合否は要点の入り方で付けます。ブラウザの正解とチェックは書き換えません。</p>
          </>
        ) : (
          <>
            <p>
              録音と正解文を、Key に保存した APIキーでまとめて送ります。単語が確かに聞こえるか、余分な語や言い直しがあるか、気になる発音はどこかを見ます。
            </p>
            <p className="muted">点数は出しません。各問の合格とチェックも書き換えません。</p>
          </>
        )}
        {declined && showAsk ? <p className="note">依頼しませんでした。ブラウザの判定のままです。</p> : null}
        {showAsk && (error || job?.status === 'error') ? (
          <p className="note">{error || job?.error || '採点に失敗しました。もう一度依頼できます。'}</p>
        ) : null}
        {!hasKey && !showPending ? (
          <p className="note">
            APIキーが未設定です。<Link to="/settings">Key</Link> で保存すると、ここからまとめて聞けます。
          </p>
        ) : null}
        {showPending ? (
          <div data-testid="gemini-pending">
            <p className="note">
              {uploading
                ? '録音を送って採点しています。結果が出るまで、このタブは開いたままにしてください。'
                : '採点を受け付けました。この画面を離れても、戻ってから結果を確認できます。上の案内からも開けます。'}
            </p>
            {pendingNote ? <p className="note">{pendingNote}</p> : null}
            {error ? <p className="note">{error}</p> : null}
            {!hasKey ? (
              <p className="note">
                APIキーが未設定です。<Link to="/settings">Key</Link> で保存してから確認してください。
              </p>
            ) : null}
            {uploading ? null : (
              <div className="actions">
                {hasKey ? (
                  <button type="button" className="btn" data-testid="check-gemini" disabled={checking} onClick={() => void onCheck()}>
                    {checking ? '確認しています' : '結果を確認'}
                  </button>
                ) : (
                  <Link to="/settings" className="btn">
                    Set API key
                  </Link>
                )}
                <Link to="/gemini" className="btn secondary">
                  確認ページ
                </Link>
              </div>
            )}
          </div>
        ) : null}
        {showAsk ? (
          <div className="actions">
            {hasKey ? (
              <button type="button" className="btn" data-testid="request-gemini" onClick={() => void onRequest()}>
                Ask Gemini
              </button>
            ) : (
              <Link to="/settings" className="btn">
                Set API key
              </Link>
            )}
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
        ) : null}
        {showResults && hasKey ? (
          <div className="actions">
            <button type="button" className="btn" data-testid="request-gemini" onClick={() => void onRequest()}>
              Ask again
            </button>
          </div>
        ) : null}
          </>
        )}
          </>
        )}
      </section>

      <div className="actions">
        <button type="button" className="btn" onClick={() => startAgain(session, attempts, navigate)}>
          {session.part === 'A' ? 'Next set' : 'Again'}
        </button>
        <Link to="/history" className="btn secondary">
          History
        </Link>
      </div>
    </main>
  );
}

function OpenSessionPanel({
  attempts,
  scoring,
  error,
  hasKey,
  onGrade,
}: {
  attempts: Attempt[];
  scoring: boolean;
  error: string;
  hasKey: boolean;
  onGrade: (mode: OpenGradeMode) => void;
}) {
  const mode = openGradeMode(attempts);
  return (
    <>
      <h2>採点</h2>
      <p>設問と文字起こしを、Key に保存した APIキーで送ります。音声は送りません。</p>
      <p className="muted">空の回答は 0 点で、Gemini は呼びません。再採点はボタンを押したときだけです。</p>
      {!hasKey ? (
        <p className="note">
          APIキーが未設定です。<Link to="/settings">Key</Link> で保存すると採点できます。
        </p>
      ) : null}
      {error ? <p className="note">{error}</p> : null}
      {mode ? (
        <div className="actions">
          {hasKey ? (
            <button type="button" className="btn" data-testid="request-open-score" disabled={scoring} onClick={() => onGrade(mode)}>
              {scoring ? '採点しています' : mode === 'missing' ? '採点する' : '再採点'}
            </button>
          ) : (
            <Link to="/settings" className="btn">
              Set API key
            </Link>
          )}
        </div>
      ) : (
        <p className="muted">このセッションは空の回答だけなので、採点は呼びません。</p>
      )}
    </>
  );
}

function acceptableLine(attempt: Attempt): string {
  const question = findQuestion(attempt.sentenceId);
  if (question && question.acceptableAnswers.length > 0) return question.acceptableAnswers.join(' / ');
  return attempt.matchedAnswer || attempt.normalizedTarget || '';
}

function sessionFrom(id: string | undefined): SavedSession | null {
  if (id) return loadSavedSession(id);
  const current = loadPracticeRun();
  if (!current || current.attemptIds.length === 0) return null;
  return loadSavedSession(current.id);
}

function startAgain(session: SavedSession, attempts: Attempt[], navigate: NavigateFunction) {
  getAudioContext();
  if (session.part === 'A') {
    const finishedId = [...attempts].reverse().find((attempt) => attempt.readingSetId)?.readingSetId;
    const set = selectReadingSet(loadAttempts(), finishedId);
    beginReadingSet(set.id);
    navigate('/a/practice', { state: { autostart: true } });
    return;
  }
  if (session.part === 'B-read') {
    navigate('/read');
    return;
  }
  if (session.part === 'C') {
    navigate('/c/practice');
    return;
  }
  if (session.part === 'D') {
    navigate('/d/practice');
    return;
  }
  if (session.part === 'E') {
    navigate('/e/practice');
    return;
  }
  if (session.part === 'F') {
    navigate('/f/practice');
    return;
  }
  navigate('/practice');
}
