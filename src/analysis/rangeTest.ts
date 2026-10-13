import type { TrackedFrame } from '../audio/types';
import { median, percentile } from '../audio/pitchTrack';

// §4.9 음역 측정 계산(순수 함수). D2: passaggio는 표시만 하고 목표 생성에 쓰지 않는다.
export const RANGE_ALGO_VERSION = 'range-1';
export const STABLE_RUN_MS = 300;

export interface StableRun {
  midi: number;
  ms: number;
}

/** 같은 반음(반올림)에 300 ms 이상 연속 머문 유성 구간 */
export function stableRuns(frames: readonly TrackedFrame[], minMs = STABLE_RUN_MS): StableRun[] {
  const runs: StableRun[] = [];
  let cur: { note: number; start: number; last: number; midis: number[] } | null = null;
  const close = () => {
    if (cur && (cur.last - cur.start) * 1000 >= minMs) runs.push({ midi: median(cur.midis), ms: (cur.last - cur.start) * 1000 });
    cur = null;
  };
  for (const f of frames) {
    if (f.gated || f.status !== 'voiced' || f.midi == null) {
      close();
      continue;
    }
    const note = Math.round(f.midi);
    if (cur && cur.note === note && f.t - cur.last < 0.06) {
      cur.last = f.t;
      cur.midis.push(f.midi);
    } else {
      close();
      cur = { note, start: f.t, last: f.t, midis: [f.midi] };
    }
  }
  close();
  return runs;
}

/** 내려가는 사이렌들 → 최저음 = 안정 구간 MIDI의 5번째 백분위수(반음 올림) */
export function computeLowest(frames: readonly TrackedFrame[]): number | null {
  const runs = stableRuns(frames);
  if (runs.length === 0) return null;
  return Math.ceil(percentile(runs.map((r) => r.midi), 5) - 0.5);
}

/** 올라가는 사이렌들 → 최고음 = 안정 구간 최고 MIDI(반음 내림) */
export function computeHighest(frames: readonly TrackedFrame[]): number | null {
  const runs = stableRuns(frames);
  if (runs.length === 0) return null;
  return Math.floor(Math.max(...runs.map((r) => r.midi)) + 1e-6);
}

/** 3회 중 2회 이상 같은 반음에서 나온 추적 끊김 위치의 중앙값. 표시 전용(원인 미확인) */
export function breakCluster(perTry: readonly number[][]): number | null {
  const counts = new Map<number, number>();
  for (const tr of perTry) {
    for (const n of new Set(tr.map((m) => Math.round(m)))) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const hits = [...counts.entries()].filter(([, c]) => c >= 2).map(([n]) => n);
  return hits.length ? Math.round(median(hits)) : null;
}

// ── 4단계: 편한 최고음 ──
export interface ComfortState {
  highestAbs: number;
  lowest: number;
  current: number;
  lastSuccess: number | null;
  consecutiveFails: number;
  unmeasurableStreak: number;
  done: boolean;
}

/** 시작음 = highestAbs − 5 (D2: passaggio 사용 안 함), 최저음 아래로 내려가지 않음 */
export function comfortStart(highestAbs: number, lowest: number): ComfortState {
  const start = Math.min(highestAbs, Math.max(lowest + 2, highestAbs - 5));
  return { highestAbs, lowest, current: start, lastSuccess: null, consecutiveFails: 0, unmeasurableStreak: 0, done: false };
}

export type ComfortOutcome = 'success' | 'fail' | 'unmeasurable';

/** 반음씩 올리며 2회 연속 실패 시 중단. highestAbs 위로는 절대 제시하지 않음 */
export function comfortNext(s: ComfortState, outcome: ComfortOutcome): ComfortState {
  if (s.done) return s;
  if (outcome === 'unmeasurable') {
    // 측정 불가는 실패로 세지 않되, 3번 연속이면 측정을 끝낸다
    const streak = s.unmeasurableStreak + 1;
    return { ...s, unmeasurableStreak: streak, done: streak >= 3 };
  }
  if (outcome === 'success') {
    const next = s.current + 1;
    return {
      ...s,
      lastSuccess: s.current,
      consecutiveFails: 0,
      unmeasurableStreak: 0,
      current: Math.min(next, s.highestAbs),
      done: next > s.highestAbs,
    };
  }
  const fails = s.consecutiveFails + 1;
  return { ...s, consecutiveFails: fails, unmeasurableStreak: 0, done: fails >= 2 };
}

export function comfortResult(s: ComfortState): number {
  if (s.lastSuccess != null) return s.lastSuccess;
  // 한 번도 유지하지 못했으면 시작음보다 두 반음 아래를 보수적으로 사용
  return Math.max(s.lowest, Math.min(s.highestAbs, s.current - 2));
}
