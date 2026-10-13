import { useEffect, useMemo } from 'react';
import { useApp } from '../../app/store';

// 축하 연출: 최대 1.2 s, core 액센트 4색 단색 조각. reduced-motion이면 페이드 텍스트만
const COLORS = ['#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A'];

export function Celebrate() {
  const text = useApp((s) => s.celebrate);
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => useApp.setState({ celebrate: null }), 1600);
    return () => clearTimeout(t);
  }, [text]);
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bits = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ x: Math.random() * 100, d: Math.random() * 0.4, c: COLORS[i % 4], r: Math.random() * 360 })),
    [text],
  );
  if (!text) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {!reduced &&
        bits.map((b, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${b.x}%`,
              top: -12,
              width: 8,
              height: 12,
              background: b.c,
              transform: `rotate(${b.r}deg)`,
              animation: `drop 1.2s ${b.d}s ease-out forwards`,
            }}
          />
        ))}
      <style>{'@keyframes drop{to{transform:translateY(70vh) rotate(540deg);opacity:0}}'}</style>
    </div>
  );
}
