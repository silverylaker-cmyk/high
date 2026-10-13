import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { setManualCeiling, useApp } from '../app/store';
import { engine } from '../audio/engine';
import { noteLabel } from '../audio/noteMath';

// 음역 측정 없이 편한 한 음으로 시작(검수: 측정 실패·컨디션 저하 시 대체 경로)
export function ManualCeiling() {
  const nav = useNavigate();
  const existing = useApp((s) => s.progress.ceiling);
  const a4 = useApp((s) => s.profile.settings.a4);
  const [midi, setMidi] = useState(existing?.comfortableCeiling ?? 64);
  const max = existing ? existing.comfortableCeiling : 84;
  const options: number[] = [];
  for (let m = 52; m <= max; m++) options.push(m);
  return (
    <div className="stack" style={{ maxWidth: 520 }}>
      <h1 className="t-title">{ko.rangeResult.manualTitle}</h1>
      <p>{ko.rangeResult.manualBody}</p>
      <label className="field">
        <span className="sr-only">{ko.rangeResult.manualTitle}</span>
        <select value={midi} onChange={(e) => setMidi(Number(e.target.value))}>
          {options.map((m) => (
            <option key={m} value={m}>
              {noteLabel(m)}
            </option>
          ))}
        </select>
      </label>
      {engine.ctx && (
        <button className="btn secondary" onClick={() => engine.playReference(midi, 0.8, a4)}>
          {ko.range.comfortListen}
        </button>
      )}
      <button
        className="btn primary lg"
        onClick={async () => {
          await setManualCeiling(midi);
          nav('/', { replace: true });
        }}
      >
        {ko.rangeResult.manualSave}
      </button>
    </div>
  );
}
