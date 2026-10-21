import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExamModeContext } from '../components/exam-mode';
import { captureResponse, type CaptureTick } from '../lib/capture';
import { blobToDataUrl } from '../lib/format';
import { isRepeatCorrect } from '../lib/progress';
import { scoreRepeat } from '../lib/score';
import { appendPracticeAttempt, openPracticeRun } from '../lib/practice-run';
import { beginItem, cancelActive, INSTRUCTION, peekActive, type LiveSession } from '../lib/session';
import { ensureMic, getAudioContext, playBeep, releaseMic, wait } from '../lib/speech';
import { saveAttempt } from '../lib/storage';
import type { Attempt, Sentence } from '../types';

type Phase = 'instruction' | 'listen' | 'cue' | 'respond' | 'saving';

const INITIAL_TICK: CaptureTick = {
  remainingMs: 15_000,
  startRemainingMs: 6_000,
  started: false,
  interim: '',
};

export function Practice({ visible = false }: { visible?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const autostart = Boolean((location.state as { autostart?: boolean } | null)?.autostart);
  const { setExam } = useContext(ExamModeContext);
  const [prompt, setPrompt] = useState<Sentence | null>(() => (autostart ? (peekActive()?.sentence ?? null) : null));
  const [showText, setShowText] = useState(visible);
  const [phase, setPhase] = useState<Phase>('instruction');
  const [tick, setTick] = useState<CaptureTick>(INITIAL_TICK);
  const [aborting, setAborting] = useState(false);
  const mounted = useRef(true);
  const runId = useRef(0);
  const manualStop = useRef<(() => void) | null>(null);

  useEffect(() => {
    setExam(true);
    return () => setExam(false);
  }, [setExam]);

  useEffect(() => {
    return () => {
      mounted.current = false;
      cancelActive();
      releaseMic();
    };
  }, []);

  async function continueSession(session: LiveSession, allowMic: boolean) {
    const id = ++runId.current;
    const alive = () => mounted.current && !session.cancelled && runId.current === id;
    setPrompt(session.sentence);
    setShowText(session.visible);
    setPhase(session.visible ? 'listen' : 'instruction');
    setTick(INITIAL_TICK);
    setAborting(false);
    session.onPhase = (next) => {
      if (alive()) setPhase(next);
    };
    const micPromise = allowMic ? ensureMic() : Promise.resolve(null);
    await session.intro;
    if (!alive()) return;
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
    const scored = scoreRepeat(session.sentence.text, captured.transcript, {
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
      sentenceId: session.sentence.id,
      sentenceText: session.sentence.text,
      difficulty: session.sentence.difficulty,
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
      correct: isRepeatCorrect(scored.ops, captured.noResponse),
      part: session.visible ? 'B-read' : 'B',
      ops: scored.ops,
      audioDataUrl,
      audioSkippedReason,
    };
    const saved = saveAttempt(attempt);
    if (!alive()) return;
    const run = appendPracticeAttempt(session.visible ? 'B-read' : 'B', saved.id);
    if (run.closed) {
      navigate('/session', { replace: true });
      return;
    }
    const next = beginItem(undefined, session.visible);
    void continueSession(next, allowMic && Boolean(mic));
  }

  useEffect(() => {
    const existing = autostart ? peekActive() : null;
    if (existing) {
      void continueSession(existing, true);
      return;
    }
    getAudioContext();
    openPracticeRun(visible ? 'B-read' : 'B');
    void continueSession(beginItem(undefined, visible), true);
    // Start once when this page opens. The click that landed here already unlocked audio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seconds = Math.ceil(tick.remainingMs / 1000);
  const startSeconds = Math.ceil(tick.startRemainingMs / 1000);
  return (
      <div className="exam-shell">
        <div className="exam-bar">
          <span>{showText ? 'Part B · Read along' : 'Part B · Repeat'}</span>
          <button type="button" className="text-btn" onClick={() => setAborting(true)}>
            Stop
          </button>
        </div>
        <section className="exam" data-phase={phase} data-testid="phase">
          <p className="eyebrow">
            {phase === 'instruction' ? 'Instruction' : phase === 'listen' ? 'Listen' : phase === 'cue' ? 'Cue' : 'Speak'}
          </p>
          <h1>
            {phase === 'instruction'
              ? 'Listen'
              : phase === 'listen'
                ? 'Listen'
                : phase === 'cue'
                  ? 'Go'
                  : phase === 'saving'
                    ? 'Saving'
                    : 'Speak'}
          </h1>
          {showText && prompt ? (
            <p className="prompt-sentence" lang="en" data-testid="prompt-sentence">
              {prompt.text}
            </p>
          ) : null}
          {phase === 'instruction' && !showText ? (
            <p className="instruction" lang="en">
              {INSTRUCTION}
            </p>
          ) : null}
          {phase === 'listen' || (phase === 'instruction' && !showText) ? <SoundBars /> : null}
          {phase === 'listen' ? (
            <p className="muted">
              {showText
                ? 'いま読まれている文です。読み終わったら、見ながら読んでください。'
                : '英文は一度だけ読まれます。画面には出しません。'}
            </p>
          ) : null}
          {phase === 'cue' ? (
            <p className="cue">{showText ? '合図のあと、画面の文を読んでください。' : '合図のあと、聞こえた文をそのまま言ってください。'}</p>
          ) : null}
          {phase === 'respond' || phase === 'saving' ? (
            <>
              <TimerRing remainingMs={tick.remainingMs} urgent={seconds <= 5} />
              {!tick.started && phase === 'respond' ? (
                <p className={startSeconds <= 2 ? 'start-limit warn-text' : 'start-limit'}>
                  話し始めまで {startSeconds} 秒
                </p>
              ) : (
                <p className="start-limit">{showText ? '画面の文を、そのまま読んでください。' : '聞こえた文を、そのまま繰り返してください。'}</p>
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
              <p>ここまでの回答は記録されません。</p>
              <div className="actions">
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    cancelActive();
                    navigate('/b');
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
