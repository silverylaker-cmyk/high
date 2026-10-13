import { useEffect, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import { noteLabel } from '../../audio/noteMath';

/** 실시간 음 표시(초당 약 10회 갱신, 화면 읽기에는 1초 간격 요약) */
export function LivePitch() {
  const [label, setLabel] = useState('—');
  const [cents, setCents] = useState<number | null>(null);
  const last = useRef(0);
  useEffect(() => {
    return engine.subscribe((f) => {
      const now = performance.now();
      if (now - last.current < 100) return;
      last.current = now;
      if (f.status === 'voiced' && f.midi != null && !f.gated) {
        const n = Math.round(f.midi);
        setLabel(noteLabel(n));
        setCents(Math.round((f.midi - n) * 100));
        engine.noteRendered(f.t);
      } else {
        setLabel('—');
        setCents(null);
      }
    });
  }, []);
  return (
    <div className="card stack-sm" style={{ alignItems: 'center' }}>
      <span className="t-display" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {label}
      </span>
      <div style={{ width: 200, height: 8, background: 'var(--c-border)', borderRadius: 999, position: 'relative' }} aria-hidden="true">
        {cents != null && (
          <span style={{ position: 'absolute', left: `${50 + cents}%`, top: -4, width: 4, height: 16, background: 'var(--c-aubergine)', borderRadius: 2 }} />
        )}
        <span style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 12, background: 'var(--c-black)' }} />
      </div>
      <span className="t-small muted">{cents != null ? `${cents > 0 ? '+' : ''}${cents} cents` : ' '}</span>
    </div>
  );
}
