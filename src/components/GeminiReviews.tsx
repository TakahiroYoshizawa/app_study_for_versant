import type { LiteralReview } from '../lib/practice-run';
import type { Attempt } from '../types';

export function GeminiReviews({ attempts, reviews }: { attempts: Attempt[]; reviews: LiteralReview[] }) {
  const byId = new Map(reviews.map((review) => [review.attemptId, review]));
  const sentenceRisks = attempts.filter((attempt) => {
    const review = byId.get(attempt.id);
    return review && !review.unavailable && (review.words?.length ?? 0) > 0 && !review.correct;
  }).length;
  const pronunciationNotes = attempts.filter((attempt) => {
    const review = byId.get(attempt.id);
    return review && !review.unavailable && (review.pronunciation?.length ?? 0) > 0;
  }).length;

  return (
    <div data-testid="gemini-result">
      <p>
        文として減点されうる問は {sentenceRisks} 問です。発音の指摘がある問は {pronunciationNotes} 問です。本番の点数ではなく、合格とチェックも変えていません。
      </p>
      {attempts.map((attempt, index) => {
        const review = byId.get(attempt.id);
        if (!review || review.unavailable) return null;
        const words = review.words ?? [];
        const pronunciation = review.pronunciation ?? [];
        if (words.length === 0) {
          return (
            <article key={attempt.id} className="review-block">
              <p className={review.correct ? 'review-head good' : 'review-head bad'}>
                {index + 1}. {review.correct ? '正解' : '不正解'}
              </p>
              <p className="review-said" lang="en">
                {review.transcript || '（聞こえた単語はありません）'}
              </p>
            </article>
          );
        }
        const risk = !review.correct;
        const fuzzyWords = new Set(pronunciation.map((note) => wordKey(note.word)).filter(Boolean));
        return (
          <article key={attempt.id} className="review-block">
            <p className={risk ? 'review-head bad' : 'review-head good'}>
              {index + 1}. {risk ? '不正解' : '正解'}
            </p>
            <p className="review-target" lang="en">
              {paintTarget(attempt.sentenceText, words).map((part, partIndex) =>
                part.missing ? (
                  <span className="miss" key={`${part.text}-${partIndex}`}>
                    {part.text}
                  </span>
                ) : (
                  <span key={`${part.text}-${partIndex}`}>{part.text}</span>
                ),
              )}
            </p>
            <p className="review-said" lang="en">
              {paintAnswer(words, review.transcript, fuzzyWords).map((part, partIndex) => (
                <span className={part.paint === 'ok' ? undefined : part.paint} key={`${part.text}-${partIndex}`}>
                  {part.text}
                </span>
              ))}
            </p>
            {pronunciation.length > 0 ? (
              <ul className="review-notes">
                {pronunciation.map((note) => (
                  <li key={`${note.word}-${note.note}`}>{note.note}</li>
                ))}
              </ul>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function wordKey(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9']/g, '');
}

function paintTarget(sentence: string, words: { word: string; status: string }[]): { text: string; missing: boolean }[] {
  const chunks: { text: string; missing: boolean }[] = [];
  const pattern = /[A-Za-z0-9']+/g;
  let last = 0;
  let wordIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sentence))) {
    if (match.index > last) chunks.push({ text: sentence.slice(last, match.index), missing: false });
    const heard = words[wordIndex];
    const same = heard ? wordKey(heard.word) === wordKey(match[0]) : false;
    chunks.push({ text: match[0], missing: same && heard?.status === 'missing' });
    if (same) wordIndex += 1;
    last = match.index + match[0].length;
  }
  if (last < sentence.length) chunks.push({ text: sentence.slice(last), missing: false });
  return chunks.length > 0 ? chunks : [{ text: sentence, missing: false }];
}

function paintAnswer(
  words: { word: string; status: string }[],
  transcript: string,
  fuzzyWords: Set<string>,
): { text: string; paint: 'ok' | 'fuzzy' | 'extra' }[] {
  const spoken = transcript.replace(/\[unclear\]/gi, ' ').split(/\s+/).filter(Boolean);
  const painted: { text: string; paint: 'ok' | 'fuzzy' | 'extra' }[] = [];
  let spokenIndex = 0;
  const paintOf = (status: string, word: string): 'ok' | 'fuzzy' =>
    status === 'uncertain' || fuzzyWords.has(wordKey(word)) ? 'fuzzy' : 'ok';

  for (const word of words) {
    if (word.status === 'missing' || spokenIndex >= spoken.length) continue;
    const want = wordKey(word.word);
    if (wordKey(spoken[spokenIndex] ?? '') === want) {
      painted.push({ text: spoken[spokenIndex] ?? '', paint: paintOf(word.status, word.word) });
      spokenIndex += 1;
      continue;
    }
    let found = -1;
    const limit = Math.min(spoken.length, spokenIndex + 4);
    for (let index = spokenIndex; index < limit; index += 1) {
      if (wordKey(spoken[index] ?? '') === want) {
        found = index;
        break;
      }
    }
    if (found >= 0) {
      for (let index = spokenIndex; index < found; index += 1) {
        painted.push({ text: spoken[index] ?? '', paint: 'extra' });
      }
      painted.push({ text: spoken[found] ?? '', paint: paintOf(word.status, word.word) });
      spokenIndex = found + 1;
      continue;
    }
    if (word.status === 'uncertain') {
      painted.push({ text: spoken[spokenIndex] ?? '', paint: 'fuzzy' });
      spokenIndex += 1;
    }
  }
  while (spokenIndex < spoken.length) {
    painted.push({ text: spoken[spokenIndex] ?? '', paint: 'extra' });
    spokenIndex += 1;
  }
  return painted.map((part, index) => ({
    ...part,
    text: index === 0 ? part.text : ` ${part.text}`,
  }));
}
