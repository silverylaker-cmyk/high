import { useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { availability, useApp, warmupDoneToday } from '../app/store';
import { IconLock } from '../design/components/Icons';

// S5 게임 목록. 잠금 조건을 텍스트로 표시
const ORDER = ['bubble', 'siren', 'climber', 'cooldown'] as const;

export function GamesScreen() {
  const nav = useNavigate();
  const s = useApp();
  const avail = availability(s);
  return (
    <div className="stack">
      <h1 className="t-title">{ko.games.title}</h1>
      {s.session && !warmupDoneToday(s) && <div className="card warm">{ko.games.warmupBanner}</div>}
      {!s.session && (
        <button className="btn primary lg" onClick={() => nav('/precheck')}>
          {ko.home.cta}
        </button>
      )}
      <div className="grid-auto stack">
        {ORDER.map((g) => {
          const a = avail[g];
          return (
            <div key={g} className="card game stack-sm" style={{ opacity: a.ok ? 1 : 0.7 }}>
              <div className="row-between">
                <h2 className="section-title">{ko.games[g].name}</h2>
                {!a.ok && <IconLock />}
              </div>
              <p className="muted">{ko.games[g].desc}</p>
              {a.ok ? (
                <button className="btn primary" onClick={() => nav(`/play/${g}`)}>
                  {ko.games.play}
                </button>
              ) : (
                <span className="t-small" style={{ fontWeight: 700 }}>
                  🔒 {ko.games.lock[a.reason!]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
