import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { WordDiff } from '../components/WordDiff';
import { findReadingSet, situationLabel } from '../data/readings';
import { difficultyLabel, spokenWordCount } from '../data/sentences';
import { endLabel, formatSeconds } from '../lib/format';
import { MASTER_STREAK, attemptWasCorrect, progressByItem } from '../lib/progress';
import { practiceRunProgress } from '../lib/practice-run';
import { beginReading, nextAskNumber } from '../lib/reading-session';
import { beginItem, peekActive } from '../lib/session';
import { cancelSpeech, getAudioContext, speakPassage } from '../lib/speech';
import { deleteAttempt, loadAttempt, loadAttempts } from '../lib/storage';
import type { Attempt } from '../types';

export function AttemptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);
  const [speaking, setSpeaking] = useState(false);
  const [clipPlaying, setClipPlaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const clipRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setAttempt(id ? loadAttempt(id) : null);
  }, [id]);

  useEffect(
    () => () => {
      clipRef.current?.pause();
      if (!peekActive()) cancelSpeech();
    },
    [],
  );

  if (attempt === undefined) return null;
  if (!attempt) {
    return (
      <main className="page">
        <h1>記録が見つかりません</h1>
        <Link to="/history" className="btn secondary">
          記録一覧へ
        </Link>
      </main>
    );
  }

  const notice = noticeFor(attempt);
  const showFactor = !attempt.noResponse && attempt.contentScore > 0 && attempt.latencyFactor < 1;
  const correct = attemptWasCorrect(attempt);
  const status = progressByItem(loadAttempts()).get(attempt.sentenceId);
  const readingSet = attempt.part === 'A' && attempt.readingSetId ? findReadingSet(attempt.readingSetId) : undefined;
  const upcoming =
    attempt.part === 'A' && attempt.continueSet && attempt.readingNumber
      ? nextAskNumber(attempt.readingAskOrder, attempt.readingNumber)
      : null;
  const progress = practiceRunProgress(attempt.id);
  const nextLabel = progress?.finished
    ? 'セッションの採点を見る'
    : attempt.part === 'A'
      ? upcoming != null
        ? '次の番号'
        : '問題一覧'
      : '次の文';

  function stopClip() {
    clipRef.current?.pause();
    if (clipRef.current) clipRef.current.currentTime = 0;
    setClipPlaying(false);
  }

  async function onReplay() {
    stopClip();
    if (speaking) {
      cancelSpeech();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    await speakPassage(attempt!.sentenceText, 0.98, undefined, attempt!.part === 'B-read' ? 'male' : 'default');
    setSpeaking(false);
  }

  function onPlayClip() {
    if (!attempt?.audioDataUrl) return;
    cancelSpeech();
    setSpeaking(false);
    if (!clipRef.current) {
      const audio = new Audio(attempt.audioDataUrl);
      audio.onended = () => setClipPlaying(false);
      clipRef.current = audio;
    }
    if (clipPlaying) {
      stopClip();
      return;
    }
    void clipRef.current.play().then(
      () => setClipPlaying(true),
      () => setClipPlaying(false),
    );
  }

  function onNext() {
    getAudioContext();
    if (progress?.finished) {
      navigate('/session');
      return;
    }
    if (attempt!.part === 'A' && attempt!.readingSetId && attempt!.readingNumber) {
      if (upcoming != null) {
        beginReading(attempt!.readingSetId, upcoming, true, attempt!.readingAskOrder);
        navigate('/a/practice', { state: { autostart: true } });
        return;
      }
      navigate('/a/questions');
      return;
    }
    if (attempt!.part === 'B-read') {
      beginItem(undefined, true);
      navigate('/read', { state: { autostart: true } });
      return;
    }
    beginItem();
    navigate('/practice', { state: { autostart: true } });
  }

  function onDelete() {
    deleteAttempt(attempt!.id);
    navigate('/history');
  }

  const partA = attempt.part === 'A';
  const mastery = status?.mastered
    ? `${MASTER_STREAK}回連続で正解したので、この問題は理解できたものとします。`
    : status?.checked
      ? `間違えたのでチェックが付いています。連続正解は ${status.streak}/${MASTER_STREAK} です。`
      : `連続正解は ${status?.streak ?? 0}/${MASTER_STREAK} です。`;

  return (
    <main className="page">
      {partA ? (
        <div className="result-head">
          <div>
            <p className="eyebrow">Part A</p>
            <h1>{readingSet ? situationLabel(readingSet.id) : 'Situation'}</h1>
            <p className="result-place">{partAPlace(attempt, readingSet)}</p>
            <p className={correct ? 'verdict good' : 'verdict bad'} data-testid="verdict">
              {correct ? 'Correct' : 'Incorrect'}
            </p>
          </div>
          <ScoreRing score={attempt.overallScore} />
        </div>
      ) : (
        <>
          <p className="eyebrow">
            {`${attempt.part === 'B-read' ? '見て読む' : 'リピート'} · ${difficultyLabel(attempt.difficulty)} · ${spokenWordCount(attempt.sentenceText)}語 · ${endLabel(attempt.end)}`}
          </p>
          <h1>結果</h1>
          <p className={correct ? 'verdict good' : 'verdict bad'} data-testid="verdict">
            {correct ? '正解' : '不正解'}
          </p>
          <p className="muted" data-testid="mastery">
            {mastery}
          </p>
          <p className="score-kicker">練習用の目安</p>
          <p className="score" data-testid="overall-score">
            {attempt.overallScore}
          </p>
          <p className="disclaimer">本番の Versant スコアではありません。発音は採点していません。</p>
        </>
      )}
      {notice ? <p className="note">{notice}</p> : null}
      {progress && !progress.finished ? (
        <p className="muted" data-testid="session-progress">
          このセッションは {progress.index}/{progress.size} 問です。{progress.size}問でまとめの採点を出します。
        </p>
      ) : null}
      {attempt.readOtherSentence ? (
        <p className="note">別の番号の文に近い読み方です。点数は指定された文だけで付けています。</p>
      ) : null}

      <section className={partA ? 'stats result-stats' : 'stats'}>
        <div>
          <span>内容</span>
          <strong>{attempt.contentScore}</strong>
        </div>
        <div>
          <span>反応</span>
          <strong>{formatSeconds(attempt.latencyMs)}</strong>
        </div>
        <div>
          <span>話した時間</span>
          <strong>{formatSeconds(attempt.hadSignal ? attempt.speakingMs : null)}</strong>
        </div>
        <div>
          <span>話速</span>
          <strong>{attempt.wpm == null ? '—' : `${attempt.wpm}`}</strong>
        </div>
      </section>
      {partA ? (
        <>
          <p className="muted result-formula">
            内容点 {attempt.contentScore} × 反応係数 {attempt.latencyFactor.toFixed(2)} = 総合 {attempt.overallScore}
          </p>
          <p className="disclaimer">本番の Versant スコアではありません。発音は採点していません。</p>
        </>
      ) : showFactor ? (
        <p className="muted">
          内容点 {attempt.contentScore} × 反応係数 {attempt.latencyFactor.toFixed(2)} = 総合 {attempt.overallScore}
        </p>
      ) : !attempt.noResponse && attempt.contentScore > 0 && attempt.latencyFactor === 1 ? (
        <p className="muted">反応は1秒以内だったので、総合点は内容点と同じです。</p>
      ) : null}

      {partA ? null : (
        <section className="card">
          <h2>単語の比較</h2>
          <p className="muted">小文字にし、I'm や don't などの短縮形を広げて比べています。um は無視します。</p>
          <WordDiff ops={attempt.ops} />
        </section>
      )}

      {partA ? (
        <>
          <section className="card playback">
            <h2>正解の文</h2>
            <div className="playback-row">
              <button
                type="button"
                className="play-btn"
                aria-label={speaking ? '停止' : '正解をもう一度聞く'}
                onClick={() => void onReplay()}
              >
                {speaking ? <StopIcon /> : <PlayIcon />}
              </button>
              <p lang="en">{attempt.sentenceText}</p>
            </div>
          </section>
          <section className="card playback">
            <h2>あなたの回答</h2>
            <div className="playback-row">
              {attempt.audioDataUrl ? (
                <button
                  type="button"
                  className="play-btn"
                  aria-label={clipPlaying ? '停止' : '自分の声を聞く'}
                  onClick={onPlayClip}
                >
                  {clipPlaying ? <StopIcon /> : <PlayIcon />}
                </button>
              ) : null}
              <p lang="en">{attempt.transcript.trim() || '（認識した文字はありません）'}</p>
            </div>
            {attempt.audioDataUrl ? null : (
              <p className="muted">{attempt.audioSkippedReason ?? '音声は保存されていません。'}</p>
            )}
          </section>
          <section className="card">
            <h2>単語の比較</h2>
            <p className="muted">小文字にし、I'm や don't などの短縮形を広げて比べています。um は無視します。</p>
            <WordDiff ops={attempt.ops} />
          </section>
          <p className="muted" data-testid="mastery">
            {mastery}
          </p>
        </>
      ) : (
        <>
          <section className="card">
            <h2>あなたの回答</h2>
            <p lang="en">{attempt.transcript.trim() || '（認識した文字はありません）'}</p>
            {attempt.normalizedHeard ? (
              <p className="muted">
                採点に使った形: <span lang="en">{attempt.normalizedHeard}</span>
              </p>
            ) : null}
          </section>
          <section className="card">
            <h2>正解の文</h2>
            <p lang="en">{attempt.sentenceText}</p>
            <div className="actions">
              <button type="button" className="btn secondary" onClick={() => void onReplay()}>
                {speaking ? '停止' : attempt.part === 'B-read' ? 'お手本を聞く' : '正解をもう一度聞く'}
              </button>
            </div>
          </section>
          <section className="card">
            <h2>自分の声</h2>
            {attempt.audioDataUrl ? (
              <audio controls src={attempt.audioDataUrl} preload="none" />
            ) : (
              <p className="muted">{attempt.audioSkippedReason ?? '音声は保存されていません。'}</p>
            )}
          </section>
        </>
      )}

      <div className="actions">
        <button type="button" className="btn" data-testid="next-sentence" onClick={onNext}>
          {nextLabel}
        </button>
        <Link to="/history" className="btn secondary">
          記録一覧
        </Link>
      </div>
      {confirming ? (
        <div className="actions">
          <button type="button" className="btn danger" onClick={onDelete}>
            削除する
          </button>
          <button type="button" className="btn secondary" onClick={() => setConfirming(false)}>
            やめる
          </button>
        </div>
      ) : (
        <button type="button" className="text-btn" onClick={() => setConfirming(true)}>
          この記録を削除
        </button>
      )}
    </main>
  );
}

function partAPlace(attempt: Attempt, set: ReturnType<typeof findReadingSet>): string {
  const sentence = set?.sentences.find((item) => item.number === attempt.readingNumber);
  if (sentence) return `Group ${sentence.group} · ${sentence.number}`;
  if (attempt.readingNumber) return String(attempt.readingNumber);
  return '';
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, score / 100));
  return (
    <div className="score-ring" data-testid="overall-score">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} className="ring-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="ring-value"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
        />
      </svg>
      <strong>{score}</strong>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M6.2 3.4v11.2L15 9 6.2 3.4z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="4" y="4" width="10" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function noticeFor(attempt: Attempt): string | null {
  if (!attempt.micAvailable) return 'マイクが使えないため、無回答として記録しました。';
  if (!attempt.recognitionAvailable) {
    return 'このブラウザは音声認識に対応していません。Chrome で開いてください。';
  }
  if (attempt.recognitionBlocked) return '音声認識がブロックされました。ブラウザのマイク許可を確認してください。';
  if (attempt.noResponse) return '合図から6秒以内に話し始めなかったため、無回答です。';
  if (!attempt.normalizedHeard) return '音は検出されましたが、文として認識できませんでした。';
  return null;
}
