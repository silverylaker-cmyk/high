// §2.1 코어 판정 수치 — 사용자 승인 없이 변경 금지(§10-2)
export type Difficulty = 'easy' | 'normal' | 'hard';

export const JUDGE: Record<Difficulty, { tolCents: number; holdMs: number; tubeCents: number }> = {
  easy: { tolCents: 50, holdMs: 800, tubeCents: 100 },
  normal: { tolCents: 35, holdMs: 1500, tubeCents: 60 },
  hard: { tolCents: 20, holdMs: 2500, tubeCents: 35 },
};

export const GRACE_MS = 150;
export const RESPONSE_WINDOW_MS = 4000;

const ORDER: Difficulty[] = ['easy', 'normal', 'hard'];

/** 같은 게임 최근 3라운드 성공률로 난이도 제안(사용자 확인 필요) */
export function suggestDifficulty(current: Difficulty, lastRates: number[]): Difficulty | null {
  if (lastRates.length < 3) return null;
  const last3 = lastRates.slice(-3);
  const i = ORDER.indexOf(current);
  if (last3.every((r) => r >= 0.85) && i < ORDER.length - 1) return ORDER[i + 1];
  if (last3.every((r) => r <= 0.4) && i > 0) return ORDER[i - 1];
  return null;
}
