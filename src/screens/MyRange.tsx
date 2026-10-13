import { useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { lowerCeilingBy1, toast, useApp } from '../app/store';
import { KeyboardMap } from '../design/components/KeyboardMap';
import { NoteText } from '../design/components/NoteText';
import { keyboardRange } from '../meta/collection';
import { intlName } from '../audio/noteMath';
import { DAY_MS } from '../meta/dates';

// S9 내 음역: 컬렉션 키보드, 상한 추이(SVG), 재측정·상한 낮추기
export function MyRange() {
  const nav = useNavigate();
  const s = useApp();
  const c = s.progress.ceiling;
  const last = s.ranges[s.ranges.length - 1];
  const [from, to] = keyboardRange(c?.lowest ?? last?.lowest, c?.observedMax ?? last?.highestAbs);
  const stale = last && Date.now() - last.at > 28 * DAY_MS;
  return (
    <div className="stack">
      <h1 className="t-title">{ko.myRange.title}</h1>
      {stale && <div className="card warm">{ko.myRange.retestSuggest}</div>}
      <section className="card stack-sm">
        <h2 className="section-title">{ko.myRange.collection}</h2>
        <KeyboardMap from={from} to={to} notes={s.notes} target={c?.practiceTarget} />
        <div className="row wrap t-small">
          <span>🟩 {ko.myRange.legendAcquired}</span>
          <span>▢ {ko.myRange.legendTouched}</span>
          <span>⬜ {ko.myRange.legendNone}</span>
          <span>🔷 {ko.myRange.legendTarget}</span>
        </div>
      </section>
      {c && (
        <section className="card stack-sm">
          <div className="row-between">
            <span className="muted">{ko.myRange.ceiling}</span>
            <span className="t-heading">
              <NoteText midi={c.comfortableCeiling} />
            </span>
          </div>
          <button
            className="btn secondary"
            disabled={c.comfortableCeiling <= c.lowest + 3}
            onClick={async () => {
              if (await lowerCeilingBy1()) toast(ko.myRange.lowered);
            }}
          >
            {ko.myRange.lowerCeiling}
          </button>
          <p className="t-small muted">{ko.rangeResult.lowerNote}</p>
        </section>
      )}
      <section className="card stack-sm">
        <h2 className="section-title">{ko.myRange.trend}</h2>
        {s.ranges.length < 2 ? <p className="muted">{ko.myRange.noTrend}</p> : <TrendChart points={s.ranges.map((r) => ({ at: r.at, v: r.comfortMax }))} />}
      </section>
      <button className="btn primary" onClick={() => nav(s.session ? '/range' : '/precheck')}>
        {ko.myRange.retest}
      </button>
    </div>
  );
}

function TrendChart({ points }: { points: { at: number; v: number }[] }) {
  const W = 320;
  const H = 140;
  const pad = 32;
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs) - 1;
  const hi = Math.max(...vs) + 1;
  const t0 = points[0].at;
  const t1 = points[points.length - 1].at || t0 + 1;
  const x = (t: number) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad - 8);
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (H - 28);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.at)},${y(p.v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`편한 최고음 추이: ${points.map((p) => intlName(p.v)).join(', ')}`}>
      {[lo + 1, hi - 1].map((v) => (
        <g key={v}>
          <line x1={pad} x2={W - 8} y1={y(v)} y2={y(v)} stroke="rgba(29,28,29,.13)" />
          <text x={2} y={y(v) + 4} fontSize={11} fill="#1D1C1D">
            {intlName(v)}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke="#4A154B" strokeWidth={2} />
      {points.map((p) => (
        <circle key={p.at} cx={x(p.at)} cy={y(p.v)} r={4} fill="#4A154B" />
      ))}
    </svg>
  );
}
