import { SAFETY_POLICY } from '../safety/config';

// D1·P0-1: 관측 최고음 / 사용자 확인 편한 상한 / 이번 연습 목표 / 획득 기록을 분리한다.
// MVP에서는 상한을 자동으로 올리지 않고, 낮추기만 상시 허용한다.
export interface Ceiling {
  /** 측정에서 관측된 최고음(highestAbs) */
  observedMax: number;
  /** 편한 상한. 측정값 또는 사용자가 낮춘 값 */
  comfortableCeiling: number;
  /** 게임의 목표음. 항상 comfortableCeiling 이하, observedMax 이하 */
  practiceTarget: number;
  lowest: number;
  updatedAt: number;
  reason: 'range-test' | 'manual-lower' | 'retest-lower' | 'cooldown-lower' | 'manual-start';
  /** 전문가 검토 등 다음 검토 예정일(선택) */
  reviewAt?: number;
}

export interface CeilingChange {
  at: number;
  from: number | null;
  to: number;
  reason: Ceiling['reason'];
}

export function ceilingFromRangeTest(
  t: { lowest: number; comfortMax: number; highestAbs: number },
  prev: Ceiling | null,
  now: number,
): Ceiling {
  const measured = Math.min(t.comfortMax, t.highestAbs);
  let comfortable = measured;
  let reason: Ceiling['reason'] = 'range-test';
  if (prev && !SAFETY_POLICY.AUTO_CEILING_RAISE) {
    // 재측정이 더 높게 나와도 상한은 올리지 않는다
    comfortable = Math.min(prev.comfortableCeiling, measured);
    reason = comfortable < prev.comfortableCeiling ? 'retest-lower' : prev.reason;
  }
  return {
    observedMax: t.highestAbs,
    comfortableCeiling: comfortable,
    practiceTarget: Math.min(comfortable, t.highestAbs),
    lowest: t.lowest,
    updatedAt: now,
    reason,
  };
}

/** 사용자가 상한을 낮춤. 올리는 값이 들어오면 그대로 둔다 */
export function lowerCeiling(c: Ceiling, to: number, now: number): Ceiling {
  const minAllowed = c.lowest + 3;
  const target = Math.max(minAllowed, Math.round(to));
  if (target >= c.comfortableCeiling) return c;
  return {
    ...c,
    comfortableCeiling: target,
    practiceTarget: Math.min(c.practiceTarget, target),
    updatedAt: now,
    reason: 'manual-lower',
  };
}

/** 등반 게임: 목표음 2라운드 연속 실패 → 다음 라운드 목표 −1(이번 세션 한정) */
export function sessionTarget(c: Ceiling, consecutiveTargetFails: number): number {
  const t = Math.min(c.practiceTarget, c.comfortableCeiling, c.observedMax);
  return consecutiveTargetFails >= 2 ? t - 1 : t;
}

/** 측정 없이 시작: 사용자가 편하게 낼 수 있는 한 음을 고른다 */
export function ceilingFromManual(comfortNote: number, now: number): Ceiling {
  return {
    observedMax: comfortNote,
    comfortableCeiling: comfortNote,
    practiceTarget: comfortNote,
    lowest: comfortNote - 12,
    updatedAt: now,
    reason: 'manual-start',
  };
}
