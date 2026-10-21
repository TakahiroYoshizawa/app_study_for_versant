import { attemptWasCorrect } from '../lib/progress';
import type { LiteralReview, WordHearing } from '../lib/practice-run';
import type { Attempt } from '../types';

export function GeminiReviews({ attempts, reviews }: { attempts: Attempt[]; reviews: LiteralReview[] }) {
  const byId = new Map(reviews.map((review) => [review.attemptId, review]));
  const sentenceRisks = attempts.filter((attempt) => {
    const review = byId.get(attempt.id);
    return review && !review.unavailable && !review.correct;
  }).length;
  const pronunciationNotes = attempts.filter((attempt) => {
    const review = byId.get(attempt.id);
    return review && !review.unavailable && review.pronunciation.length > 0;
  }).length;

  return (
    <div data-testid="gemini-result">
      <p>
        文として減点されうる問は {sentenceRisks} 問です。発音の指摘がある問は {pronunciationNotes} 問です。本番の点数ではなく、合格とチェックも変えていません。
      </p>
      {attempts.map((attempt, index) => {
        const review = byId.get(attempt.id);
        if (!review || review.unavailable) return null;
        const risk = !review.correct;
        return (
          <article key={attempt.id} className={risk || review.pronunciation.length > 0 ? 'review-block differed' : 'review-block'}>
            <h3>
              {index + 1}. {risk ? '文として減点されうる' : '文の抜けは見つからなかった'}
            </h3>
            <p className="muted">端末の判定は {attemptWasCorrect(attempt) ? '正解' : '不正解'} のままです。</p>
            <ul className="hearing-list">
              {review.words.map((word, wordIndex) => (
                <li key={`${word.word}-${wordIndex}`}>
                  <span lang="en">{word.word}</span>
                  <small className={word.status === 'clear' ? 'good' : 'bad'}>{hearingLabel(word.status)}</small>
                </li>
              ))}
            </ul>
            {review.extras.length > 0 ? (
              <p>
                余分な語: <span lang="en">{review.extras.join(' ')}</span>
              </p>
            ) : null}
            {review.restart ? <p>言い直しています。</p> : null}
            {review.pronunciation.length > 0 ? (
              <ul>
                {review.pronunciation.map((note) => (
                  <li key={`${note.word}-${note.note}`}>{note.note}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">気になる発音の指摘はありません。</p>
            )}
            <p className="muted" lang="en">
              {review.transcript || '（聞こえた単語はありません）'}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function hearingLabel(status: WordHearing): string {
  if (status === 'clear') return '聞こえる';
  if (status === 'uncertain') return 'あいまい';
  return '言っていない';
}
