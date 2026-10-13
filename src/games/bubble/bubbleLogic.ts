import type { TrackedFrame } from '../../audio/types';
import { stdev } from '../../audio/pitchTrack';

// §2.2 A 버블 워밍업 판정(순수). P1-4: 안정도는 cents(로그 피치) 표준편차로 계산
export type BubbleSize = 'big' | 'mid' | 'small';

export function bubbleSize(sdCents: number): BubbleSize {
  if (sdCents < 30) return 'big';
  if (sdCents <= 80) return 'mid';
  return 'small';
}

export class BubbleTracker {
  voicedSec = 0;
  totalSec = 0;
  private lastT: number | null = null;
  private window: { t: number; midi: number }[] = [];

  push(f: TrackedFrame): { voiced: boolean; sd: number | null } {
    if (f.gated) {
      this.lastT = f.t;
      return { voiced: false, sd: null };
    }
    const dt = this.lastT == null || f.t <= this.lastT ? 0 : Math.min(0.03, f.t - this.lastT);
    if (this.lastT == null || f.t > this.lastT) this.lastT = f.t;
    this.totalSec += dt;
    const voiced = f.status === 'voiced' && f.midi != null;
    if (!voiced) return { voiced: false, sd: null };
    this.voicedSec += dt;
    this.window.push({ t: f.t, midi: f.midi! });
    while (this.window.length && f.t - this.window[0].t > 1) this.window.shift();
    const sd = this.window.length >= 5 ? stdev(this.window.map((w) => w.midi * 100)) : null;
    return { voiced: true, sd };
  }

  validRatio(): number {
    return this.totalSec > 0 ? this.voicedSec / this.totalSec : 0;
  }
}
