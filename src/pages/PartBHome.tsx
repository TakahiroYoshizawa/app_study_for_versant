import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SENTENCES } from '../data/sentences';
import { canSpeak, cancelSpeech, englishVoiceLabel, recognitionSupported, speak } from '../lib/speech';

const SAMPLE = 'This is a sound check for the speakers.';

export function PartBHome() {
  const supported = recognitionSupported();
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);

  async function onTestAudio() {
    if (audioState === 'playing') {
      cancelSpeech();
      setAudioState('idle');
      return;
    }
    setAudioState('playing');
    await speak(SAMPLE, 0.96);
    setVoiceLabel(englishVoiceLabel());
    setAudioState('done');
  }

  return (
    <main className="page">
      <p className="eyebrow">Part B</p>
      <h1>Repeat</h1>
      <p className="lede">
        短い英文が一度だけ読まれます。聞こえたとおりに、すぐに繰り返してください。画面には、答えるまで文を出しません。
      </p>
      <div className="actions">
        <Link to="/practice" className="btn" data-testid="start-practice">
          Start
        </Link>
        <Link to="/read" className="btn secondary" data-testid="start-read">
          Read along
        </Link>
        <Link to="/questions" className="btn secondary" data-testid="questions-link">
          Progress
        </Link>
        <Link to="/history" className="btn secondary" data-testid="history-link">
          History
        </Link>
      </div>

      {!supported ? (
        <p className="note">
          このブラウザは音声認識に対応していません。採点には Chrome の Web Speech API が必要です。
        </p>
      ) : null}

      <section className="card">
        <h2>Sound check</h2>
        <p>問題の英文は、この端末の読み上げで出します。先に音が出るか確認してください。</p>
        {canSpeak() ? (
          <button type="button" className="btn secondary" data-testid="test-audio" onClick={() => void onTestAudio()}>
            {audioState === 'playing' ? 'Stop' : 'Play'}
          </button>
        ) : (
          <p className="note">このブラウザは読み上げに対応していません。Chrome で開いてください。</p>
        )}
        {audioState === 'done' ? (
          <p className="muted" data-testid="voice-label">
            読み上げが終わりました。{voiceLabel ? `使った声は ${voiceLabel} です。` : '英語の声が見つからなかったので、ブラウザ標準の声で読みました。'}
            音が聞こえなければ、端末の音量とブラウザのミュートを確認してください。
          </p>
        ) : null}
        <p className="muted" lang="en">
          {SAMPLE}
        </p>
      </section>

      <section className="card">
        <h2>Flow</h2>
        <ol className="steps">
          <li>英語の指示のあと、文が一度だけ読まれます。</li>
          <li>合図のあと、15秒以内に同じ文を言います。</li>
          <li>6秒以内に話し始めないと、無回答になります。</li>
        </ol>
        <p className="muted">
          全{SENTENCES.length}文から1文ずつ出します。間違えた文にはチェックが付き、次はチェック付きを優先します。3回連続で正解した文は、理解できたものとします。
        </p>
        <p className="muted">
          見て読むは、同じ文を最初に聞いてから、画面に出たまま読む練習です。正否はリピートとは別に数えます。{' '}
          <Link to="/read/questions">Read along progress</Link>
        </p>
      </section>

      <section className="card">
        <h2>Scoring</h2>
        <p>
          点数は練習用の目安です。本番の Versant スコアではありません。発音は採点しません。音声はサーバに送らず、この端末の音声認識で文字にしてから比べます。
        </p>
        <ul>
          <li>正解は、聞こえた文の単語が順に揃っていることです。認識が余分な語を足しても、抜けと言い換えがなければ正解です。</li>
          <li>内容点は、語順を保って揃った単語の割合です。順番が入れ替わると、単語が揃っていても下がります。</li>
          <li>言い間違いは1語の置換、抜けは不足、付け足しは余分として数えます。</li>
          <li>総合点は、内容点に反応の係数をかけたものです。合図から1秒以内なら係数は1、6秒まで遅れると0.6まで下がります。</li>
          <li>反応までの時間、話した長さ、話速は点数に混ぜず、別に表示します。</li>
        </ul>
      </section>
    </main>
  );
}
