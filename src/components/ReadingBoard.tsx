import type { ReadingSet } from '../data/readings';

export function ReadingBoard({ set, emphasize }: { set: ReadingSet; emphasize?: number }) {
  return (
    <div className="reading-board" data-testid="reading-board">
      {([1, 2] as const).map((group) => (
        <ol key={group} className="reading-group">
          {set.sentences
            .filter((sentence) => sentence.group === group)
            .map((sentence) => (
              <li
                key={sentence.id}
                className={emphasize === sentence.number ? 'reading-line current' : 'reading-line'}
              >
                <span>{sentence.number}.</span>
                <span lang="en">{sentence.text}</span>
              </li>
            ))}
        </ol>
      ))}
    </div>
  );
}
