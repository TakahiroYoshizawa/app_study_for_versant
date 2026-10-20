import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { READING_SETS, situationLabel } from '../data/readings';
import { MASTER_STREAK, progressByItem, statusLabel } from '../lib/progress';
import { openPracticeRun } from '../lib/practice-run';
import { beginReading, beginReadingSet } from '../lib/reading-session';
import { getAudioContext } from '../lib/speech';
import { loadAttempts } from '../lib/storage';

export function ReadingQuestions() {
  const navigate = useNavigate();
  const [attempts] = useState(() => loadAttempts());
  const progress = progressByItem(attempts);

  function startSet(setId: string) {
    getAudioContext();
    openPracticeRun('A');
    beginReadingSet(setId);
    navigate('/a/practice', { state: { autostart: true } });
  }

  function startOne(setId: string, number: number) {
    getAudioContext();
    beginReading(setId, number, false);
    navigate('/a/practice', { state: { autostart: true } });
  }

  return (
    <main className="page">
      <p className="eyebrow">Part A</p>
      <h1>Progress</h1>
      <p className="lede">
        間違えた文にはチェックが付きます。{MASTER_STREAK}回連続で正解すると、その文は理解できたものとします。
      </p>
      {READING_SETS.map((set) => {
        const checked = set.sentences.filter((sentence) => progress.get(sentence.id)?.checked).length;
        const mastered = set.sentences.filter((sentence) => progress.get(sentence.id)?.mastered).length;
        return (
          <section key={set.id} className="card">
            <h2>{situationLabel(set.id)}</h2>
            <p className="muted">
              Check {checked} · Done {mastered} · {set.sentences.length}
            </p>
            <button type="button" className="btn" onClick={() => startSet(set.id)}>
              Start set
            </button>
            <ul className="question-list">
              {set.sentences.map((sentence) => {
                const status = progress.get(sentence.id);
                return (
                  <li key={sentence.id} className="question-row">
                    <span className={status?.checked ? 'mark on' : status?.mastered ? 'mark done' : 'mark'}>
                      {status?.mastered ? 'OK' : status?.checked ? '✓' : ''}
                    </span>
                    <span>
                      <strong>
                        {sentence.number}. {statusLabel(status)}
                      </strong>
                      <small lang="en">{sentence.text}</small>
                    </span>
                    <button type="button" className="btn secondary" onClick={() => startOne(set.id, sentence.number)}>
                      This one
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
