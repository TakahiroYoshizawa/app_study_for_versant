import { useEffect, useState } from 'react';
import { loadGeminiKey } from './gemini';
import { loadGeminiJobs, refreshGeminiJob, subscribeGemini, uploadingRunIds, type GeminiJob } from './gemini-job';

export function useGeminiJobs(): { jobs: GeminiJob[]; uploadingRunIds: string[] } {
  const [jobs, setJobs] = useState(() => loadGeminiJobs());
  const [uploading, setUploading] = useState(() => uploadingRunIds());

  useEffect(
    () =>
      subscribeGemini(() => {
        setJobs(loadGeminiJobs());
        setUploading(uploadingRunIds());
      }),
    [],
  );

  return { jobs, uploadingRunIds: uploading };
}

export function usePollPendingJobs(jobs: GeminiJob[]): void {
  const pendingKey = jobs
    .filter((job) => job.status === 'pending')
    .map((job) => job.interactionId)
    .join('|');

  useEffect(() => {
    if (!pendingKey) return;
    const ids = new Set(pendingKey.split('|'));
    let stopped = false;

    const tick = () => {
      if (stopped || document.visibilityState === 'hidden') return;
      const apiKey = loadGeminiKey();
      if (!apiKey) return;
      for (const job of loadGeminiJobs()) {
        if (job.status !== 'pending' || !ids.has(job.interactionId)) continue;
        void refreshGeminiJob(job, apiKey).catch(() => undefined);
      }
    };

    tick();
    const timer = window.setInterval(tick, 15000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [pendingKey]);
}
