import { dayKey, prevWeekKey, weekKey } from './dates';

// §2.3 주간 스트릭: 주간 목표(3–5회) 달성 주가 연속된 횟수. 하루 여러 세션은 1회.
export function practiceDaysByWeek(sessionStarts: readonly number[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const ts of sessionStarts) {
    const wk = weekKey(ts);
    if (!m.has(wk)) m.set(wk, new Set());
    m.get(wk)!.add(dayKey(ts));
  }
  return m;
}

export function weekStreak(sessionStarts: readonly number[], weeklyGoal: number, now: number): number {
  const byWeek = practiceDaysByWeek(sessionStarts);
  const met = (wk: string) => (byWeek.get(wk)?.size ?? 0) >= weeklyGoal;
  let wk = weekKey(now);
  // 이번 주가 아직 진행 중이면 미달성이어도 스트릭을 끊지 않는다
  if (!met(wk)) wk = prevWeekKey(wk);
  let n = 0;
  while (met(wk)) {
    n++;
    wk = prevWeekKey(wk);
  }
  return n;
}

export function daysThisWeek(sessionStarts: readonly number[], now: number): number {
  return practiceDaysByWeek(sessionStarts).get(weekKey(now))?.size ?? 0;
}
