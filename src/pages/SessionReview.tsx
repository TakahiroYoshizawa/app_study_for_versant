import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadGeminiKey, saveGeminiKey, transcribeAttempts } from '../lib/gemini';
import { loadPracticeRun, loadSavedSession, practiceRunSize, savePracticeReviews, type PracticePart, type SavedSession } from '../lib/practice-run';
import { attemptWasCorrect } from '../lib/progress';
import { loadAttempt } from '../lib/storage';
import type { Attempt } from '../types';

export function SessionReview() {
  const { id } = useParams();
  const [run, setRun] = useState<SavedSession | null>(() => sessionFrom(id));
  const [apiKey, setApiKey] = useState(() => loadGeminiKey());
  const [phase, setPhase] = useState<'ask' | 'sending' | 'done' | 'declined'>(() =>
    sessionFrom(id)?.reviews?.length ? 'done' : 'ask',
  );
  const [error, setError] = useState('');

  useEffect(() => {
    const next = sessionFrom(id);
    setRun(next);
    setPhase(next?.reviews?.length ? 'done' : 'ask');
    setError('');
  }, [id]);

  if (!run || run.attemptIds.length === 0) {
    return (
      <main className="page">
        <h1>No session</h1>
        <p className="lede">練習を始めると、10問程度が終わったところでまとめが出ます。</p>
        <Link to="/history" className="btn secondary">
          記録を見る
        </Link>
      </main>
    );
  }

  const session = run;
  const attempts = session.attemptIds
    .map((id) => loadAttempt(id))
    .filter((attempt): attempt is Attempt => attempt != null);
  const correctCount = attempts.filter((attempt) => attemptWasCorrect(attempt)).length;
  const average =
    attempts.length === 0
      ? 0
      : Math.round(attempts.reduce((sum, attempt) => sum + attempt.overallScore, 0) / attempts.length);
  const reviews = new Map((run.reviews ?? []).map((review) => [review.attemptId, review]));
  const sentenceRisks = attempts.filter((attempt) => {
    const review = reviews.get(attempt.id);
    return review && !review.unavailable && review.words.length > 0 && !review.correct;
  }).length;
  const pronunciationNotes = attempts.filter((attempt) => {
    const review = reviews.get(attempt.id);
    return review && !review.unavailable && review.pronunciation.length > 0;
  }).length;

  async function onRequest() {
    const key = apiKey.trim();
    if (!key) {
      setError('Gemini の APIキーを入れてください。');
      return;
    }
    setError('');
    saveGeminiKey(key);
    setPhase('sending');
    try {
      const next = await transcribeAttempts(attempts, key);
      savePracticeReviews(next, session);
      setRun(loadSavedSession(session.id));
      setPhase('done');
    } catch (caught) {
      setPhase('ask');
      setError(caught instanceof Error ? caught.message : 'Gemini への依頼に失敗しました。');
    }
  }

  return (
    <main className="page">
      <p className="eyebrow">{partLabel(run.part)}</p>
      <h1>Session</h1>
      <p className="lede">
        {run.part === 'A' ? '1セットが終わったので、ここまでの結果をまとめています。' : `${practiceRunSize(run.part)}問が終わったので、ここまでの結果をまとめています。`}
      </p>
      <p className="score-kicker">On this device</p>
      <p className="score" data-testid="session-correct">
        {correctCount}/{attempts.length}
      </p>
      <p className="muted">正解した問の数です。練習点の平均は {average} です。本番の Versant スコアではありません。</p>
      <p className="disclaimer">
        この10問は区切りです。正否とチェックはブラウザに残るので、次の練習は間違えた問題から続きます。このまとめでは、各問の合格と3連続は変えません。
      </p>

      <section className="card">
        <h2>Items</h2>
        <ul className="session-list">
          {attempts.map((attempt, index) => {
            const correct = attemptWasCorrect(attempt);
            const review = reviews.get(attempt.id);
            return (
              <li key={attempt.id}>
                <Link to={`/history/${attempt.id}`}>
                  <span>{index + 1}</span>
                  <strong lang="en">{attempt.sentenceText}</strong>
                  <small className={correct ? 'good' : 'bad'}>{correct ? 'Correct' : 'Incorrect'} · {attempt.overallScore}</small>
                </Link>
                {review?.unavailable ? <p className="muted">{review.unavailable}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" data-testid="gemini-ask">
        <h2>Gemini に聞きますか？</h2>
        <p>
          録音と正解文をまとめて送ります。単語が確かに聞こえるか、余分な語や言い直しがあるか、気になる発音はどこかを答えさせます。正答を増やす採点ではありません。
        </p>
        <p className="muted">発音の点数は出しません。各問の合格とチェックも書き換えません。アプリに共通のキーはありません。使う人が自分の Gemini APIキーを貼ります。利用料はそのキーのアカウントにかかり、キーはこの端末にだけ残します。</p>
        {phase === 'declined' ? (
          <p className="note">依頼しませんでした。端末の判定のままです。</p>
        ) : null}
        {phase === 'sending' ? <p className="note">録音を送っています。10問分なので、少し待ちます。</p> : null}
        {error ? <p className="note">{error}</p> : null}
        {phase !== 'sending' ? (
          <>
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
            <div className="actions">
              <button type="button" className="btn" data-testid="request-gemini" onClick={() => void onRequest()}>
                Geminiに聞く
              </button>
              {phase === 'ask' ? (
                <button
                  type="button"
                  className="btn secondary"
                  data-testid="skip-gemini"
                  onClick={() => {
                    setError('');
                    setPhase('declined');
                  }}
                >
                  依頼しない
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      {phase === 'done' && run.reviews ? (
        <section className="card" data-testid="gemini-result">
          <h2>Gemini の聞き取り</h2>
          <p>
            文として減点されうる問は {sentenceRisks} 問です。発音の指摘がある問は {pronunciationNotes} 問です。本番の点数ではなく、合格とチェックも変えていません。
          </p>
          {attempts.map((attempt, index) => {
            const review = reviews.get(attempt.id);
            if (!review || review.unavailable) return null;
            if (review.words.length === 0) {
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
            const fuzzyWords = new Set(
              review.pronunciation.map((note) => wordKey(note.word)).filter(Boolean),
            );
            return (
              <article key={attempt.id} className="review-block">
                <p className={risk ? 'review-head bad' : 'review-head good'}>
                  {index + 1}. {risk ? '不正解' : '正解'}
                </p>
                <p className="review-target" lang="en">
                  {paintTarget(attempt.sentenceText, review.words).map((part, partIndex) =>
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
                  {paintAnswer(review.words, review.transcript, fuzzyWords).map((part, partIndex) => (
                    <span className={part.paint === 'ok' ? undefined : part.paint} key={`${part.text}-${partIndex}`}>
                      {part.text}
                    </span>
                  ))}
                </p>
                {review.pronunciation.length > 0 ? (
                  <ul className="review-notes">
                    {review.pronunciation.map((note) => (
                      <li key={`${note.word}-${note.note}`}>{note.note}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

      <div className="actions">
        <Link to={againPath(run.part)} className="btn">
          Again
        </Link>
        <Link to="/history" className="btn secondary">
          History
        </Link>
      </div>
    </main>
  );
}

function sessionFrom(id: string | undefined): SavedSession | null {
  if (id) return loadSavedSession(id);
  const current = loadPracticeRun();
  if (!current || current.attemptIds.length === 0) return null;
  return loadSavedSession(current.id);
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

function partLabel(part: PracticePart): string {
  if (part === 'A') return 'Part A';
  if (part === 'B-read') return 'Read along';
  return 'Part B';
}

function againPath(part: PracticePart): string {
  if (part === 'A') return '/a';
  if (part === 'B-read') return '/read';
  return '/practice';
}
