import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { OPEN_SESSION_SIZE } from '../data/open-questions';
import { usePracticeLevel } from '../lib/level';
import { practiceRunSize } from '../lib/practice-run';
import { canSpeak, cancelSpeech, englishVoiceLabel, getAudioContext, recognitionSupported, speakOnce } from '../lib/speech';

const SAMPLE = 'Do you prefer tea or coffee? Why?';

export function PartFHome() {
  const { level } = usePracticeLevel();
  const supported = recognitionSupported();
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'done' | 'failed'>('idle');
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);
  const sessionSize = practiceRunSize('F');

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
      <p className="eyebrow">Part F</p>
      <h1>Open questions</h1>
      <p className="lede">
        設問が一度だけ読まれます。画面には出ません。40秒で、場面を描写するか、意見と理由を話してください。
      </p>
      <LevelPicker />
      <div className="actions">
        <Link to="/f/practice" className="btn" data-testid="start-part-f" onClick={() => getAudioContext()}>
          Start
        </Link>
        <Link to="/f/progress" className="btn secondary" data-testid="part-f-progress">
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
          <li>設問が一度だけ読まれます。回答中は設問を出しません。</li>
          <li>合図のあと、40秒まで話せます。6秒で打ち切る制限はありません。無音では終わりません。</li>
          <li>話し終えたら Done を押すか、40秒が終わるまで待ちます。終わると次の設問が読まれます。</li>
          <li>1セッションは{sessionSize}問です。終わってから、練習フィードバックをまとめて出します。</li>
        </ol>
        <p className="muted">
          70点以上を正解として数えます。間違えた設問にはチェックが付きます。3回連続で70点以上になると、その設問は理解できたものとします。チェックが付いている設問を優先します。
        </p>
      </section>

      <section className="card">
        <h2>Sound check</h2>
        <p>設問はこの端末の読み上げです。先に音が出るか確認してください。この文は採点しません。</p>
        {canSpeak() ? (
          <button type="button" className="btn secondary" data-testid="test-open-audio" onClick={() => void onTestAudio()}>
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
        <p className="open-label">練習フィードバック（本番では自動採点されない）</p>
        <p>
          点数は練習用の目安です。本番の Versant スコアではありません。発音は採点しません。音声ファイルは送らず、この端末の音声認識で文字にしてから、設問と文字起こしだけを Gemini に送ります。
        </p>
        <ul>
          <li>見出し点は、課題達成 50%、語彙 25%、一貫性 25% です。</li>
          <li>設問に答えていなければ、課題達成は 0 です。理由が必要な問で理由が無ければ、課題達成は最大 2 です。</li>
          <li>回答が空のときは 0 点です。そのときは Gemini を呼びません。</li>
          <li>APIキーが無いとき、通信に失敗したとき、結果の形が不正なときは、文字起こしだけ残して点は付けません。</li>
          <li>まとめの画面で、採点と再採点ができます。自動では送り直しません。</li>
        </ul>
        <p className="muted">問題は{OPEN_SESSION_SIZE}問ずつ出します。出題のストックはそれより多く、セッションをまたいでチェックが残ります。</p>
      </section>
    </main>
  );
}
