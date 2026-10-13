import type { Quest } from '../../meta/quests';
import { questTitle } from '../../meta/quests';

export function QuestCard({ q }: { q: Quest }) {
  const pct = Math.round((q.progress / q.target) * 100);
  return (
    <div className="card stack-sm">
      <div className="row">
        <span aria-hidden="true">{q.done ? '✅' : '⬜'}</span>
        <span style={{ fontWeight: 700 }}>{questTitle(q.kind)}</span>
        <span className="sr-only">{q.done ? '완료' : `${pct}%`}</span>
        <span className="t-small muted" style={{ marginLeft: 'auto' }}>
          {Math.round(q.progress)}/{q.target}
        </span>
      </div>
      <div className={`bar${q.done ? ' green' : ''}`} aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
