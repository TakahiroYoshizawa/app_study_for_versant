import { useState } from 'react';
import { loadGeminiKey, saveGeminiKey } from '../lib/gemini';

export function Settings() {
  const [apiKey, setApiKey] = useState(() => loadGeminiKey());
  const [stored, setStored] = useState(() => loadGeminiKey().length > 0);
  const [note, setNote] = useState('');

  function onSave() {
    saveGeminiKey(apiKey);
    const saved = loadGeminiKey().length > 0;
    setStored(saved);
    setApiKey(loadGeminiKey());
    setNote(saved ? '保存しました。答え合わせでは、このキーでセッションの録音をまとめて送ります。' : 'キーを消しました。');
  }

  function onClear() {
    setApiKey('');
    saveGeminiKey('');
    setStored(false);
    setNote('キーを消しました。');
  }

  return (
    <main className="page">
      <p className="eyebrow">Settings</p>
      <h1>API key</h1>
      <p className="lede">
        Gemini の採点に使うキーです。一度保存すれば、Part A、Part B、Part D の聞き取り、Part E の要点、Part F の練習フィードバックで同じキーを使います。
      </p>
      <section className="card">
        <label className="field">
          <span>Gemini API key</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            data-testid="gemini-key"
            onChange={(event) => {
              setApiKey(event.target.value);
              setNote('');
            }}
          />
        </label>
        <p className="muted">
          {stored
            ? 'このブラウザに保存しています。利用料はこのキーのアカウントにかかります。'
            : 'まだ保存していません。キーはこのブラウザにだけ残り、サーバーには送りません。'}
        </p>
        {note ? <p>{note}</p> : null}
        <div className="actions">
          <button type="button" className="btn" data-testid="save-gemini-key" onClick={onSave}>
            Save
          </button>
          {stored ? (
            <button type="button" className="btn secondary" onClick={onClear}>
              Clear
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
