import { isBlackKey, noteLabel } from '../../audio/noteMath';
import type { NoteEntry } from '../../meta/collection';

// 흰/검 건반. 획득 = green 채움, 순간 도달 = green 외곽선, 목표음 = blue 외곽선 + 깜빡임
export function KeyboardMap({
  from,
  to,
  notes,
  target,
  marks,
}: {
  from: number;
  to: number;
  notes: Record<number, NoteEntry>;
  target?: number | null;
  marks?: { midi: number; label: string }[];
}) {
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (!isBlackKey(m)) whites.push(m);
  const W = 22;
  const H = 90;
  const width = whites.length * W;
  const xOf = (m: number) => whites.indexOf(m) * W;
  const fillFor = (m: number) => (notes[m]?.state === 'acquired' ? 'var(--c-green)' : undefined);
  const strokeFor = (m: number) => (notes[m]?.state === 'touched' ? 'var(--c-green)' : undefined);
  const blacks: number[] = [];
  for (let m = from; m <= to; m++) if (isBlackKey(m)) blacks.push(m);
  const summary = Object.values(notes)
    .filter((n) => n.state === 'acquired')
    .map((n) => noteLabel(n.midi))
    .join(', ');
  return (
    <div className="kbd">
      <svg width={width} height={H + 22} viewBox={`0 0 ${width} ${H + 22}`} role="img" aria-label={summary ? `획득한 음: ${summary}` : '아직 획득한 음이 없어요'}>
        {whites.map((m) => (
          <g key={m}>
            <rect x={xOf(m) + 0.5} y={0.5} width={W - 1} height={H} rx={3} fill={fillFor(m) ?? '#fff'} stroke={strokeFor(m) ?? 'rgba(29,28,29,.3)'} strokeWidth={strokeFor(m) ? 3 : 1} />
            {m % 12 === 0 && (
              <text x={xOf(m) + W / 2} y={H + 16} fontSize={10} textAnchor="middle" fill="#1D1C1D">
                {noteLabel(m).split(' · ')[1] ?? noteLabel(m)}
              </text>
            )}
          </g>
        ))}
        {blacks.map((m) => {
          const x = xOf(m - 1) + W - 7;
          return (
            <rect key={m} x={x} y={0.5} width={14} height={H * 0.6} rx={2} fill={fillFor(m) ?? '#1D1C1D'} stroke={strokeFor(m) ?? '#1D1C1D'} strokeWidth={strokeFor(m) ? 3 : 1} />
          );
        })}
        {target != null && target >= from && target <= to && (
          <rect
            className="target"
            x={isBlackKey(target) ? xOf(target - 1) + W - 8 : xOf(target) + 1}
            y={1}
            width={isBlackKey(target) ? 16 : W - 2}
            height={isBlackKey(target) ? H * 0.6 : H - 1}
            rx={3}
            fill="none"
            stroke="var(--c-blue)"
            strokeWidth={3}
          />
        )}
        {marks?.map((mk) =>
          mk.midi >= from && mk.midi <= to ? (
            <g key={mk.label}>
              <circle cx={(isBlackKey(mk.midi) ? xOf(mk.midi - 1) + W : xOf(mk.midi) + W / 2)} cy={H - 10} r={5} fill="var(--c-aubergine)" />
            </g>
          ) : null,
        )}
      </svg>
    </div>
  );
}
