import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GeminiHearing } from '../components/GeminiHearing';
import { OpenFeedbackView, OpenRescore } from '../components/OpenFeedback';
import { StoryPoints } from '../components/StoryPoints';
import { WordDiff } from '../components/WordDiff';
import { findBuild } from '../data/builds';
import { findStory } from '../data/stories';
import { findReadingSet, situationLabel } from '../data/readings';
import { findQuestion, skillLabel, answerTypeLabel } from '../data/questions';
import { openKindLabel } from '../data/open-questions';
import { spokenWordCount } from '../data/sentences';
import { formatSeconds } from '../lib/format';
import { MASTER_STREAK, attemptWasCorrect, progressByItem } from '../lib/progress';
import { practiceRunProgress, reviewForAttempt, type LiteralReview } from '../lib/practice-run';
import { beginBuild, peekBuild } from '../lib/build-session';
import { beginQuestion, peekQuestion } from '../lib/question-session';
import { beginOpenQuestion, peekOpenQuestion } from '../lib/open-session';
import { isOpenGraded, OPEN_PASS } from '../lib/open-score';
import { beginStory, peekStory } from '../lib/story-session';
import { STORY_START_LIMIT_MS } from '../lib/story-score';
import { coveredChunks } from '../lib/sentence-build';
import { closestAnswer, startedLate } from '../lib/short-answer';
import { beginReading, nextAskNumber, peekReading } from '../lib/reading-session';
import { beginItem, peekActive } from '../lib/session';
import { cancelSpeech, getAudioContext, speakChunks, speakPassage } from '../lib/speech';
import { deleteAttempt, loadAttempt, loadAttempts } from '../lib/storage';
import type { Attempt } from '../types';

export function AttemptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);
  const [review, setReview] = useState<LiteralReview | null>(null);
  const [speaking, setSpeaking] = useState<null | 'prompt' | 'answer'>(null);
  const [clipPlaying, setClipPlaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const clipRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setAttempt(id ? loadAttempt(id) : null);
    setReview(id ? reviewForAttempt(id) : null);
  }, [id]);

  useEffect(
    () => () => {
      clipRef.current?.pause();
      if (!peekActive() && !peekReading() && !peekQuestion() && !peekBuild() && !peekStory() && !peekOpenQuestion()) cancelSpeech();
    },
    [],
  );

  if (attempt === undefined) return null;
  if (!attempt) {
    return (
      <main className="page">
        <h1>Not found</h1>
        <Link to="/history" className="btn secondary">
          History
        </Link>
      </main>
    );
  }

  const notice = noticeFor(attempt);
  const correct = attemptWasCorrect(attempt);
  const status = progressByItem(loadAttempts()).get(attempt.sentenceId);
  const readingSet = attempt.part === 'A' && attempt.readingSetId ? findReadingSet(attempt.readingSetId) : undefined;
  const upcoming =
    attempt.part === 'A' && attempt.continueSet && attempt.readingNumber
      ? nextAskNumber(attempt.readingAskOrder, attempt.readingNumber)
      : null;
  const progress = practiceRunProgress(attempt.id);
  const nextLabel = progress?.finished
    ? 'Session'
    : attempt.part === 'A'
      ? upcoming != null
        ? 'Next'
        : 'Questions'
      : 'Next';

  function stopClip() {
    clipRef.current?.pause();
    if (clipRef.current) clipRef.current.currentTime = 0;
    setClipPlaying(false);
  }

  async function onReplay(target: 'prompt' | 'answer') {
    stopClip();
    if (speaking) {
      cancelSpeech();
      setSpeaking(null);
      return;
    }
    setSpeaking(target);
    if (target === 'prompt' && attempt!.part === 'D') {
      const chunks = findBuild(attempt!.sentenceId)?.chunks;
      if (chunks) await speakChunks(chunks, 400);
    } else {
      await speakPassage(attempt!.sentenceText, attempt!.part === 'C' || attempt!.part === 'F' ? 1 : 0.98, undefined, attempt!.part === 'B-read' ? 'male' : 'default');
    }
    setSpeaking(null);
  }

  function onPlayClip() {
    if (!attempt?.audioDataUrl) return;
    cancelSpeech();
    setSpeaking(null);
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
    stopClip();
    cancelSpeech();
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
    if (attempt!.part === 'C') {
      beginQuestion();
      navigate('/c/practice', { state: { autostart: true } });
      return;
    }
    if (attempt!.part === 'D') {
      beginBuild();
      navigate('/d/practice', { state: { autostart: true } });
      return;
    }
    if (attempt!.part === 'E') {
      beginStory();
      navigate('/e/practice', { state: { autostart: true } });
      return;
    }
    if (attempt!.part === 'F') {
      beginOpenQuestion();
      navigate('/f/practice', { state: { autostart: true } });
      return;
    }
    beginItem();
    navigate('/practice', { state: { autostart: true } });
  }

  function onDelete() {
    deleteAttempt(attempt!.id);
    navigate('/history');
  }

  const question = attempt.part === 'C' ? findQuestion(attempt.sentenceId) : undefined;
  const story = attempt.part === 'E' ? findStory(attempt.sentenceId) : undefined;
  const build = attempt.part === 'D' ? findBuild(attempt.sentenceId) : undefined;
  const covered = build ? coveredChunks(build.chunks, attempt.ops) : [];
  const near = attempt.part === 'C' && !correct && question ? closestAnswer(attempt.normalizedHeard, question.acceptableAnswers) : null;
  const partTitle =
    attempt.part === 'A'
      ? readingSet
        ? situationLabel(readingSet.id)
        : 'Situation'
      : attempt.part === 'C'
        ? 'Questions'
        : attempt.part === 'D'
          ? 'Sentence builds'
          : attempt.part === 'E'
            ? (story?.title ?? 'Story retelling')
            : attempt.part === 'F'
              ? 'Open questions'
              : attempt.part === 'B-read'
                ? 'Read along'
                : 'Repeat';
  const partPlace =
    attempt.part === 'A'
      ? partAPlace(attempt, readingSet)
      : attempt.part === 'C'
        ? question
          ? `${skillLabel(question.skill)} · ${answerTypeLabel(question.answerType)}`
          : 'Short answer'
        : attempt.part === 'E'
          ? story
            ? `${difficultyName(attempt.difficulty)} · ${story.points.length} points`
            : 'Story retelling'
          : attempt.part === 'F'
            ? openKindLabel(attempt.promptType ?? 'opinion')
            : `${difficultyName(attempt.difficulty)} · ${spokenWordCount(attempt.sentenceText)} words`;
  const itemName = attempt.part === 'E' ? '話' : attempt.part === 'F' ? '設問' : '問題';
  const missed = attempt.part === 'E' ? '要点が足りなかったので' : '間違えたので';
  const mastery = status?.mastered
    ? `${MASTER_STREAK}回連続で正解したので、この${itemName}は理解できたものとします。`
    : status?.checked
      ? `${missed}チェックが付いています。連続正解は ${status.streak}/${MASTER_STREAK} です。`
      : `連続正解は ${status?.streak ?? 0}/${MASTER_STREAK} です。`;

  return (
    <main className="page">
      <div className="result-head">
        <div>
          <p className="eyebrow">{partEyebrow(attempt.part)}</p>
          <h1>{partTitle}</h1>
          <p className="result-place">{partPlace}</p>
          <div className="verdict-row">
            {attempt.part === 'F' ? (
              <p
                className={!isOpenGraded(attempt) ? 'verdict' : attempt.overallScore >= OPEN_PASS ? 'verdict good' : 'verdict bad'}
                data-testid="verdict"
              >
                {!isOpenGraded(attempt) ? '未採点' : attempt.overallScore >= OPEN_PASS ? '70点以上' : '70点未満'}
              </p>
            ) : (
              <p className={correct ? 'verdict good' : 'verdict bad'} data-testid="verdict">
                {correct ? 'Correct' : 'Incorrect'}
              </p>
            )}
            {review && !review.unavailable && attempt.part !== 'F' ? (
              <p className={review.correct ? 'verdict good' : 'verdict bad'} data-testid="gemini-verdict">
                Gemini {review.correct ? 'Correct' : 'Incorrect'}
              </p>
            ) : null}
          </div>
        </div>
        <ScoreRing score={attempt.part === 'F' && !isOpenGraded(attempt) ? null : attempt.overallScore} />
      </div>
      {notice ? <p className="note">{notice}</p> : null}
      {progress && !progress.finished ? (
        <p className="muted" data-testid="session-progress">
          {attempt.part === 'E'
            ? `このセッションは ${progress.index}/${progress.size} 話です。${progress.size}話でまとめの採点を出します。`
            : `このセッションは ${progress.index}/${progress.size} 問です。${progress.size}問でまとめの採点を出します。`}
        </p>
      ) : null}
      {attempt.part === 'C' && startedLate(attempt.latencyMs, attempt.noResponse) ? (
        <p className="note">開始が遅いです。</p>
      ) : null}
      {attempt.part === 'F' && !attempt.noResponse && attempt.latencyMs != null && attempt.latencyMs >= 3000 ? (
        <p className="note">開始が遅いです。点には入っていません。</p>
      ) : null}
      {attempt.readOtherSentence ? (
        <p className="note">別の番号の文に近い読み方です。点数は指定された文だけで付けています。</p>
      ) : null}

      {attempt.part === 'F' && attempt.openFeedback ? (
        <section className="stats result-stats">
          <div>
            <span>課題達成</span>
            <strong>{attempt.openFeedback.taskCompletion}/4</strong>
          </div>
          <div>
            <span>語彙</span>
            <strong>{attempt.openFeedback.vocabulary}/4</strong>
          </div>
          <div>
            <span>一貫性</span>
            <strong>{attempt.openFeedback.coherence}/4</strong>
          </div>
          <div>
            <span>反応</span>
            <strong>{formatSeconds(attempt.latencyMs)}</strong>
          </div>
        </section>
      ) : (
      <section className="stats result-stats">
        <div>
          <span>Content</span>
          <strong>{attempt.contentScore}</strong>
        </div>
        <div>
          <span>Response</span>
          <strong>{formatSeconds(attempt.latencyMs)}</strong>
        </div>
        <div>
          <span>Time</span>
          <strong>{formatSeconds(attempt.hadSignal ? attempt.speakingMs : null)}</strong>
        </div>
        <div>
          <span>Rate</span>
          <strong>{attempt.wpm == null ? '—' : `${attempt.wpm}`}</strong>
        </div>
      </section>
      )}
      {attempt.part === 'F' ? (
        <p className="muted result-formula">課題達成 50%、語彙 25%、一貫性 25% です。反応の時間は点に入っていません。</p>
      ) : attempt.part === 'C' ? (
        <p className="muted result-formula">許容回答と完全に一致すれば 100、それ以外は 0 です。反応の時間は点に入っていません。</p>
      ) : attempt.part === 'E' ? (
        <p className="muted result-formula">要点が入った割合です。反応の時間は点に入っていません。</p>
      ) : (
        <p className="muted result-formula">
          Content {attempt.contentScore} × {attempt.latencyFactor.toFixed(2)} = {attempt.overallScore}
        </p>
      )}
      <p className="disclaimer">
        {attempt.part === 'F'
          ? '練習フィードバックです。本番ではこのパートは自動採点されません。公式のスコアではありません。'
          : '本番の Versant スコアではありません。ブラウザの点数に発音は入っていません。'}
      </p>

      {build ? (
        <section className="card playback">
          <h2>Phrases</h2>
          <div className="playback-row">
            <button
              type="button"
              className="play-btn"
              aria-label={speaking === 'prompt' ? 'Stop' : 'Play phrases'}
              onClick={() => void onReplay('prompt')}
            >
              {speaking === 'prompt' ? <StopIcon /> : <PlayIcon />}
            </button>
            <p lang="en">{build.chunks.join(' / ')}</p>
          </div>
        </section>
      ) : null}
      <section className="card playback">
        <h2>{attempt.part === 'C' || attempt.part === 'F' ? 'Question' : attempt.part === 'D' ? 'Sentence' : attempt.part === 'E' ? 'Story' : 'Answer'}</h2>
        <div className="playback-row">
          <button
            type="button"
            className="play-btn"
              aria-label={speaking === 'answer' ? 'Stop' : attempt.part === 'C' || attempt.part === 'F' ? 'Play question' : attempt.part === 'E' ? 'Play story' : 'Play answer'}
            onClick={() => void onReplay('answer')}
          >
            {speaking === 'answer' ? <StopIcon /> : <PlayIcon />}
          </button>
          <p lang="en">{attempt.sentenceText}</p>
        </div>
      </section>
      <section className="card playback">
        <h2>You</h2>
        <div className="playback-row">
          {attempt.audioDataUrl ? (
            <button
              type="button"
              className="play-btn"
              aria-label={clipPlaying ? 'Stop' : 'Play your recording'}
              onClick={onPlayClip}
            >
              {clipPlaying ? <StopIcon /> : <PlayIcon />}
            </button>
          ) : null}
          <p lang="en">{attempt.transcript.trim() || '(no words recognized)'}</p>
        </div>
        {attempt.part === 'C' ? (
          <p className="muted">
            比べた形: <span lang="en">{attempt.normalizedHeard || '(empty)'}</span>
          </p>
        ) : null}
        {attempt.audioDataUrl ? null : (
          <p className="muted">{attempt.audioSkippedReason ?? '音声は保存されていません。'}</p>
        )}
      </section>
      {attempt.part === 'F' ? (
        <section className="card" data-testid="open-feedback">
          <h2>Feedback</h2>
          <OpenFeedbackView attempt={attempt} />
          <OpenRescore attempt={attempt} onDone={setAttempt} />
        </section>
      ) : attempt.part === 'E' ? (
        <section className="card">
          <h2>Key points</h2>
          <p className="muted">ブラウザは、認識した言葉に下の手がかりがあるかを見ます。言い換えは、手がかりの語が無いと数えません。6割以上で正解です。</p>
          {attempt.storyPoints ? <StoryPoints points={attempt.storyPoints} /> : null}
        </section>
      ) : attempt.part === 'C' && question ? (
        <section className="card">
          <h2>Acceptable answers</h2>
          <p className="muted">このどれかと、上の比べた形が完全に一致すれば正解です。</p>
          <ul className="answer-list" data-testid="acceptable-answers">
            {question.acceptableAnswers.map((answer) => (
              <li key={answer} lang="en" className={attempt.matchedAnswer === answer ? 'matched' : undefined}>
                {answer}
              </li>
            ))}
          </ul>
          {near ? (
            <p className="note">
              近い答えは <span lang="en">{near}</span> です。
            </p>
          ) : null}
        </section>
      ) : (
        <section className="card">
          <h2>Words</h2>
          <p className="muted">小文字にし、I'm や don't などの短縮形を広げて比べています。um は無視します。</p>
          <WordDiff ops={attempt.ops} />
          {build ? (
            <>
              <p className="muted" data-testid="chunks-covered">
                {chunkNote(build.chunks, covered)}
              </p>
              {build.acceptableSentences.length > 1 ? (
                <>
                  <p className="muted">認められる文です。採用した文を強調しています。</p>
                  <ul className="answer-list">
                    {build.acceptableSentences.map((sentence) => (
                      <li key={sentence} lang="en" className={sentence === attempt.sentenceText ? 'matched' : undefined}>
                        {sentence}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : null}
        </section>
      )}
      {review && attempt.part !== 'F' ? (
        <section className="card" data-testid="gemini-detail">
          <h2>Gemini</h2>
          <p className="muted">セッションの録音を、保存した APIキーでまとめて聞いた結果です。</p>
          <GeminiHearing review={review} sentence={attempt.sentenceText} />
        </section>
      ) : null}
      <p className="muted" data-testid="mastery">
        {mastery}
      </p>
      {attempt.part === 'F' && attempt.countsForProgress === false ? (
        <p className="note">この回は採点が終わっていないので、チェックには入っていません。</p>
      ) : null}

      <div className="actions">
        <button type="button" className="btn" data-testid="next-sentence" onClick={onNext}>
          {nextLabel}
        </button>
        <Link to="/history" className="btn secondary">
          History
        </Link>
      </div>
      {confirming ? (
        <div className="actions">
          <button type="button" className="btn danger" onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="btn secondary" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="text-btn" onClick={() => setConfirming(true)}>
          Delete
        </button>
      )}
    </main>
  );
}

function partEyebrow(part: Attempt['part']): string {
  if (part === 'A') return 'Part A';
  if (part === 'C') return 'Part C';
  if (part === 'D') return 'Part D';
  if (part === 'E') return 'Part E';
  if (part === 'F') return 'Part F';
  return 'Part B';
}

function chunkNote(chunks: readonly string[], covered: readonly boolean[]): string {
  const ready = covered.filter(Boolean).length;
  const missing = chunks.filter((_, index) => !covered[index]);
  if (missing.length === 0) return '3つの句の内容語は、採用した文の一致に入っています。この診断は点数を変えません。';
  return `内容語が揃った句は ${ready}/${chunks.length} です。足りない句は「${missing.join(' / ')}」です。この診断は点数を変えません。`;
}

function difficultyName(difficulty: Attempt['difficulty']): string {
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'medium') return 'Medium';
  return 'Hard';
}

function partAPlace(attempt: Attempt, set: ReturnType<typeof findReadingSet>): string {
  const sentence = set?.sentences.find((item) => item.number === attempt.readingNumber);
  if (sentence) return `Group ${sentence.group} · ${sentence.number}`;
  if (attempt.readingNumber) return String(attempt.readingNumber);
  return '';
}

function ScoreRing({ score }: { score: number | null }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const progress = score == null ? 0 : Math.min(1, Math.max(0, score / 100));
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
      <strong>{score == null ? '—' : score}</strong>
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
  if (attempt.part === 'F') {
    if (attempt.geminiStatus === 'not_used') {
      return attempt.hadSignal
        ? '音は検出されましたが、言葉として認識できなかったので 0 です。Gemini は呼んでいません。'
        : '回答が空だったので 0 です。Gemini は呼んでいません。';
    }
    if (attempt.geminiStatus === 'no_key') return 'APIキーが無いので、文字起こしだけ残しています。';
    if (attempt.geminiStatus === 'error') return '採点の通信に失敗しました。もう一度採点できます。';
    if (attempt.geminiStatus === 'invalid_json') return '結果の形が不正だったので、点は付けていません。もう一度採点できます。';
    if (attempt.geminiStatus == null) return 'まだ採点していません。';
    return null;
  }
  if (attempt.noResponse) {
    const seconds = attempt.part === 'E' ? STORY_START_LIMIT_MS / 1000 : 6;
    return `合図から${seconds}秒以内に話し始めなかったため、無回答です。`;
  }
  if (!attempt.normalizedHeard) {
    return attempt.part === 'C'
      ? '音は検出されましたが、答えとして認識できませんでした。'
      : attempt.part === 'E'
        ? '音は検出されましたが、話として認識できませんでした。'
        : '音は検出されましたが、文として認識できませんでした。';
  }
  return null;
}
