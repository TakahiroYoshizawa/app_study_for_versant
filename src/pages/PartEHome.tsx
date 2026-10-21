import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { usePracticeLevel } from '../lib/level';
import { practiceRunSize } from '../lib/practice-run';
import { STORY_RESPONSE_MS, STORY_START_LIMIT_MS } from '../lib/story-score';
import { canSpeak, cancelSpeech, englishVoiceLabel, getAudioContext, recognitionSupported, speakOnce } from '../lib/speech';

const SAMPLE = 'Maya missed the eight o\'clock train.';

export function PartEHome() {
  const { level } = usePracticeLevel();
  const supported = recognitionSupported();
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'done' | 'failed'>('idle');
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);
  const sessionSize = practiceRunSize('E');
  const responseSeconds = STORY_RESPONSE_MS / 1000;
  const startSeconds = STORY_START_LIMIT_MS / 1000;

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
      <p className="eyebrow">Part E</p>
      <h1>Story retelling</h1>
      <p className="lede">
        短い話が一度だけ読まれます。画面には出ません。自分の言葉で、要点を話してください。
      </p>
      <LevelPicker />
      <div className="actions">
        <Link to="/e/practice" className="btn" data-testid="start-part-e" onClick={() => getAudioContext()}>
          Start
        </Link>
        <Link to="/e/stories" className="btn secondary" data-testid="part-e-progress">
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
          <li>話が一度だけ読まれます。話しているあいだは本文を出しません。</li>
          <li>
            合図のあと、{responseSeconds}秒以内に話します。{startSeconds}秒以内に話し始めないと無回答です。
          </li>
          <li>言い終わって間が空くと、次の話に進みます。早く終えるときは Done を押します。</li>
          <li>
            1セッションは{sessionSize}話です。終わってから、要点がどれだけ入っていたかをまとめて出します。同じセッションでは同じ話を繰り返しません。
          </li>
        </ol>
        <p className="muted">
          要点が足りなかった話にはチェックが付きます。3回連続で正解した話は、理解できたものとします。チェックが付いている話を優先しますが、まだ済んでいない話も出します。
        </p>
      </section>

      <section className="card">
        <h2>Sound check</h2>
        <p>話はこの端末の読み上げです。先に音が出るか確認してください。この文は採点しません。</p>
        {canSpeak() ? (
          <button type="button" className="btn secondary" data-testid="test-story-audio" onClick={() => void onTestAudio()}>
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
          点数は練習用の目安です。本番の Versant スコアではありません。発音はブラウザの点に入りません。
        </p>
        <ul>
          <li>ブラウザは、認識した言葉に要点の手がかりがあるかを見ます。要点の6割以上で正解です。</li>
          <li>言い換えは、手がかりの語が無いと数えません。元の文をそのまま言う必要はありません。</li>
          <li>セッションのあと、録音を Gemini に渡せます。言い換えていても、要点が入っていれば入ったものとします。</li>
          <li>反応の時間は点に入れません。</li>
        </ul>
      </section>
    </main>
  );
}
