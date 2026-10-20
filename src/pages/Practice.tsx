import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExamModeContext } from '../components/exam-mode';
import { captureResponse, type CaptureTick } from '../lib/capture';
import { blobToDataUrl } from '../lib/format';
import { isRepeatCorrect } from '../lib/progress';
import { scoreRepeat } from '../lib/score';
import { appendPracticeAttempt, openPracticeRun } from '../lib/practice-run';
import { beginItem, cancelActive, INSTRUCTION, peekActive, type LiveSession } from '../lib/session';
import {
  ensureMic,
  getAudioContext,
  listenFor,
  playBeep,
  recognitionSupported,
  releaseMic,
  wait,
} from '../lib/speech';
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
  const supported = recognitionSupported();
  const [step, setStep] = useState<'mic' | 'run'>(autostart && peekActive() ? 'run' : 'mic');
  const [prompt, setPrompt] = useState<Sentence | null>(() => (autostart ? (peekActive()?.sentence ?? null) : null));
  const [showText, setShowText] = useState(() => Boolean(autostart && peekActive()?.visible));
  const [phase, setPhase] = useState<Phase>('instruction');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);
  const [micFailed, setMicFailed] = useState(false);
  const [micError, setMicError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testText, setTestText] = useState('');
  const [tick, setTick] = useState<CaptureTick>(INITIAL_TICK);
  const [aborting, setAborting] = useState(false);
  const mounted = useRef(true);
  const runId = useRef(0);
  const manualStop = useRef<(() => void) | null>(null);
  const stopTest = useRef<(() => void) | null>(null);

  useEffect(() => {
    setExam(step === 'run');
    return () => setExam(false);
  }, [setExam, step]);

  useEffect(() => {
    return () => {
      mounted.current = false;
      stopTest.current?.();
      cancelActive();
      releaseMic();
    };
  }, []);

  useEffect(() => {
    if (step !== 'mic' || !stream) return;
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const value of samples) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }
      setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 5));
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
    };
  }, [step, stream]);

  async function continueSession(session: LiveSession, allowMic: boolean) {
    const id = ++runId.current;
    const alive = () => mounted.current && !session.cancelled && runId.current === id;
    setPrompt(session.sentence);
    setShowText(session.visible);
    setStep('run');
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
    navigate(run.closed ? '/session' : `/history/${saved.id}`, { replace: true });
  }

  useEffect(() => {
    if (!autostart) return;
    const session = peekActive();
    if (!session) return;
    void continueSession(session, true);
    // The launch click already started this session. Run it once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart]);

  function onEnableMic() {
    setMicError('');
    void ensureMic().then((next) => {
      if (!mounted.current) return;
      if (!next) {
        setMicFailed(true);
        setMicError('マイクを使えません。ブラウザのサイト設定でマイクを許可してください。');
        return;
      }
      getAudioContext();
      setStream(next);
      setMicFailed(false);
    });
  }

  function onTestMic() {
    if (testing) {
      stopTest.current?.();
      stopTest.current = null;
      setTesting(false);
      return;
    }
    setTestText('');
    setTesting(true);
    stopTest.current = listenFor(4000, setTestText);
    window.setTimeout(() => {
      if (!mounted.current) return;
      stopTest.current?.();
      stopTest.current = null;
      setTesting(false);
    }, 4000);
  }

  function onBegin(allowMic: boolean) {
    getAudioContext();
    openPracticeRun(visible ? 'B-read' : 'B');
    const session = beginItem(undefined, visible);
    void continueSession(session, allowMic);
  }

  if (step === 'run') {
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

  return (
    <main className="page">
      <p className="eyebrow">Setup</p>
      <h1>Microphone</h1>
      <p className="lede">
        {visible
          ? '最初に英文が読まれます。文は画面に出たままなので、そのあと見ながら読んでください。'
          : '静かな場所で、ふだんの声ではっきり話してください。採点は Chrome の音声認識を使います。'}
      </p>
      {!supported ? (
        <p className="note">このブラウザでは音声認識が使えません。Chrome で開くと、繰り返した文を採点できます。</p>
      ) : null}
      {micError ? <p className="note">{micError}</p> : null}
      {stream ? (
        <section className="card">
          <h2>Level</h2>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <p className="muted">バーが動けば、マイクは入っています。</p>
          <div className="actions">
            <button type="button" className="btn secondary" onClick={onTestMic}>
              {testing ? 'Stop' : 'Try speaking'}
            </button>
          </div>
          <p className="caption" lang="en">
            {testing && !testText ? 'I like tea. と言ってみてください。' : testText || 'まだ認識していません。'}
          </p>
        </section>
      ) : (
        <div className="actions">
          <button type="button" className="btn" data-testid="enable-mic" onClick={onEnableMic}>
            Turn mic on
          </button>
        </div>
      )}
      {stream && supported ? (
        <div className="actions">
          <button type="button" className="btn" data-testid="begin" onClick={() => onBegin(true)}>
            Start
          </button>
        </div>
      ) : null}
      {micFailed || !supported ? (
        <div className="actions">
          <button type="button" className="btn secondary" data-testid="begin-without-mic" onClick={() => onBegin(false)}>
            Listen only
          </button>
        </div>
      ) : null}
      {micFailed || !supported ? (
        <p className="muted">マイクなしで始めると、6秒後に無回答として記録されます。</p>
      ) : null}
    </main>
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
