import { ko } from '../copy/ko';
import { useApp } from '../app/store';
import { ACHIEVEMENTS } from '../meta/achievements';

// S11 업적 배지 그리드
export function Achievements() {
  const unlocked = useApp((s) => s.achievements);
  return (
    <div className="stack">
      <h1 className="t-title">{ko.achievements.title}</h1>
      <div className="grid-2">
        {ACHIEVEMENTS.map((a) => {
          const [name, desc] = ko.achievements.items[a.id];
          const on = unlocked[a.id] != null;
          return (
            <div key={a.id} className={`card stack-sm${on ? ' warm' : ''}`} style={{ opacity: on ? 1 : 0.7 }}>
              <span style={{ fontSize: 28 }} aria-hidden="true">
                {on ? '🏅' : '🔒'}
              </span>
              <span style={{ fontWeight: 700 }}>{name}</span>
              <span className="t-small muted">{on ? desc : ko.achievements.locked}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
