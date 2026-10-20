import type { DiffOp } from '../types';
import { diffCounts } from '../lib/score';

export function WordDiff({ ops }: { ops: DiffOp[] }) {
  const counts = diffCounts(ops);
  return (
    <div className="diff-block">
      <div className="legend">
        <span>一致 {counts.match}</span>
        <span>置換 {counts.sub}</span>
        <span>不足 {counts.missing}</span>
        <span>余分 {counts.extra}</span>
      </div>
      <div className="diff" aria-label="単語の比較">
        {ops.length === 0 ? <p className="muted">比べる単語がありません。</p> : null}
        {ops.map((op, index) => {
          if (op.type === 'match') {
            return (
              <span className="token match" key={`${op.type}-${index}`}>
                <small>一致</small>
                {op.word}
              </span>
            );
          }
          if (op.type === 'sub') {
            return (
              <span className="token sub" key={`${op.type}-${index}`}>
                <small>正解 {op.expected}</small>
                {op.actual}
              </span>
            );
          }
          if (op.type === 'missing') {
            return (
              <span className="token missing" key={`${op.type}-${index}`}>
                <small>不足</small>
                {op.expected}
              </span>
            );
          }
          return (
            <span className="token extra" key={`${op.type}-${index}`}>
              <small>余分</small>
              {op.actual}
            </span>
          );
        })}
      </div>
    </div>
  );
}
