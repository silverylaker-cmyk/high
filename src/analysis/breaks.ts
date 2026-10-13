import type { TrackedFrame } from '../audio/types';

// §4.6 추적 끊김 감지. D2: 옥타브 오류·숨·립트릴 변조·잡음으로도 생기므로
// '음정 추적 끊김(원인 미확인)'으로만 표시하고 점수·콤보·목표 생성에 쓰지 않는다.
// 옥타브 가드가 숨긴 점프도 잡도록 평활값이 아닌 원시값(rawMidi)으로 판단한다(P0-2).
export interface BreakEvent {
  t: number;
  midi: number;
  kind: 'jump' | 'gap';
}

const JUMP_SEMITONES = 2.5;
const JUMP_MAX_FRAMES = 2;
const GAP_MIN_MS = 30;
const GAP_MAX_MS = 150;

export class BreakDetector {
  private prev: { t: number; midi: number }[] = [];
  private lastVoiced: { t: number; midi: number } | null = null;
  private gapStart: number | null = null;
  events: BreakEvent[] = [];

  reset() {
    this.prev = [];
    this.lastVoiced = null;
    this.gapStart = null;
    this.events = [];
  }

  push(f: TrackedFrame): BreakEvent | null {
    if (f.gated) return null;
    if (f.status !== 'voiced' || f.rawMidi == null) {
      if (this.lastVoiced && this.gapStart == null) this.gapStart = this.lastVoiced.t;
      this.prev = [];
      return null;
    }
    let ev: BreakEvent | null = null;
    if (this.gapStart != null && this.lastVoiced) {
      const gapMs = (f.t - this.gapStart) * 1000;
      if (gapMs >= GAP_MIN_MS && gapMs <= GAP_MAX_MS) {
        ev = { t: f.t, midi: (this.lastVoiced.midi + f.rawMidi) / 2, kind: 'gap' };
      }
    }
    this.gapStart = null;
    if (!ev) {
      // 직전 2프레임 이내에서 2.5반음 이상 점프
      for (let k = 1; k <= Math.min(JUMP_MAX_FRAMES, this.prev.length); k++) {
        const p = this.prev[this.prev.length - k];
        if (Math.abs(f.rawMidi - p.midi) >= JUMP_SEMITONES) {
          ev = { t: f.t, midi: (p.midi + f.rawMidi) / 2, kind: 'jump' };
          this.prev = [];
          break;
        }
      }
    }
    this.prev.push({ t: f.t, midi: f.rawMidi });
    if (this.prev.length > JUMP_MAX_FRAMES) this.prev.shift();
    this.lastVoiced = { t: f.t, midi: f.rawMidi };
    if (ev) this.events.push(ev);
    return ev;
  }
}
