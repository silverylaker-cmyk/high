// §2.2 C 음계 등반 진행 규칙(순수). D1: 목표음은 편한 상한 이하, 성공해도 상한은 오르지 않는다.
export const PLATFORMS = 5;
export const MAX_HEARTS = 3;
export const UNMEASURABLE_PAUSE = 3;

export interface ClimbState {
  platforms: number[];
  idx: number;
  hearts: number;
  unmeasurableStreak: number;
  held: number[];
  done: null | 'top' | 'hearts' | 'signal';
}

/** 목표음−4 ~ 목표음. 최저음 아래로는 내려가지 않는다 */
export function makePlatforms(target: number, lowest: number): number[] {
  const start = Math.max(lowest, target - (PLATFORMS - 1));
  const out: number[] = [];
  for (let m = start; m <= target; m++) out.push(m);
  return out;
}

export function initClimb(target: number, lowest: number): ClimbState {
  return { platforms: makePlatforms(target, lowest), idx: 0, hearts: MAX_HEARTS, unmeasurableStreak: 0, held: [], done: null };
}

export function applyOutcome(s: ClimbState, outcome: 'success' | 'fail' | 'unmeasurable'): ClimbState {
  if (s.done) return s;
  if (outcome === 'unmeasurable') {
    // 신호 불량은 실패로 벌하지 않는다(D4)
    const streak = s.unmeasurableStreak + 1;
    return { ...s, unmeasurableStreak: streak, done: streak >= UNMEASURABLE_PAUSE ? 'signal' : null };
  }
  if (outcome === 'success') {
    const held = [...s.held, s.platforms[s.idx]];
    const idx = s.idx + 1;
    return { ...s, held, idx: Math.min(idx, s.platforms.length - 1), unmeasurableStreak: 0, done: idx >= s.platforms.length ? 'top' : null };
  }
  const hearts = s.hearts - 1;
  return { ...s, hearts, unmeasurableStreak: 0, done: hearts <= 0 ? 'hearts' : null };
}

export const currentTarget = (s: ClimbState) => s.platforms[s.idx];
export const isTop = (s: ClimbState) => s.idx === s.platforms.length - 1;
