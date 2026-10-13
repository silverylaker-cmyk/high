import type { TrackedFrame } from '../../audio/types';

// §2.2 B 사이렌 판정(순수). D2: 추적 끊김은 별도로 세기만 하고 점수·콤보에 반영하지 않는다.
export const GLIDE_SEC = 7;
export const GLIDES_PER_ROUND = 5;
export const COMBO_STEP_SEC = 0.5;
export const MIN_VALID_RATIO = 0.3;
const GRACE_SEC = 0.15;

/** 저음 → 상한 → 저음, 부드러운 코사인 곡선 */
export function pathMidi(low: number, top: number, t: number, T = GLIDE_SEC): number {
  const u = Math.max(0, Math.min(1, t / T));
  return low + (top - low) * (0.5 - 0.5 * Math.cos(2 * Math.PI * u));
}

/** 경로가 고음역(상한−2 이상)에 머무는 시간(초). 발성 창 총시간으로 연습량을 센다(P0-5) */
export function highZoneSeconds(low: number, top: number, zoneFrom: number, T = GLIDE_SEC, steps = 700): number {
  let n = 0;
  for (let i = 0; i < steps; i++) if (pathMidi(low, top, ((i + 0.5) / steps) * T, T) >= zoneFrom) n++;
  return (n / steps) * T;
}

export class GlideScorer {
  frames = 0;
  voiced = 0;
  inTube = 0;
  combo = 0;
  maxCombo = 0;
  private inRunSec = 0;
  private outSec = 0;
  private lastT: number | null = null;

  constructor(
    private low: number,
    private top: number,
    private t0: number,
    private tubeCents: number,
  ) {}

  push(f: TrackedFrame): { inTube: boolean; path: number } {
    const path = pathMidi(this.low, this.top, f.t - this.t0);
    if (f.gated || (this.lastT != null && f.t <= this.lastT)) return { inTube: false, path };
    const dt = this.lastT == null ? 0 : Math.min(0.03, f.t - this.lastT);
    this.lastT = f.t;
    this.frames++;
    const voiced = f.status === 'voiced' && f.midi != null;
    if (voiced) this.voiced++;
    const ok = voiced && Math.abs(f.midi! - path) * 100 <= this.tubeCents;
    if (ok) {
      this.inTube++;
      this.outSec = 0;
      this.inRunSec += dt;
      while (this.inRunSec >= COMBO_STEP_SEC) {
        this.inRunSec -= COMBO_STEP_SEC;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
      }
    } else {
      this.outSec += dt;
      if (this.outSec > GRACE_SEC) {
        this.combo = 0;
        this.inRunSec = 0;
      }
    }
    return { inTube: ok, path };
  }

  validRatio() {
    return this.frames ? this.voiced / this.frames : 0;
  }

  measurable() {
    return this.frames > 0 && this.validRatio() >= MIN_VALID_RATIO;
  }

  /** 튜브 안 프레임 비율 × 100 */
  score() {
    return this.frames ? Math.round((this.inTube / this.frames) * 100) : 0;
  }
}
