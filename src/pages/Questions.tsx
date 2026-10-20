import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SENTENCES, difficultyLabel } from '../data/sentences';
import { getAudioContext } from '../lib/speech';
import { MASTER_STREAK, progressByItem, statusLabel } from '../lib/progress';
import { openPracticeRun } from '../lib/practice-run';
import { beginItem } from '../lib/session';
import { loadAttempts } from '../lib/storage';

export function Questions({ visible = false }: { visible?: boolean }) {
  const navigate = useNavigate();
  const [attempts] = useState(() => loadAttempts());
  const progress = progressByItem(attempts);
  const statusId = (id: string) => (visible ? `read:${id}` : id);
  const checkedCount = SENTENCES.filter((sentence) => progress.get(statusId(sentence.id))?.checked).length;
  const masteredCount = SENTENCES.filter((sentence) => progress.get(statusId(sentence.id))?.mastered).length;

  function start(sentenceId: string) {
    getAudioContext();
    openPracticeRun(visible ? 'B-read' : 'B');
    beginItem(sentenceId, visible);
    navigate(visible ? '/read' : '/practice', { state: { autostart: true } });
  }

  return (
    <main className="page">
      <p className="eyebrow">{visible ? 'Part B · 見て読む' : 'Part B · 問題一覧'}</p>
      <h1>正否の記録</h1>
      <p className="lede">
        {visible
          ? '英文を見ながら読む練習です。聞こえて繰り返す練習とは、正否を別に数えます。'
          : '間違えた問題にはチェックが付きます。'}
        {MASTER_STREAK}回連続で正解すると、その問題は理解できたものとします。チェックが付いている問題を優先して出します。
      </p>
      <p className="muted">
        チェック {checkedCount} · 理解できた {masteredCount} · 全 {SENTENCES.length}
      </p>
      <ul className="question-list">
        {SENTENCES.map((sentence, index) => {
          const status = progress.get(statusId(sentence.id));
          const showText = visible || Boolean(status && status.attempts > 0);
          return (
            <li key={sentence.id} className="question-row" data-testid="question-row">
              <span className={status?.checked ? 'mark on' : status?.mastered ? 'mark done' : 'mark'}>
                {status?.mastered ? '済' : status?.checked ? '✓' : ''}
              </span>
              <span>
                <strong>
                  {index + 1}. {difficultyLabel(sentence.difficulty)} · {statusLabel(status)}
                </strong>
                <small lang="en">{showText ? sentence.text : 'まだ出題前なので、文は隠しています。'}</small>
              </span>
              <button type="button" className="btn secondary" onClick={() => start(sentence.id)}>
                この問題
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
