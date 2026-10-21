import { levelLabel, usePracticeLevel, type PracticeLevel } from '../lib/level';

const LEVELS: PracticeLevel[] = [1, 2, 3, 4, 5];

export function LevelPicker({ detail = false }: { detail?: boolean }) {
  const { level, setLevel } = usePracticeLevel();
  return (
    <div className="level-block">
      <div className="level-picker" role="radiogroup" aria-label="Difficulty">
        {LEVELS.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={level === item}
            aria-label={`Level ${item}`}
            className={level === item ? 'on' : ''}
            data-testid={`level-${item}`}
            onClick={() => setLevel(item)}
          >
            {levelLabel(item)}
          </button>
        ))}
      </div>
      <p className="muted">
        {detail
          ? '1がいちばん易しく、5がいちばん難しいです。番号を一つ上げると、文は少し長くなり、質問は一段だけ考えさせます。'
          : `Level ${levelLabel(level)} の問題だけ出します。`}
      </p>
    </div>
  );
}
