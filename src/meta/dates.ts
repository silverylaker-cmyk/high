// 로컬 시간 기준 날짜 키. 자정(로컬)에 하루가 바뀐다.
const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 월요일 시작 주의 월요일 날짜 키 */
export function weekKey(ts: number): string {
  const d = new Date(ts);
  const dow = (d.getDay() + 6) % 7; // 월=0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  return dayKey(monday.getTime());
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes()).getTime();
}

export function prevWeekKey(wk: string): string {
  const [y, m, d] = wk.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 7).getTime());
}

export const DAY_MS = 86_400_000;
