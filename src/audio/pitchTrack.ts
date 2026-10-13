import { hzToMidi } from './noteMath';
import type { RawFrame, TrackedFrame } from './types';

// §4.2 유성 판정·평활화·옥타브 가드. 순수 상태 기계라 단위 테스트한다.
export interface TrackerConfig {
  a4: number;
  noiseFloorDb: number;
  refDb: number | null;
  /** 유성 판정 clarity 임계값. 기본 0.90, 립트릴·허밍 값은 실측 후 승인(P0-5) */
  minClarity: number;
  minHz: number;
  maxHz: number;
  /** noiseFloor 대비 최소 dB */
  minAboveFloorDb: number;
  clipPeak: number;
}

export const DEFAULT_TRACKER: TrackerConfig = {
  a4: 440,
  noiseFloorDb: -70,
  refDb: null,
  minClarity: 0.9,
  minHz: 65,
  maxHz: 1400,
  minAboveFloorDb: 10,
  clipPeak: 0.99,
};

const MEDIAN_N = 5;
const EMA_ALPHA = 0.35;
const OCTAVE_TOL = 0.7;
const OCTAVE_MIN_FRAMES = 4;
const GAP_RESET_SEC = 0.1;

export class PitchTracker {
  cfg: TrackerConfig;
  private hist: number[] = [];
  private lastAccepted: number | null = null;
  private octaveRun = 0;
  private ema: number | null = null;
  private lastVoicedT = -Infinity;

  constructor(cfg: Partial<TrackerConfig> = {}) {
    this.cfg = { ...DEFAULT_TRACKER, ...cfg };
  }

  setConfig(cfg: Partial<TrackerConfig>) {
    this.cfg = { ...this.cfg, ...cfg };
  }

  reset() {
    this.hist = [];
    this.lastAccepted = null;
    this.octaveRun = 0;
    this.ema = null;
    this.lastVoicedT = -Infinity;
  }

  isVoiced(f: RawFrame): boolean {
    const c = this.cfg;
    return (
      f.clarity >= c.minClarity &&
      f.rmsDb >= c.noiseFloorDb + c.minAboveFloorDb &&
      f.hz >= c.minHz &&
      f.hz <= c.maxHz
    );
  }

  push(f: RawFrame): TrackedFrame {
    const c = this.cfg;
    const relDb = c.refDb == null ? null : f.rmsDb - c.refDb;
    const base = { id: f.id, t: f.t, clarity: f.clarity, rmsDb: f.rmsDb, relDb, gated: false };

    if (f.peak >= c.clipPeak) {
      return { ...base, status: 'clipped', rawMidi: null, midi: null, displayMidi: null, octaveGuarded: false };
    }
    if (!this.isVoiced(f)) {
      if (f.t - this.lastVoicedT > GAP_RESET_SEC) {
        this.hist = [];
        this.ema = null;
        this.octaveRun = 0;
      }
      return { ...base, status: 'unvoiced', rawMidi: null, midi: null, displayMidi: null, octaveGuarded: false };
    }

    const rawMidi = hzToMidi(f.hz, c.a4);
    if (f.t - this.lastVoicedT > GAP_RESET_SEC) {
      this.hist = [];
      this.ema = null;
      this.octaveRun = 0;
    }
    this.lastVoicedT = f.t;

    let accepted = rawMidi;
    let octaveGuarded = false;
    if (this.lastAccepted != null && this.hist.length > 0) {
      const jump = Math.abs(rawMidi - this.lastAccepted);
      if (Math.abs(jump - 12) <= OCTAVE_TOL) {
        this.octaveRun++;
        if (this.octaveRun < OCTAVE_MIN_FRAMES) {
          accepted = this.lastAccepted;
          octaveGuarded = true;
        } else {
          // 4프레임 이상 지속 → 실제 이동으로 보고 이력 초기화
          this.hist = [];
          this.octaveRun = 0;
        }
      } else {
        this.octaveRun = 0;
      }
    }
    if (!octaveGuarded) this.lastAccepted = accepted;

    this.hist.push(accepted);
    if (this.hist.length > MEDIAN_N) this.hist.shift();
    const midi = median(this.hist);
    this.ema = this.ema == null ? midi : this.ema + EMA_ALPHA * (midi - this.ema);

    return { ...base, status: 'voiced', rawMidi, midi, displayMidi: this.ema, octaveGuarded };
  }
}

export function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function percentile(xs: readonly number[], p: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
}

export function stdev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1));
}
