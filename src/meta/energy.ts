import { SAFETY, SAFETY_POLICY } from '../safety/config';
import { addDays, dayKey, weekKey } from './dates';

// §2.3 목 에너지 = '앱에서 센 고음역 연습량'(앱 밖 발성은 포함하지 않음, §11.5).
// 하루 예산은 그날 처음 계산할 때 고정한다(P1-9). 자정(로컬)에 다시 계산.
export interface SelfCheckRecord {
  at: number;
  pain: number;
  hoarse: number;
  fatigue: number;
}

export const isNegative = (c: SelfCheckRecord) => c.pain >= 2 || c.hoarse >= 2;

/** 부정 자가체크 없이 '자가체크가 있었던' 지난 주 수. 자가체크 누락 주는 문제 없음으로 세지 않는다(P0-3) */
export function cleanWeeks(checks: readonly SelfCheckRecord[], now: number): number {
  const byWeek = new Map<string, SelfCheckRecord[]>();
  for (const c of checks) {
    const wk = weekKey(c.at);
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk)!.push(c);
  }
  const current = weekKey(now);
  let n = 0;
  for (const [wk, cs] of byWeek) {
    if (wk === current) continue;
    if (cs.length > 0 && !cs.some(isNegative)) n++;
  }
  return n;
}

export function dailyBudgetSec(checks: readonly SelfCheckRecord[], now: number): number {
  let budget: number = SAFETY.ENERGY_INITIAL_SEC;
  if (SAFETY_POLICY.ENERGY_AUTO_STEP) {
    budget = Math.min(SAFETY.ENERGY_MAX_SEC, budget + cleanWeeks(checks, now) * SAFETY.ENERGY_WEEKLY_STEP_SEC);
  }
  const yesterday = dayKey(addDays(now, -1));
  if (checks.some((c) => dayKey(c.at) === yesterday && isNegative(c))) {
    budget = Math.round(budget * SAFETY.ENERGY_PENALTY_RATIO);
  }
  return budget;
}

export interface EnergyState {
  energyDate: string;
  energyBudgetSec: number;
  energyUsedTodaySec: number;
}

/** 날짜가 바뀌었으면 예산을 새로 고정하고 사용량을 0으로 */
export function ensureToday(e: EnergyState, checks: readonly SelfCheckRecord[], now: number): EnergyState {
  const today = dayKey(now);
  if (e.energyDate === today) return e;
  return { energyDate: today, energyBudgetSec: dailyBudgetSec(checks, now), energyUsedTodaySec: 0 };
}

export function remainingSec(e: EnergyState): number {
  return Math.max(0, e.energyBudgetSec - e.energyUsedTodaySec);
}

/** 배터리 5칸 중 남은 칸 수(올림) */
export function batteryCells(e: EnergyState): number {
  if (e.energyBudgetSec <= 0) return 0;
  return Math.ceil((remainingSec(e) / e.energyBudgetSec) * 5);
}

export function isHighZone(midi: number, ceiling: number): boolean {
  return midi >= ceiling - SAFETY.HIGH_ZONE_OFFSET;
}
