import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { READING_SETS } from '../data/readings';
import { forLevel, usePracticeLevel } from '../lib/level';
import { canSpeak, cancelSpeech, englishVoiceLabel, getAudioContext, speakOnce } from '../lib/speech';

export function ReadingHome() {
  const { level } = usePracticeLevel();
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'done' | 'failed'>('idle');
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);

  async function onTestNumber() {
    if (audioState === 'playing') {
      cancelSpeech();
      setAudioState('idle');
      return;
    }
    setAudioState('playing');
    const result = await speakOnce('Number four.', 0.96);
    setVoiceLabel(englishVoiceLabel());
    setAudioState(result === 'spoken' ? 'done' : 'failed');
  }

  return (
    <main className="page">
      <p className="eyebrow">Part A</p>
      <h1>Read</h1>
      <p className="lede">
        画面に英文が8文出ています。音声は番号だけを読みます。その番号の文を、書いてあるとおりに読んでください。
      </p>
      <LevelPicker />
      <div className="actions">
        <Link to="/a/practice" className="btn" data-testid="start-reading" onClick={() => getAudioContext()}>
          Start
        </Link>
        <Link to="/a/questions" className="btn secondary">
          Progress
        </Link>
      </div>
      <section className="card">
        <h2>Flow</h2>
        <ol className="steps">
          <li>4文ずつ、内容がつながった組が2つ、最初から見えています。</li>
          <li>「Number four.」のように、読む番号だけが一度読まれます。文そのものは読まれません。</li>
          <li>合図のあと15秒以内に、その番号の文を読みます。6秒以内に読み始めないと無回答です。</li>
          <li>8文を1回ずつ出します。順番は毎回入れ替わり、番号順には進みません。1セットが終わると、採点のまとめに進みます。</li>
        </ol>
        <p className="muted">
          この難易度のセットは{forLevel(READING_SETS, level).length}つです。間違えた文にはチェックが付き、3回連続で正解した文は理解できたものとします。採点のあと次へ進むときは、いまのセット以外で、まだ取り組んでいないセットを優先してランダムに出します。
        </p>
      </section>
      <section className="card">
        <h2>Voice</h2>
        <p>文は画面にあるので、読み上げるのは番号だけです。先に「Number four.」が聞こえるか確認してください。</p>
        {canSpeak() ? (
          <button type="button" className="btn secondary" data-testid="test-number" onClick={() => void onTestNumber()}>
            {audioState === 'playing' ? 'Stop' : 'Play a number'}
          </button>
        ) : (
          <p className="note">このブラウザは読み上げに対応していません。Chrome で開いてください。</p>
        )}
        {audioState === 'done' ? (
          <p className="muted">
            読み上げが終わりました。{voiceLabel ? `使った声は ${voiceLabel} です。` : '英語の声が見つからなかったので、ブラウザ標準の声で読みました。'}
          </p>
        ) : null}
        {audioState === 'failed' ? <p className="note">番号を読み上げられませんでした。もう一度試してください。</p> : null}
      </section>
      <section className="card">
        <h2>Scoring</h2>
        <p>指定された1文と、認識した読みを比べます。8文のうち一番近い文を正解にはしません。</p>
        <ul>
          <li>正解は、その文の単語が順に揃っていることです。認識が余分な語を足しても、抜けと言い換えがなければ正解です。</li>
          <li>別の番号を読んだように見えるときは、その旨を結果に出します。点数の付け替えはしません。</li>
        </ul>
      </section>
    </main>
  );
}
