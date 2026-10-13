import type { TrackedFrame } from '../../src/audio/types';

export const HOP = 512 / 48000;

export function tf(t: number, midi: number | null, extra: Partial<TrackedFrame> = {}): TrackedFrame {
  return {
    id: Math.round(t / HOP),
    t,
    status: midi == null ? 'unvoiced' : 'voiced',
    clarity: midi == null ? 0.2 : 0.95,
    rmsDb: -20,
    relDb: 0,
    rawMidi: midi,
    midi,
    displayMidi: midi,
    octaveGuarded: false,
    gated: false,
    ...extra,
  };
}

/** start초부터 dur초 동안 midiAt(t)로 프레임 생성 */
export function frames(start: number, dur: number, midiAt: (t: number) => number | null, extra: Partial<TrackedFrame> = {}): TrackedFrame[] {
  const out: TrackedFrame[] = [];
  for (let t = start; t < start + dur; t += HOP) out.push(tf(t, midiAt(t), extra));
  return out;
}
