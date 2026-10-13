import { ko } from '../copy/ko';
import { useApp } from '../app/store';
import { weekKey } from '../meta/dates';
import { StatTile } from '../design/components/StatTile';

// S10 기록
export function History() {
  const sessions = useApp((s) => s.sessions);
  const list = [...sessions].filter((x) => x.durationSec > 0 || x.selfCheck).reverse();
  const wk = weekKey(Date.now());
  const week = sessions.filter((x) => weekKey(x.startedAt) === wk && x.durationSec > 0);
  const sum = (f: (x: (typeof week)[number]) => number) => week.reduce((a, x) => a + f(x), 0);
  const fmt = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };
  const checkIcon = (c?: { pain: number; hoarse: number }) => (!c ? '❔' : c.pain >= 2 || c.hoarse >= 2 ? '😣' : c.pain >= 1 || c.hoarse >= 1 ? '😐' : '🙂');
  return (
    <div className="stack">
      <h1 className="t-title">{ko.history.title}</h1>
      <section className="card stack-sm">
        <h2 className="section-title">{ko.history.weekSummary}</h2>
        <div className="grid-2">
          <StatTile value={new Set(week.map((x) => new Date(x.startedAt).toDateString())).size} label={ko.history.sessions} />
          <StatTile value={ko.common.minutes(Math.round(sum((x) => x.durationSec) / 60))} label={ko.history.minutes} />
          <StatTile value={ko.common.seconds(sum((x) => x.highZoneSec))} label={ko.history.highZone} />
          <StatTile value={sum((x) => x.xpGained)} label={ko.history.xp} />
        </div>
      </section>
      {list.length === 0 && <p className="muted">{ko.history.empty}</p>}
      <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {list.map((x) => (
          <li key={x.id ?? x.startedAt} className="card row-between">
            <div className="stack-sm" style={{ gap: 2 }}>
              <span style={{ fontWeight: 700 }}>{fmt(x.startedAt)}</span>
              <span className="t-small muted">
                {ko.common.minutes(Math.round(x.durationSec / 60))} · {ko.history.highZone} {ko.common.seconds(x.highZoneSec)} · {x.xpGained} XP
                {x.interrupted ? ` · ${ko.history.interrupted}` : ''}
              </span>
            </div>
            <span aria-label={x.selfCheck ? ko.selfcheck.title : ko.history.noCheck} style={{ fontSize: 22 }}>
              {checkIcon(x.selfCheck)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
