import type { TrackedFrame } from '../audio/types';
import { stdev } from '../audio/pitchTrack';

// §4.5 유지 판정 + P1-3 보강 명세
// - 허용 오차 안에서만 heldMs 누적, 이탈(무성 포함) 중에는 누적하지 않음
// - 이탈이 graceMs(150 ms)를 넘으면 heldMs = 0 (연속 유지 기준)
// - 시간은 오디오 샘플 시각(frame.t) 기준. 프레임 누락·워커 지연은 maxDtMs로 잘라 성공을 만들지 않음
// - 중복·역순 프레임, 판정 제외(gated) 프레임은 무시
// - 발성 창이 끝났는데 유효(유성) 비율이 낮으면 실패가 아닌 '측정 불가'(P0-4, D4)
export interface HoldConfig {
  targetMidi: number;
  tolCents: number;
  holdMs: number;
  graceMs: number;
  windowMs: number;
  minMeasurableRatio: number;
  maxDtMs: number;
}

export type HoldStatus = 'idle' | 'holding' | 'success' | 'fail' | 'unmeasurable';
export type HoldReason = 'low' | 'high' | 'short' | 'invalid' | null;

export interface HoldResult {
  status: HoldStatus;
  reason: HoldReason;
  heldMs: number;
  elapsedMs: number;
  centsMean: number | null;
  centsSD: number | null;
  maxRelDb: number | null;
  measurableRatio: number;
  touched: boolean;
  /** 마지막 유성 프레임의 cents(화면 표시용) */
  lastCents: number | null;
}

export const HOLD_DEFAULTS = { graceMs: 150, windowMs: 4000, minMeasurableRatio: 0.4, maxDtMs: 30 };

export class HoldJudge {
  readonly cfg: HoldConfig;
  private lastT: number | null = null;
  private elapsedMs = 0;
  private voicedMs = 0;
  private heldMs = 0;
  private excursionMs = 0;
  private cents: number[] = [];
  private maxRelDb: number | null = null;
  private touched = false;
  private lastCents: number | null = null;
  private done: HoldResult | null = null;

  constructor(cfg: Pick<HoldConfig, 'targetMidi' | 'tolCents' | 'holdMs'> & Partial<HoldConfig>) {
    this.cfg = { ...HOLD_DEFAULTS, ...cfg };
  }

  get finished() {
    return this.done != null;
  }

  push(f: TrackedFrame): HoldResult {
    if (this.done) return this.done;
    if (f.gated) return this.snapshot('idle');
    if (this.lastT != null && f.t <= this.lastT) return this.snapshot(this.heldMs > 0 ? 'holding' : 'idle');
    const dtMs = this.lastT == null ? 0 : Math.min((f.t - this.lastT) * 1000, this.cfg.maxDtMs);
    this.lastT = f.t;
    this.elapsedMs += dtMs;

    const voiced = f.status === 'voiced' && f.midi != null;
    let inTol = false;
    if (voiced) {
      this.voicedMs += dtMs;
      const c = (f.midi! - this.cfg.targetMidi) * 100;
      this.cents.push(c);
      this.lastCents = c;
      if (f.relDb != null) this.maxRelDb = this.maxRelDb == null ? f.relDb : Math.max(this.maxRelDb, f.relDb);
      inTol = Math.abs(c) <= this.cfg.tolCents;
      if (inTol) this.touched = true;
    }

    if (inTol) {
      this.heldMs += dtMs;
      this.excursionMs = 0;
    } else {
      this.excursionMs += dtMs;
      if (this.excursionMs > this.cfg.graceMs) this.heldMs = 0;
    }

    if (this.heldMs >= this.cfg.holdMs) {
      this.done = this.snapshot('success');
      return this.done;
    }
    if (this.elapsedMs >= this.cfg.windowMs) {
      this.done = this.finish();
      return this.done;
    }
    return this.snapshot(this.heldMs > 0 ? 'holding' : 'idle');
  }

  /** 창 종료(또는 일시정지로 중단) 시 판정 확정 */
  finish(): HoldResult {
    if (this.done) return this.done;
    const ratio = this.elapsedMs > 0 ? this.voicedMs / this.elapsedMs : 0;
    if (ratio < this.cfg.minMeasurableRatio) {
      this.done = { ...this.snapshot('unmeasurable'), reason: 'invalid' };
      return this.done;
    }
    const mean = this.cents.length ? this.cents.reduce((a, b) => a + b, 0) / this.cents.length : 0;
    let reason: HoldReason = 'short';
    if (Math.abs(mean) > this.cfg.tolCents) reason = mean < 0 ? 'low' : 'high';
    this.done = { ...this.snapshot('fail'), reason };
    return this.done;
  }

  private snapshot(status: HoldStatus): HoldResult {
    const n = this.cents.length;
    return {
      status,
      reason: null,
      heldMs: this.heldMs,
      elapsedMs: this.elapsedMs,
      centsMean: n ? this.cents.reduce((a, b) => a + b, 0) / n : null,
      centsSD: n > 1 ? stdev(this.cents) : null,
      maxRelDb: this.maxRelDb,
      measurableRatio: this.elapsedMs > 0 ? this.voicedMs / this.elapsedMs : 0,
      touched: this.touched,
      lastCents: this.lastCents,
    };
  }
}
