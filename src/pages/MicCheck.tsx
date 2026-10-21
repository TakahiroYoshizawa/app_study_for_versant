import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { markMicChecked, micChecked } from '../lib/mic-check';
import { ensureMic, getAudioContext, listenFor, recognitionSupported, releaseMic } from '../lib/speech';

export function MicCheck() {
  const navigate = useNavigate();
  const [intro] = useState(() => !micChecked());
  const supported = recognitionSupported();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);
  const [micFailed, setMicFailed] = useState(false);
  const [micError, setMicError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testText, setTestText] = useState('');
  const mounted = useRef(true);
  const stopTest = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      mounted.current = false;
      stopTest.current?.();
      releaseMic();
    };
  }, []);

  useEffect(() => {
    if (!stream) return;
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
  }, [stream]);

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
      markMicChecked();
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

  function onContinue() {
    markMicChecked();
    navigate('/');
  }

  return (
    <main className="page" data-testid="mic-page">
      <p className="eyebrow">Setup</p>
      <h1>Microphone</h1>
      <p className="lede">
        {intro
          ? '最初に一度、声が入るか確認します。確認したあとは、パートを選んですぐ練習が始まります。あとから試すときは、上の Mic を開いてください。'
          : '声が入るか、ここで試せます。'}
      </p>
      {!supported ? (
        <p className="note">このブラウザでは音声認識が使えません。Chrome で開くと、話した内容を採点できます。</p>
      ) : null}
      {micError ? <p className="note">{micError}</p> : null}
      {stream ? (
        <section className="card">
          <h2>Level</h2>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <p className="muted">バーが動けば、マイクは入っています。</p>
          <div className="actions">
            <button type="button" className="btn secondary" onClick={onTestMic}>
              {testing ? 'Stop' : 'Try speaking'}
            </button>
          </div>
          <p className="caption" lang="en">
            {testing && !testText ? 'I like tea. と言ってみてください。' : testText || 'まだ認識していません。'}
          </p>
        </section>
      ) : (
        <div className="actions">
          <button type="button" className="btn" data-testid="enable-mic" onClick={onEnableMic}>
            Turn mic on
          </button>
        </div>
      )}
      {intro && (stream || micFailed || !supported) ? (
        <div className="actions">
          <button type="button" className="btn" data-testid="mic-continue" onClick={onContinue}>
            Continue
          </button>
        </div>
      ) : null}
    </main>
  );
}
