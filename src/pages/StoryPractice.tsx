import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExamModeContext } from '../components/exam-mode';
import type { Story } from '../data/stories';
import { captureResponse, type CaptureTick } from '../lib/capture';
import { blobToDataUrl } from '../lib/format';
import { appendPracticeAttempt, loadPracticeRun, openPracticeRun, practiceRunSize } from '../lib/practice-run';
import { answerWordsPerMinute } from '../lib/short-answer';
import { ensureMic, getAudioContext, playBeep, releaseMic, wait } from '../lib/speech';
import { beginStory, cancelStory, peekStory, type StoryLive } from '../lib/story-session';
import { scoreStory, STORY_RESPONSE_MS, STORY_SILENCE_MS, STORY_START_LIMIT_MS } from '../lib/story-score';
import { saveAttempt } from '../lib/storage';
import type { Attempt } from '../types';

type Phase = 'listen' | 'cue' | 'respond' | 'saving' | 'listen-failed';

const INITIAL_TICK: CaptureTick = {
  remainingMs: STORY_RESPONSE_MS,
  startRemainingMs: STORY_START_LIMIT_MS,
  started: false,
  interim: '',
};

export function StoryPractice() {
  const navigate = useNavigate();
  const location = useLocation();
  const autostart = Boolean((location.state as { autostart?: boolean } | null)?.autostart);
  const { setExam } = useContext(ExamModeContext);
  const [story, setStory] = useState<Story | null>(() => (autostart ? (peekStory()?.story ?? null) : null));
  const [place, setPlace] = useState(1);
  const [phase, setPhase] = useState<Phase>('listen');
  const [tick, setTick] = useState<CaptureTick>(INITIAL_TICK);
  const [aborting, setAborting] = useState(false);
  const mounted = useRef(true);
  const runId = useRef(0);
  const manualStop = useRef<(() => void) | null>(null);
  const sessionSize = practiceRunSize('E');

  useEffect(() => {
    setExam(true);
    return () => setExam(false);
  }, [setExam]);

  useEffect(() => {
    return () => {
      mounted.current = false;
      cancelStory();
      releaseMic();
    };
  }, []);

  async function continueSession(session: StoryLive, allowMic: boolean) {
    const id = ++runId.current;
    const alive = () => mounted.current && !session.cancelled && runId.current === id;
    setStory(session.story);
    setPlace((loadPracticeRun()?.attemptIds.length ?? 0) + 1);
    setPhase('listen');
    setTick(INITIAL_TICK);
    setAborting(false);
    const micPromise = allowMic ? ensureMic() : Promise.resolve(null);
    const cue = await session.cue;
    if (!alive()) return;
    if (cue !== 'spoken') {
      setPhase('listen-failed');
      return;
    }
    await wait(220);
    if (!alive()) return;
    setPhase('cue');
    await playBeep();
    await wait(480);
    if (!alive()) return;
    const mic = await micPromise;
    if (!alive()) return;
    setPhase('respond');
    const captured = await captureResponse({
      stream: mic,
      isCancelled: () => !alive(),
      onTick: (next) => {
        if (alive()) setTick(next);
      },
      manualStop,
      responseMs: STORY_RESPONSE_MS,
      startLimitMs: STORY_START_LIMIT_MS,
      silenceMs: STORY_SILENCE_MS,
    });
    if (!alive() || !captured) return;
    setPhase('saving');
    const scored = scoreStory(captured.transcript, session.story.points, captured.noResponse);
    let audioDataUrl: string | undefined;
    let audioSkippedReason: string | undefined;
    if (!captured.audioBlob) {
      if (!mic) audioSkippedReason = 'マイクがないため、自分の声は残せませんでした。';
    } else {
      try {
        audioDataUrl = await blobToDataUrl(captured.audioBlob);
      } catch {
        audioSkippedReason = '音声の保存に失敗しました。';
      }
    }
    if (!alive()) return;
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      sentenceId: session.story.id,
      sentenceText: session.story.text,
      difficulty: session.story.difficulty,
      transcript: captured.transcript,
      normalizedTarget: '',
      normalizedHeard: scored.normalizedHeard,
      noResponse: captured.noResponse,
      hadSignal: captured.hadSignal,
      micAvailable: Boolean(mic),
      recognitionAvailable: captured.recognitionAvailable,
      recognitionBlocked: captured.recognitionBlocked,
      end: captured.end,
      latencyMs: captured.latencyMs,
      speakingMs: captured.speakingMs,
      elapsedMs: captured.elapsedMs,
      wpm: answerWordsPerMinute(captured.transcript, captured.speakingMs, captured.noResponse),
      contentScore: scored.score,
      latencyFactor: captured.noResponse ? 0 : 1,
      overallScore: scored.score,
      correct: scored.correct,
      part: 'E',
      storyPoints: scored.points,
      ops: [],
      audioDataUrl,
      audioSkippedReason,
    };
    const saved = saveAttempt(attempt);
    if (!alive()) return;
    const run = appendPracticeAttempt('E', saved.id);
    if (run.closed) {
      navigate('/session', { replace: true });
      return;
    }
    const next = beginStory();
    void continueSession(next, allowMic && Boolean(mic));
  }

  useEffect(() => {
    const existing = autostart ? peekStory() : null;
    if (existing) {
      void continueSession(existing, true);
      return;
    }
    getAudioContext();
    openPracticeRun('E');
    void continueSession(beginStory(), true);
    // The click that opened this page already unlocked audio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function retryListen() {
    if (!story) return;
    void continueSession(beginStory(story.id), true);
  }

  const seconds = Math.ceil(tick.remainingMs / 1000);
  const startSeconds = Math.ceil(tick.startRemainingMs / 1000);
  return (
    <div className="exam-shell">
      <div className="exam-bar">
        <span>
          Part E · Story retelling · {place}/{sessionSize}
        </span>
        <button type="button" className="text-btn" onClick={() => setAborting(true)}>
          Stop
        </button>
      </div>
      <section className="exam" data-phase={phase} data-testid="phase">
        <p className="eyebrow">{phase === 'listen' ? 'Listen' : phase === 'cue' ? 'Cue' : phase === 'listen-failed' ? 'Voice' : 'Speak'}</p>
        <h1>
          {phase === 'listen' ? 'Listen' : phase === 'cue' ? 'Go' : phase === 'saving' ? 'Saving' : phase === 'listen-failed' ? 'Replay' : 'Speak'}
        </h1>
        {phase === 'listen' ? <SoundBars /> : null}
        {phase === 'listen' ? <p className="muted">話は一度だけ読まれます。画面には出しません。</p> : null}
        {phase === 'cue' ? <p className="cue">合図のあと、自分の言葉で話してください。</p> : null}
        {phase === 'listen-failed' ? (
          <>
            <p className="note">話を読み上げられませんでした。もう一度再生してください。</p>
            <button type="button" className="btn" data-testid="retry-story" onClick={retryListen}>
              Play again
            </button>
          </>
        ) : null}
        {phase === 'respond' || phase === 'saving' ? (
          <>
            <TimerRing remainingMs={tick.remainingMs} urgent={seconds <= 5} />
            {!tick.started && phase === 'respond' ? (
              <p className={startSeconds <= 2 ? 'start-limit warn-text' : 'start-limit'}>話し始めまで {startSeconds} 秒</p>
            ) : (
              <p className="start-limit">自分の言葉で、話の要点を話してください。</p>
            )}
            <p className="caption" lang="en" data-testid="live-caption">
              {tick.interim || '話し始めると、ここに認識した文字が出ます。'}
            </p>
            <button type="button" className="btn secondary" data-testid="finish-speaking" onClick={() => manualStop.current?.()}>
              Done
            </button>
          </>
        ) : null}
      </section>
      {aborting ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="abort-title">
            <h2 id="abort-title">Stop this story?</h2>
            <p>この話は記録しません。ここまでに終えた話は残ります。</p>
            <div className="actions">
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  cancelStory();
                  navigate('/e');
                }}
              >
                Stop
              </button>
              <button type="button" className="btn secondary" onClick={() => setAborting(false)}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SoundBars() {
  return (
    <div className="bars" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function TimerRing({ remainingMs, urgent }: { remainingMs: number; urgent: boolean }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, remainingMs / STORY_RESPONSE_MS));
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <div className={urgent ? 'timer urgent' : 'timer'} data-testid="timer">
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
      <strong>{seconds}</strong>
    </div>
  );
}
