import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { usePracticeLevel } from '../lib/level';
import { practiceRunSize } from '../lib/practice-run';
import { canSpeak, cancelSpeech, englishVoiceLabel, getAudioContext, recognitionSupported, speakChunks } from '../lib/speech';

const SAMPLE = ['on the desk', 'she left', 'her notebook'] as const;

export function PartDHome() {
  const { level } = usePracticeLevel();
  const supported = recognitionSupported();
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'done' | 'failed'>('idle');
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);
  const sessionSize = practiceRunSize('D');

  async function onTestAudio() {
    if (audioState === 'playing') {
      cancelSpeech();
      setAudioState('idle');
      return;
    }
    setAudioState('playing');
    const result = await speakChunks(SAMPLE, 400);
    setVoiceLabel(englishVoiceLabel());
    setAudioState(result === 'spoken' ? 'done' : 'failed');
  }

  return (
    <main className="page" data-level={level}>
      <p className="eyebrow">Part D</p>
      <h1>Sentence builds</h1>
      <p className="lede">
        短い句が3つ、文法的ではない順で一度だけ読まれます。画面には出ません。それらを並べ替えて、1つの文として話してください。
      </p>
      <LevelPicker />
      <div className="actions">
        <Link to="/d/practice" className="btn" data-testid="start-part-d" onClick={() => getAudioContext()}>
          Start
        </Link>
        <Link to="/d/progress" className="btn secondary" data-testid="part-d-progress">
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
          <li>3つの句が、あいだを空けて一度だけ読まれます。番号は付きません。回答中は句も文も出しません。</li>
          <li>合図のあと、15秒以内に1つの文として話します。6秒以内に話し始めないと無回答です。</li>
          <li>答え終わると、すぐ次の3つの句が読まれます。</li>
          <li>
            1セッションで全{sessionSize}問を通します。終わってから、全{sessionSize}問の結果をまとめて出します。間違えた問を先に出します。同じセッションでは同じ問を繰り返しません。
          </li>
        </ol>
        <p className="muted">
          間違えた問にはチェックが付きます。3回連続で正解した問は、理解できたものとします。チェックが付いている問を優先しますが、まだ済んでいない問も出します。
        </p>
      </section>

      <section className="card">
        <h2>Sound check</h2>
        <p>句はこの端末の読み上げです。先に、3つの句が区切って聞こえるか確認してください。この文は採点しません。</p>
        {canSpeak() ? (
          <button type="button" className="btn secondary" data-testid="test-build-audio" onClick={() => void onTestAudio()}>
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
          {SAMPLE.join(' · ')}
        </p>
      </section>

      <section className="card">
        <h2>Scoring</h2>
        <p>
          点数は練習用の目安です。本番の Versant スコアではありません。発音は採点しません。音声はサーバに送らず、この端末の音声認識で文字にしてから比べます。
        </p>
        <ul>
          <li>比べる相手は、文法的に認められる完成文です。複数あるときは、内容点が一番高い文を採用します。平均は取りません。</li>
          <li>正解は、その文の単語が順に揃っていることです。認識が余分な語を足しても、抜けと言い換えがなければ正解です。</li>
          <li>内容点は、語順を保って揃った単語の割合です。総合点は、内容点に反応の係数をかけたものです。合図から1秒以内なら係数は1、6秒まで遅れると0.6まで下がります。</li>
          <li>3つの句の内容語が揃ったかは、あとから見られる診断です。見出し点の式には入れません。</li>
          <li>
            セッションのあと、依頼したときだけ録音と採用した文を Gemini に送ります。聞こえた単語、余分、言い直し、気になる発音を見ます。点数も合格も書き換えません。
          </li>
        </ul>
      </section>
    </main>
  );
}
