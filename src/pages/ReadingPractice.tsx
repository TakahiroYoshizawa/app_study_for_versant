import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReadingBoard } from '../components/ReadingBoard';
import { situationLabel } from '../data/readings';
import { ExamModeContext } from '../components/exam-mode';
import { captureResponse, type CaptureTick } from '../lib/capture';
import { blobToDataUrl } from '../lib/format';
import { isRepeatCorrect } from '../lib/progress';
import { likelyReadAnother } from '../lib/reading-score';
import { appendPracticeAttempt, openPracticeRun } from '../lib/practice-run';
import { beginReading, beginReadingSet, cancelReading, nextAskNumber, peekReading, selectReadingSet, type ReadingLive } from '../lib/reading-session';
import { scoreRepeat } from '../lib/score';
import { ensureMic, getAudioContext, playBeep, releaseMic, wait } from '../lib/speech';
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
  const [phase, setPhase] = useState<Phase>('number');
  const [live, setLive] = useState<ReadingLive | null>(() => (autostart ? peekReading() : null));
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
      cancelReading();
      releaseMic();
    };
  }, []);

  async function continueSession(session: ReadingLive, allowMic: boolean) {
    const id = ++runId.current;
    const alive = () => mounted.current && !session.cancelled && runId.current === id;
    setLive(session);
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
    const upcoming = nextAskNumber(session.askOrder, session.item.number);
    const run = appendPracticeAttempt('A', saved.id, upcoming == null);
    if (upcoming != null && !run.closed) {
      const next = beginReading(session.set.id, upcoming, true, session.askOrder);
      void continueSession(next, allowMic && Boolean(mic));
      return;
    }
    navigate('/session', { replace: true });
  }

  useEffect(() => {
    const existing = autostart ? peekReading() : null;
    if (existing) {
      void continueSession(existing, true);
      return;
    }
    getAudioContext();
    openPracticeRun('A');
    const set = selectReadingSet(loadAttempts());
    void continueSession(beginReadingSet(set.id), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function retryCue() {
    if (!live) return;
    const session = beginReading(live.set.id, live.item.number, live.continueSet, live.askOrder);
    void continueSession(session, true);
  }

  if (!live) {
    return <div className="exam-shell" data-testid="phase" />;
  }

  const seconds = Math.ceil(tick.remainingMs / 1000);
  const startSeconds = Math.ceil(tick.startRemainingMs / 1000);
  return (
      <div className="exam-shell">
        <div className="exam-bar">
          <span>
            Part A · {situationLabel(live.set.id)} · {live.item.number} · {Math.max(1, live.askOrder.indexOf(live.item.number) + 1)}/{live.askOrder.length}
          </span>
          <button type="button" className="text-btn" onClick={() => setAborting(true)}>
            Stop
          </button>
        </div>
        <ReadingStatus
          number={live.item.number}
          remainingMs={phase === 'respond' || phase === 'saving' ? tick.remainingMs : null}
          urgent={seconds <= 5 && (phase === 'respond' || phase === 'saving')}
          hint={
            phase === 'respond' && !tick.started
              ? `読み始めまで ${startSeconds} 秒`
              : phase === 'respond' || phase === 'saving'
                ? '指定された番号の文を、そのまま読んでください。'
                : phase === 'number'
                  ? '番号を聞いてください。'
                  : phase === 'cue'
                    ? '合図のあと、その番号の文を読みます。'
                    : phase === 'cue-failed'
                      ? '番号を読み上げられませんでした。'
                      : 'Listen'
          }
        />
        <section className="exam reading" data-phase={phase} data-testid="phase">
          {phase === 'cue-failed' ? (
            <button type="button" className="btn" onClick={retryCue}>
              Play number again
            </button>
          ) : null}
          <ReadingBoard set={live.set} emphasize={phase === 'respond' || phase === 'saving' ? live.item.number : undefined} />
          {phase === 'respond' || phase === 'saving' ? (
            <>
              <p className="caption" lang="en" data-testid="live-caption">
                {tick.interim || '読み始めると、ここに認識した文字が出ます。'}
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
                    cancelReading();
                    navigate('/a');
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

function ReadingStatus({
  number,
  remainingMs,
  urgent,
  hint,
}: {
  number: number;
  remainingMs: number | null;
  urgent: boolean;
  hint: string;
}) {
  const seconds = remainingMs == null ? null : Math.ceil(remainingMs / 1000);
  const progress = remainingMs == null ? 0 : Math.min(1, Math.max(0, remainingMs / 15_000));
  return (
    <div className={urgent ? 'read-status urgent' : 'read-status'} data-testid="timer">
      <div className="read-status-row">
        <span>{hint}</span>
        <strong>
          <span data-testid="reading-number">{number}</span>
          <span className="read-status-seconds" aria-hidden={seconds == null}>
            {seconds == null ? '15s' : `${seconds}s`}
          </span>
        </strong>
      </div>
      <div className="read-status-track" aria-hidden="true">
        <span style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}
