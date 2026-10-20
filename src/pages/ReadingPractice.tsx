import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReadingBoard } from '../components/ReadingBoard';
import { ExamModeContext } from '../components/exam-mode';
import { captureResponse, type CaptureTick } from '../lib/capture';
import { blobToDataUrl } from '../lib/format';
import { isRepeatCorrect } from '../lib/progress';
import { likelyReadAnother } from '../lib/reading-score';
import { appendPracticeAttempt, openPracticeRun } from '../lib/practice-run';
import { beginReading, beginReadingSet, cancelReading, nextAskNumber, peekReading, selectReadingSet, type ReadingLive } from '../lib/reading-session';
import { scoreRepeat } from '../lib/score';
import {
  ensureMic,
  getAudioContext,
  listenFor,
  playBeep,
  recognitionSupported,
  releaseMic,
  wait,
} from '../lib/speech';
import { loadAttempts, saveAttempt } from '../lib/storage';
import type { Attempt } from '../types';

type Phase = 'number' | 'cue' | 'respond' | 'saving' | 'cue-failed';

const INITIAL_TICK: CaptureTick = {
  remainingMs: 15_000,
  startRemainingMs: 6_000,
  started: false,
  interim: '',
};

export function ReadingPractice() {
  const navigate = useNavigate();
  const location = useLocation();
  const autostart = Boolean((location.state as { autostart?: boolean } | null)?.autostart);
  const { setExam } = useContext(ExamModeContext);
  const supported = recognitionSupported();
  const [step, setStep] = useState<'mic' | 'run'>(autostart && peekReading() ? 'run' : 'mic');
  const [phase, setPhase] = useState<Phase>('number');
  const [live, setLive] = useState<ReadingLive | null>(() => peekReading());
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
      cancelReading();
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

  async function continueSession(session: ReadingLive, allowMic: boolean) {
    const id = ++runId.current;
    const alive = () => mounted.current && !session.cancelled && runId.current === id;
    setLive(session);
    setStep('run');
    setPhase('number');
    setTick(INITIAL_TICK);
    setAborting(false);
    const micPromise = allowMic ? ensureMic() : Promise.resolve(null);
    const cue = await session.cue;
    if (!alive()) return;
    if (cue !== 'spoken') {
      setPhase('cue-failed');
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
    const scored = scoreRepeat(session.item.text, captured.transcript, {
      noResponse: captured.noResponse,
      latencyMs: captured.latencyMs,
      speakingMs: captured.speakingMs,
    });
    const others = session.set.sentences.filter((item) => item.id !== session.item.id).map((item) => item.text);
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
      sentenceId: session.item.id,
      sentenceText: session.item.text,
      difficulty: 'medium',
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
      part: 'A',
      readingSetId: session.set.id,
      readingNumber: session.item.number,
      readingAskOrder: session.askOrder,
      continueSet: session.continueSet,
      readOtherSentence: likelyReadAnother(session.item.text, captured.transcript, others),
      ops: scored.ops,
      audioDataUrl,
      audioSkippedReason,
    };
    const saved = saveAttempt(attempt);
    if (!alive()) return;
    if (!session.continueSet) {
      navigate(`/history/${saved.id}`, { replace: true });
      return;
    }
    const setComplete = nextAskNumber(session.askOrder, session.item.number) == null;
    const run = appendPracticeAttempt('A', saved.id, setComplete);
    navigate(run.closed ? '/session' : `/history/${saved.id}`, { replace: true });
  }

  useEffect(() => {
    if (!autostart) return;
    const session = peekReading();
    if (!session) return;
    void continueSession(session, true);
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
    openPracticeRun('A');
    const set = selectReadingSet(loadAttempts());
    const session = beginReadingSet(set.id);
    void continueSession(session, allowMic);
  }

  function retryCue() {
    if (!live) return;
    const session = beginReading(live.set.id, live.item.number, live.continueSet, live.askOrder);
    void continueSession(session, true);
  }

  if (step === 'run' && live) {
    const seconds = Math.ceil(tick.remainingMs / 1000);
    const startSeconds = Math.ceil(tick.startRemainingMs / 1000);
    return (
      <div className="exam-shell">
        <div className="exam-bar">
          <span>
            Part A · {live.set.title} · {live.item.number}番 · {Math.max(1, live.askOrder.indexOf(live.item.number) + 1)} / {live.askOrder.length}
          </span>
          <button type="button" className="text-btn" onClick={() => setAborting(true)}>
            中断
          </button>
        </div>
        <section className="exam reading" data-phase={phase} data-testid="phase">
          <p className="eyebrow">
            {phase === 'number' ? '番号' : phase === 'cue' ? '合図' : phase === 'cue-failed' ? '音声' : '音読'}
          </p>
          <h1>
            {phase === 'number'
              ? '番号を聞いてください'
              : phase === 'cue'
                ? '読み始めてください'
                : phase === 'cue-failed'
                  ? '番号を読み上げられませんでした'
                  : phase === 'saving'
                    ? '記録しています'
                    : `${live.item.number}番を読んでください`}
          </h1>
          {phase === 'respond' || phase === 'saving' ? (
            <p className="reading-number" data-testid="reading-number">
              {live.item.number}
            </p>
          ) : null}
          {phase === 'cue-failed' ? (
            <button type="button" className="btn" onClick={retryCue}>
              番号をもう一度読む
            </button>
          ) : null}
          {phase === 'respond' || phase === 'saving' ? (
            <>
              <TimerRing remainingMs={tick.remainingMs} urgent={seconds <= 5} />
              {!tick.started && phase === 'respond' ? (
                <p className={startSeconds <= 2 ? 'start-limit warn-text' : 'start-limit'}>
                  読み始めまで {startSeconds} 秒
                </p>
              ) : (
                <p className="start-limit">指定された番号の文を、そのまま読んでください。</p>
              )}
              <p className="caption" lang="en" data-testid="live-caption">
                {tick.interim || '読み始めると、ここに認識した文字が出ます。'}
              </p>
              <button type="button" className="btn secondary" data-testid="finish-speaking" onClick={() => manualStop.current?.()}>
                読み終えた
              </button>
            </>
          ) : null}
          <ReadingBoard set={live.set} />
        </section>
        {aborting ? (
          <div className="dialog-backdrop">
            <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="abort-title">
              <h2 id="abort-title">この問題を中断しますか？</h2>
              <p>ここまでの回答は記録されません。</p>
              <div className="actions">
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    cancelReading();
                    navigate('/a');
                  }}
                >
                  中断する
                </button>
                <button type="button" className="btn secondary" onClick={() => setAborting(false)}>
                  続ける
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
      <p className="eyebrow">Part A · 準備</p>
      <h1>マイクの確認</h1>
      <p className="lede">番号が読まれたら、画面のその文をそのまま読んでください。採点には Chrome の音声認識を使います。</p>
      {!supported ? (
        <p className="note">このブラウザでは音声認識が使えません。Chrome で開くと、読んだ文を採点できます。</p>
      ) : null}
      {micError ? <p className="note">{micError}</p> : null}
      {stream ? (
        <section className="card">
          <h2>入力レベル</h2>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <p className="muted">バーが動けば、マイクは入っています。</p>
          <div className="actions">
            <button type="button" className="btn secondary" onClick={onTestMic}>
              {testing ? '聞き取りを止める' : '試しに話す'}
            </button>
          </div>
          <p className="caption" lang="en">{testing && !testText ? 'I like tea. と言ってみてください。' : testText || 'まだ認識していません。'}</p>
        </section>
      ) : (
        <div className="actions">
          <button type="button" className="btn" data-testid="enable-mic" onClick={onEnableMic}>
            マイクをオンにする
          </button>
        </div>
      )}
      {stream && supported ? (
        <div className="actions">
          <button type="button" className="btn" data-testid="begin-reading" onClick={() => onBegin(true)}>
            セットを始める
          </button>
        </div>
      ) : null}
      {micFailed || !supported ? (
        <div className="actions">
          <button type="button" className="btn secondary" onClick={() => onBegin(false)}>
            番号を聞くだけ始める
          </button>
        </div>
      ) : null}
    </main>
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
