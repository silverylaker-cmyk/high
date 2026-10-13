// 부록 B 업적 12종. P1-10에 따라 '8주 완주'·'재측정 +3반음'은
// 휴식·중단 결정을 보상하는 업적('쉬어 가기', '목 상태 확인 10회')으로 바꿨다.
export interface AchievementStats {
  warmups: number;
  notesAcquired: number;
  sirenGlidesCompleted: number;
  maxCombo: number;
  weekStreak: number;
  restChoices: number;
  prechecks: number;
  cooldowns: number;
  selfchecks: number;
}

export const ACHIEVEMENTS: { id: string; check: (s: AchievementStats) => boolean }[] = [
  { id: 'firstWarmup', check: (s) => s.warmups >= 1 },
  { id: 'firstNote', check: (s) => s.notesAcquired >= 1 },
  { id: 'notes5', check: (s) => s.notesAcquired >= 5 },
  { id: 'notes10', check: (s) => s.notesAcquired >= 10 },
  { id: 'siren10', check: (s) => s.sirenGlidesCompleted >= 10 },
  { id: 'combo30', check: (s) => s.maxCombo >= 30 },
  { id: 'streak2', check: (s) => s.weekStreak >= 2 },
  { id: 'streak4', check: (s) => s.weekStreak >= 4 },
  { id: 'restChoice', check: (s) => s.restChoices >= 1 },
  { id: 'precheck10', check: (s) => s.prechecks >= 10 },
  { id: 'cooldown10', check: (s) => s.cooldowns >= 10 },
  { id: 'selfcheck30', check: (s) => s.selfchecks >= 30 },
];

export function newlyUnlocked(stats: AchievementStats, unlocked: ReadonlySet<string>): string[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.check(stats)).map((a) => a.id);
}
