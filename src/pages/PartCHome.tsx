import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { usePracticeLevel } from '../lib/level';
import { practiceRunSize } from '../lib/practice-run';
import { canSpeak, cancelSpeech, englishVoiceLabel, getAudioContext, recognitionSupported, speakOnce } from '../lib/speech';

const SAMPLE = 'What time is it now?';

export function PartCHome() {
  const { level } = usePracticeLevel();
  const supported = recognitionSupported();
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'done' | 'failed'>('idle');
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);
  const sessionSize = practiceRunSize('C');

  async function onTestAudio() {
    if (audioState === 'playing') {
      cancelSpeech();
      setAudioState('idle');
      return;
    }
    setAudioState('playing');
    const result = await speakOnce(SAMPLE, 1);
    setVoiceLabel(englishVoiceLabel());
    setAudioState(result === 'spoken' ? 'done' : 'failed');
  }

  return (
    <main className="page" data-level={level}>
      <p className="eyebrow">Part C</p>
      <h1>Questions</h1>
      <p className="lede">
        短い質問が一度だけ読まれます。画面には出ません。単語か、短い句で答えてください。
      </p>
      <LevelPicker />
      <div className="actions">
        <Link to="/c/practice" className="btn" data-testid="start-part-c" onClick={() => getAudioContext()}>
          Start
        </Link>
        <Link to="/c/questions" className="btn secondary" data-testid="part-c-progress">
          Progress
        </Link>
        <Link to="/history" className="btn secondary">
          History
        </Link>
      </div>

      {!supported ? (
        <p className="note">このブラウザは音声認識に対応していません。採点には Chrome の Web Speech API が必要です。</p>
      ) : null}

      <section className="card">
        <h2>Flow</h2>
        <ol className="steps">
          <li>質問が一度だけ読まれます。回答中は質問文を出しません。</li>
          <li>合図のあと、15秒以内に答えます。6秒以内に話し始めないと無回答です。</li>
          <li>答え終わると、すぐ次の質問が読まれます。</li>
          <li>
            1セッションで全{sessionSize}問を通します。終わってから、全{sessionSize}問の答え合わせをまとめて出します。間違えた問を先に出します。同じセッションでは同じ問を繰り返しません。
          </li>
        </ol>
        <p className="muted">
          間違えた問にはチェックが付きます。3回連続で正解した問は、理解できたものとします。チェックが付いている問を優先しますが、まだ済んでいない問も出します。
        </p>
      </section>

      <section className="card">
        <h2>Sound check</h2>
        <p>質問はこの端末の読み上げです。先に音が出るか確認してください。この文は採点しません。</p>
        {canSpeak() ? (
          <button type="button" className="btn secondary" data-testid="test-question-audio" onClick={() => void onTestAudio()}>
            {audioState === 'playing' ? 'Stop' : 'Play'}
          </button>
        ) : (
          <p className="note">このブラウザは読み上げに対応していません。Chrome で開いてください。</p>
        )}
        {audioState === 'done' ? (
          <p className="muted" data-testid="voice-label">
            読み上げが終わりました。
            {voiceLabel ? `使った声は ${voiceLabel} です。` : '英語の声が見つからなかったので、ブラウザ標準の声で読みました。'}
            音が聞こえなければ、端末の音量とブラウザのミュートを確認してください。
          </p>
        ) : null}
        {audioState === 'failed' ? <p className="note">読み上げに失敗しました。もう一度試してください。</p> : null}
        <p className="muted" lang="en">
          {SAMPLE}
        </p>
      </section>

      <section className="card">
        <h2>Scoring</h2>
        <p>
          点数は練習用の目安です。本番の Versant スコアではありません。発音は採点しません。音声はサーバに送らず、この端末の音声認識で文字にしてから比べます。
        </p>
        <ul>
          <li>正解は、正規化した答えが許容回答のどれかと完全に一致することです。一致すれば 100、それ以外は 0 です。</li>
          <li>部分点はありません。近い答えを見せても、点は 0 のままです。</li>
          <li>大文字、句読点、I'm などの短縮、0 から 100 の数字の読みは、比べる前に揃えます。6:00 や 6 pm は six、2:30 は two thirty として比べます。um や uh は無視します。</li>
          <li>冠詞や余分な語が残ると不一致です。反応が 3 秒以上かかっても減点せず、「開始が遅い」とだけ出します。</li>
        </ul>
      </section>
    </main>
  );
}
