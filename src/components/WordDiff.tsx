import type { DiffOp } from '../types';
import { diffCounts } from '../lib/score';

export function WordDiff({ ops }: { ops: DiffOp[] }) {
  const counts = diffCounts(ops);
  return (
    <div className="diff-block">
      <div className="legend">
        <span>Match {counts.match}</span>
        <span>Change {counts.sub}</span>
        <span>Missing {counts.missing}</span>
        <span>Extra {counts.extra}</span>
      </div>
      <div className="diff" aria-label="Words">
        {ops.length === 0 ? <p className="muted">比べる単語がありません。</p> : null}
        {ops.map((op, index) => {
          if (op.type === 'match') {
            return (
              <span className="token match" key={`${op.type}-${index}`}>
                <small>Match</small>
                {op.word}
              </span>
            );
          }
          if (op.type === 'sub') {
            return (
              <span className="token sub" key={`${op.type}-${index}`}>
                <small>For {op.expected}</small>
                {op.actual}
              </span>
            );
          }
          if (op.type === 'missing') {
            return (
              <span className="token missing" key={`${op.type}-${index}`}>
                <small>Missing</small>
                {op.expected}
              </span>
            );
          }
          return (
            <span className="token extra" key={`${op.type}-${index}`}>
              <small>Extra</small>
              {op.actual}
            </span>
          );
        })}
      </div>
    </div>
  );
}
