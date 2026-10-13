import { ko } from '../../copy/ko';
import type { CoachMessage } from '../../data/db';

const EMOJIS = ['👍', '🙂', '💪'];

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function MessageCard({ m, onReact }: { m: CoachMessage; onReact?: (emoji: string) => void }) {
  return (
    <div className="msg">
      <img src="./images/coach-avatar.png" alt="" />
      <div className="stack-sm" style={{ gap: 4, minWidth: 0 }}>
        <div>
          <span className="name">{ko.coachName}</span>
          <time className="time">{fmtTime(m.at)}</time>
        </div>
        <p>{m.text}</p>
        {onReact && (
          <div className="row" style={{ gap: 4 }} aria-label={ko.coach.react}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                className={`pill${m.reactions[e] ? ' selected' : ''}`}
                aria-pressed={!!m.reactions[e]}
                onClick={() => onReact(e)}
              >
                {e} {m.reactions[e] ?? 0}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
