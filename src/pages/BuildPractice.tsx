import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExamModeContext } from '../components/exam-mode';
import type { SentenceBuild } from '../data/builds';
import { beginBuild, cancelBuild, peekBuild, type BuildLive } from '../lib/build-session';
import { captureResponse, type CaptureTick } from '../lib/capture';
import { blobToDataUrl } from '../lib/format';
import { appendPracticeAttempt, loadPracticeRun, openPracticeRun, practiceRunSize } from '../lib/practice-run';
import { scoreSentenceBuild } from '../lib/sentence-build';
import { ensureMic, getAudioContext, playBeep, releaseMic, wait } from '../lib/speech';
import { saveAttempt } from '../lib/storage';
import type { Attempt } from '../types';

type Phase = 'listen' | 'cue' | 'respond' | 'saving' | 'listen-failed';

const INITIAL_TICK: CaptureTick = {
  remainingMs: 15_000,
  startRemainingMs: 6_000,
  started: false,
  interim: '',
};

export function BuildPractice() {
  const navigate = useNavigate();
  const location = useLocation();
  const autostart = Boolean((location.state as { autostart?: boolean } | null)?.autostart);
  const { setExam } = useContext(ExamModeContext);
  const [build, setBuild] = useState<SentenceBuild | null>(() => (autostart ? (peekBuild()?.build ?? null) : null));
  const [place, setPlace] = useState(1);
  const [phase, setPhase] = useState<Phase>('listen');
  const [tick, setTick] = useState<CaptureTick>(INITIAL_TICK);
  const [aborting, setAborting] = useState(false);
  const mounted = useRef(true);
  const runId = useRef(0);
  const manualStop = useRef<(() => void) | null>(null);
  const sessionSize = practiceRunSize('D');

  useEffect(() => {
    setExam(true);
    return () => setExam(false);
  }, [setExam]);

  useEffect(() => {
    return () => {
      mounted.current = false;
      cancelBuild();
      releaseMic();
    };
  }, []);

  async function continueSession(session: BuildLive, allowMic: boolean) {
    const id = ++runId.current;
    const alive = () => mounted.current && !session.cancelled && runId.current === id;
    setBuild(session.build);
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
    });
    if (!alive() || !captured) return;
    setPhase('saving');
    const scored = scoreSentenceBuild(captured.transcript, session.build.acceptableSentences, session.build.chunks, {
      noResponse: captured.noResponse,
      latencyMs: captured.latencyMs,
      speakingMs: captured.speakingMs,
    });
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
      sentenceId: session.build.id,
      sentenceText: scored.acceptedSentence,
      difficulty: session.build.difficulty,
      transcript: captured.transcript,
      normalizedTarget: scored.normalizedTarget,
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
      wpm: scored.wpm,
      contentScore: scored.contentScore,
      latencyFactor: scored.latencyFactor,
      overallScore: scored.overallScore,
      correct: scored.correct,
      part: 'D',
      ops: scored.ops,
      audioDataUrl,
      audioSkippedReason,
    };
    const saved = saveAttempt(attempt);
    if (!alive()) return;
    const run = appendPracticeAttempt('D', saved.id);
    if (run.closed) {
      navigate('/session', { replace: true });
      return;
    }
    const next = beginBuild();
    void continueSession(next, allowMic && Boolean(mic));
  }

  useEffect(() => {
    const existing = autostart ? peekBuild() : null;
    if (existing) {
      void continueSession(existing, true);
      return;
    }
    getAudioContext();
    openPracticeRun('D');
    void continueSession(beginBuild(), true);
    // The click that opened this page already unlocked audio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function retryListen() {
    if (!build) return;
    void continueSession(beginBuild(build.id), true);
  }

  const seconds = Math.ceil(tick.remainingMs / 1000);
  const startSeconds = Math.ceil(tick.startRemainingMs / 1000);
  return (
    <div className="exam-shell">
      <div className="exam-bar">
        <span>
          Part D · Sentence builds · {place}/{sessionSize}
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
        {phase === 'listen' ? <p className="muted">3つの句は一度だけ読まれます。画面には出しません。</p> : null}
        {phase === 'cue' ? <p className="cue">合図のあと、1つの文に並べて話してください。</p> : null}
        {phase === 'listen-failed' ? (
          <>
            <p className="note">句を読み上げられませんでした。もう一度再生してください。</p>
            <button type="button" className="btn" data-testid="retry-build" onClick={retryListen}>
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
              <p className="start-limit">聞こえた句を、1つの文にしてください。</p>
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
            <h2 id="abort-title">Stop this item?</h2>
            <p>この問は記録しません。ここまでに終えた問は残ります。</p>
            <div className="actions">
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  cancelBuild();
                  navigate('/d');
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
  const progress = Math.min(1, Math.max(0, remainingMs / 15_000));
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
