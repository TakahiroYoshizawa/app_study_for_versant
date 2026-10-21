import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GeminiReviews } from '../components/GeminiReviews';
import { formatWhen } from '../lib/format';
import { loadGeminiKey, saveGeminiKey } from '../lib/gemini';
import { markGeminiJobsSeen, refreshGeminiJob, type GeminiJob } from '../lib/gemini-job';
import { practicePartLabel } from '../lib/practice-run';
import { loadAttempt } from '../lib/storage';
import { useGeminiJobs, usePollPendingJobs } from '../lib/use-gemini-jobs';
import type { Attempt } from '../types';

export function GeminiCheck() {
  const { jobs, uploadingRunIds } = useGeminiJobs();
  usePollPendingJobs(jobs);
  const [apiKey, setApiKey] = useState(() => loadGeminiKey());
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    markGeminiJobsSeen(jobs.filter((job) => job.status === 'done' && !job.seen).map((job) => job.interactionId));
  }, [jobs]);

  async function onCheck(job: GeminiJob) {
    const key = apiKey.trim();
    if (!key) {
      setMessages((current) => ({ ...current, [job.interactionId]: 'Gemini の APIキーを入れてください。' }));
      return;
    }
    saveGeminiKey(key);
    setCheckingId(job.interactionId);
    setMessages((current) => ({ ...current, [job.interactionId]: '' }));
    try {
      const next = await refreshGeminiJob(job, key);
      if (next.status === 'pending') {
        setMessages((current) => ({
          ...current,
          [job.interactionId]: 'まだ終わっていません。時間をおいて、もう一度確認できます。',
        }));
      }
    } catch (caught) {
      setMessages((current) => ({
        ...current,
        [job.interactionId]: caught instanceof Error ? caught.message : '結果を確認できませんでした。',
      }));
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <main className="page">
      <p className="eyebrow">Gemini</p>
      <h1>採点の確認</h1>
      <p className="lede">依頼した採点は、この端末に残します。画面を離れても、戻ってから結果を確認できます。</p>
      {uploadingRunIds.length > 0 ? (
        <p className="note">採点しています。結果が出るまで、このタブは開いたままにしてください。</p>
      ) : null}
      {jobs.some((job) => job.status === 'pending') &&
      (!apiKey.trim() || Object.values(messages).some((message) => message.includes('API') || message.includes('キー'))) ? (
        <label className="field">
          <span>Gemini API key</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            data-testid="gemini-key"
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
      ) : null}
      {jobs.length === 0 && uploadingRunIds.length === 0 ? (
        <section className="card">
          <p>まだ依頼はありません。セッションのまとめで Gemini に聞けます。</p>
          <Link to="/" className="btn secondary">
            Home
          </Link>
        </section>
      ) : (
        jobs.map((job) => {
          const attempts = job.attemptIds
            .map((id) => loadAttempt(id))
            .filter((attempt): attempt is Attempt => attempt != null);
          const message = messages[job.interactionId];
          return (
            <section key={job.interactionId} className="card" data-testid="gemini-job">
              <h2>{practicePartLabel(job.part)}</h2>
              <p className="muted">
                {formatWhen(job.createdAt)} · {job.attemptIds.length}問 · {statusLabel(job.status)}
              </p>
              {job.status === 'pending' ? (
                <>
                  <p>採点中です。終わっていれば、ここで結果を出せます。</p>
                  {message ? <p className="note">{message}</p> : null}
                  <div className="actions">
                    <button
                      type="button"
                      className="btn"
                      data-testid="check-gemini"
                      disabled={checkingId === job.interactionId}
                      onClick={() => void onCheck(job)}
                    >
                      {checkingId === job.interactionId ? '確認しています' : '結果を確認'}
                    </button>
                  </div>
                </>
              ) : null}
              {job.status === 'error' ? <p className="note">{job.error ?? '採点に失敗しました。セッションのまとめからもう一度依頼してください。'}</p> : null}
              {job.status === 'done' && job.reviews && job.reviews.length > 0 ? (
                <GeminiReviews attempts={attempts} reviews={job.reviews} />
              ) : null}
              {job.status === 'done' && (!job.reviews || job.reviews.length === 0) ? <p className="muted">表示できる結果がありません。</p> : null}
            </section>
          );
        })
      )}
    </main>
  );
}

function statusLabel(status: GeminiJob['status']): string {
  if (status === 'pending') return '採点中';
  if (status === 'done') return '結果あり';
  return '失敗';
}
