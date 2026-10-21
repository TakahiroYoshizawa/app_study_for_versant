import { Link, useLocation } from 'react-router-dom';
import { useGeminiJobs } from '../lib/use-gemini-jobs';

export function GeminiBanner() {
  const { jobs, uploadingRunIds } = useGeminiJobs();
  const onCheckPage = useLocation().pathname === '/gemini';
  const pending = jobs.some((job) => job.status === 'pending');
  const unseen = jobs.some((job) => job.status === 'done' && !job.seen);
  const uploading = uploadingRunIds.length > 0;

  if (!uploading && !pending && !unseen) return null;

  let message = 'Geminiの採点結果が出ています。';
  if (uploading) message = '録音を送っています。送り終わるまで、このタブは開いたままにしてください。';
  else if (pending) message = 'Geminiの採点を受け付けています。離れても、戻ってから確認できます。';

  return (
    <div className="gemini-banner" data-testid="gemini-banner">
      <p>
        <span>{message}</span>
        {onCheckPage ? null : (
          <Link to="/gemini">{unseen && !pending && !uploading ? '結果を見る' : '結果を確認'}</Link>
        )}
      </p>
    </div>
  );
}
