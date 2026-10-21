export type StoryPointRow = {
  id: string;
  label: string;
  covered?: boolean;
  status?: 'covered' | 'partial' | 'missing';
};

export function StoryPoints({ points }: { points: StoryPointRow[] }) {
  return (
    <ul className="point-list" data-testid="story-points">
      {points.map((point) => {
        const status = point.status ?? (point.covered ? 'covered' : 'missing');
        const mark = status === 'covered' ? '入った' : status === 'partial' ? '一部' : '無い';
        return (
          <li key={point.id}>
            <span className={status}>{mark}</span>
            <span>{point.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
