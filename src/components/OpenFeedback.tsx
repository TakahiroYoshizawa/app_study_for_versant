import { useState } from 'react';
import { Link } from 'react-router-dom';
import { loadGeminiKey } from '../lib/gemini';
import { gradeOpenAttempts } from '../lib/open-grade';
import { isBlankTranscript, openBand, OPEN_PASS } from '../lib/open-score';
import { loadAttempt } from '../lib/storage';
import type { Attempt } from '../types';

export function OpenFeedbackView({ attempt }: { attempt: Attempt }) {
  const feedback = attempt.geminiStatus === 'ok' ? attempt.openFeedback : undefined;
  if (!feedback) return <p className="note">{openStatusText(attempt)}</p>;
  return (
    <>
      <p data-testid="open-score">
        練習点 {attempt.overallScore} · {openBand(attempt.overallScore)}
        {attempt.overallScore >= OPEN_PASS ? ' · この回は正解です' : ' · この回は間違いです'}
      </p>
      <dl className="score-pair">
        <dt>課題達成</dt>
        <dd>{feedback.taskCompletion}/4</dd>
        <dt>語彙</dt>
        <dd>{feedback.vocabulary}/4</dd>
        <dt>一貫性</dt>
        <dd>{feedback.coherence}/4</dd>
        <dt>設問</dt>
        <dd>{feedback.answeredPrompt ? '答えている' : '答えていない'}</dd>
        {attempt.requiresReason ? (
          <>
            <dt>理由</dt>
            <dd>{feedback.reasonPresent ? 'ある' : 'ない'}</dd>
          </>
        ) : null}
      </dl>
      {!feedback.answeredPrompt ? <p className="note">設問に答えていないので、課題達成は 0 にしています。</p> : null}
      {attempt.requiresReason && !feedback.reasonPresent ? (
        <p className="note">理由が無いので、課題達成は最大 2 にしています。</p>
      ) : null}
      <p>{feedback.practiceNoteJa}</p>
    </>
  );
}

export function OpenRescore({ attempt, onDone }: { attempt: Attempt; onDone: (next: Attempt) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (attempt.geminiStatus === 'not_used' || isBlankTranscript(attempt.transcript)) return null;
  const hasKey = loadGeminiKey().length > 0;

  async function run() {
    const key = loadGeminiKey();
    if (!key) {
      setError('APIキーがありません。Key で保存してから採点してください。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await gradeOpenAttempts(attempt.id, [attempt.id], key, 'rescore');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '採点に失敗しました。');
    } finally {
      const next = loadAttempt(attempt.id);
      if (next) onDone(next);
      setBusy(false);
    }
  }

  return (
    <div className="actions">
      {hasKey ? (
        <button type="button" className="btn secondary" data-testid="open-rescore" disabled={busy} onClick={() => void run()}>
          {busy ? '採点しています' : attempt.geminiStatus === 'ok' ? '再採点' : '採点する'}
        </button>
      ) : (
        <Link to="/settings" className="btn secondary">
          Set API key
        </Link>
      )}
      {error ? <p className="note">{error}</p> : null}
    </div>
  );
}

function openStatusText(attempt: Attempt): string {
  if (attempt.geminiStatus === 'not_used') {
    return attempt.hadSignal
      ? '音は検出されましたが、言葉として認識できなかったので 0 です。Gemini は呼んでいません。'
      : '回答が空だったので 0 です。Gemini は呼んでいません。';
  }
  if (attempt.geminiStatus === 'no_key') return 'APIキーが無いので、文字起こしだけ残しています。';
  if (attempt.geminiStatus === 'error') return '採点の通信に失敗しました。もう一度採点できます。';
  if (attempt.geminiStatus === 'invalid_json') return '結果の形が不正だったので、点は付けていません。もう一度採点できます。';
  return 'まだ採点していません。';
}
