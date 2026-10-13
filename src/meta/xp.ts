// §2.3 XP·레벨
export const XP = {
  BUBBLE_DONE: 20,
  CLIMBER_PLATFORM: 5,
  NOTE_ACQUIRED: 100,
  COOLDOWN: 10,
  QUEST_DONE: 30,
} as const;

export const sirenXp = (score: number) => Math.round(score / 10);

/** 레벨 L 도달 누적 XP = round(50 × L^1.5). 레벨 1은 시작 레벨 */
export function xpForLevel(level: number): number {
  return level <= 1 ? 0 : Math.round(50 * Math.pow(level, 1.5));
}

export function levelForXp(xp: number): number {
  let l = 1;
  while (xp >= xpForLevel(l + 1)) l++;
  return l;
}

export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  return { level, into: xp - base, span: xpForLevel(level + 1) - base };
}
