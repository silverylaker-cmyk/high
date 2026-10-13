import { useLocation, useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { lowerCeilingBy1, toast, useApp } from '../app/store';
import { KeyboardMap } from '../design/components/KeyboardMap';
import { NoteText } from '../design/components/NoteText';
import { keyboardRange } from '../meta/collection';

// S3 측정 결과. 상한은 낮추기만 가능(D1). 끊김 위치는 표시 전용(D2)
export function RangeResult() {
  const nav = useNavigate();
  const loc = useLocation();
  const ranges = useApp((s) => s.ranges);
  const ceiling = useApp((s) => s.progress.ceiling);
  const notes = useApp((s) => s.notes);
  const t = ranges[ranges.length - 1];
  if (!t || !ceiling) return <p>{ko.range.notEnough}</p>;
  const prevId = (loc.state as { prevId?: number | null } | null)?.prevId;
  const prev = prevId != null ? ranges.find((r) => r.id === prevId) : ranges.length > 1 ? ranges[ranges.length - 2] : undefined;
  const [from, to] = keyboardRange(t.lowest, t.highestAbs);
  const kept = prev && t.comfortMax > ceiling.comfortableCeiling;

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1 className="t-title">{ko.rangeResult.title}</h1>
      <KeyboardMap from={from} to={to} notes={notes} target={ceiling.practiceTarget} />
      <div className="card warm stack-sm">
        <Row label={ko.rangeResult.lowest} midi={t.lowest} />
        <Row label={ko.rangeResult.comfort} midi={ceiling.comfortableCeiling} />
        <Row label={ko.rangeResult.highest} midi={t.highestAbs} />
        <div className="row-between">
          <span className="muted">{ko.rangeResult.breakSpot}</span>
          <span>{t.passaggio != null ? <NoteText midi={t.passaggio} /> : ko.rangeResult.none}</span>
        </div>
        <p className="t-small muted">{ko.rangeResult.breakSpotNote}</p>
      </div>
      {prev && <p>{ko.rangeResult.diff(t.comfortMax - prev.comfortMax)}</p>}
      {kept && <p className="t-small muted">{ko.rangeResult.retestKept}</p>}
      <div className="card stack-sm">
        <span className="muted">{ko.rangeResult.target}</span>
        <span className="t-display">
          <NoteText midi={ceiling.practiceTarget} />
        </span>
        <p className="t-small muted">{ko.rangeResult.targetNote}</p>
        <button
          className="btn secondary"
          onClick={async () => {
            const c = await lowerCeilingBy1();
            if (c) toast(ko.myRange.lowered);
          }}
          disabled={ceiling.comfortableCeiling <= ceiling.lowest + 3}
        >
          {ko.rangeResult.lower}
        </button>
        <p className="t-small muted">{ko.rangeResult.lowerNote}</p>
      </div>
      <button className="btn primary lg" onClick={() => nav('/play/bubble')}>
        {ko.rangeResult.cta}
      </button>
    </div>
  );
}

function Row({ label, midi }: { label: string; midi: number }) {
  return (
    <div className="row-between">
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 700 }}>
        <NoteText midi={midi} />
      </span>
    </div>
  );
}
