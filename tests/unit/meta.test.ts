import { levelForXp, xpForLevel, levelProgress } from '../../src/meta/xp';
import { weekStreak } from '../../src/meta/streak';
import { dailyBudgetSec, ensureToday, remainingSec, batteryCells, cleanWeeks, isHighZone } from '../../src/meta/energy';
import { dayKey, weekKey } from '../../src/meta/dates';
import { generateDaily, advanceQuests } from '../../src/meta/quests';
import { newlyUnlocked, ACHIEVEMENTS } from '../../src/meta/achievements';
import { recordNote } from '../../src/meta/collection';
import { coachMessage } from '../../src/meta/coach';

const at = (y: number, m: number, d: number, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();

describe('XP·레벨 (§2.3)', () => {
  it('round(50 × L^1.5)', () => {
    expect(xpForLevel(2)).toBe(141);
    expect(xpForLevel(5)).toBe(559);
    expect(xpForLevel(10)).toBe(1581);
    expect(xpForLevel(20)).toBe(4472);
  });
  it('레벨 계산 경계', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(140)).toBe(1);
    expect(levelForXp(141)).toBe(2);
    expect(levelForXp(559)).toBe(5);
    expect(levelProgress(200)).toEqual({ level: 2, into: 59, span: xpForLevel(3) - 141 });
  });
});

describe('주간 스트릭', () => {
  it('월요일 시작 주', () => {
    expect(weekKey(at(2026, 10, 13))).toBe('2026-10-12'); // 화 → 월
    expect(weekKey(at(2026, 10, 18, 23, 59))).toBe('2026-10-12'); // 일
    expect(weekKey(at(2026, 10, 19, 0, 0))).toBe('2026-10-19'); // 다음 월
  });
  it('하루 여러 세션은 1회, 목표 달성 주가 연속된 수', () => {
    const s = [
      // 9/28 주: 4일
      at(2026, 9, 28), at(2026, 9, 29), at(2026, 9, 30), at(2026, 10, 1), at(2026, 10, 1, 20),
      // 10/5 주: 4일
      at(2026, 10, 5), at(2026, 10, 6), at(2026, 10, 7), at(2026, 10, 8),
      // 10/12 주(진행 중): 1일
      at(2026, 10, 12),
    ];
    expect(weekStreak(s, 4, at(2026, 10, 13))).toBe(2);
    expect(weekStreak(s, 5, at(2026, 10, 13))).toBe(0);
  });
  it('지난주 미달성이면 0', () => {
    const s = [at(2026, 9, 28), at(2026, 9, 29), at(2026, 9, 30)];
    expect(weekStreak(s, 3, at(2026, 10, 13))).toBe(0);
  });
});

describe('목 에너지 (§2.3, §6)', () => {
  it('자정(로컬)에 리셋하고 그날 예산을 고정', () => {
    const e0 = { energyDate: dayKey(at(2026, 10, 12)), energyBudgetSec: 120, energyUsedTodaySec: 100 };
    expect(ensureToday(e0, [], at(2026, 10, 12, 23, 59))).toBe(e0);
    const e1 = ensureToday(e0, [], at(2026, 10, 13, 0, 0));
    expect(e1.energyUsedTodaySec).toBe(0);
    expect(e1.energyBudgetSec).toBe(120);
    // 같은 날 나중에 부정 자가체크가 생겨도 오늘 예산은 그대로
    const later = ensureToday(e1, [{ at: at(2026, 10, 12, 22), pain: 3, hoarse: 0, fatigue: 0 }], at(2026, 10, 13, 10));
    expect(later.energyBudgetSec).toBe(120);
  });
  it('전날 통증 ≥2 또는 쉰 목소리 ≥2 → 다음 날 50%', () => {
    const now = at(2026, 10, 13, 9);
    expect(dailyBudgetSec([{ at: at(2026, 10, 12, 20), pain: 2, hoarse: 0, fatigue: 0 }], now)).toBe(60);
    expect(dailyBudgetSec([{ at: at(2026, 10, 12, 20), pain: 0, hoarse: 2, fatigue: 0 }], now)).toBe(60);
    expect(dailyBudgetSec([{ at: at(2026, 10, 12, 20), pain: 1, hoarse: 1, fatigue: 3 }], now)).toBe(120);
    expect(dailyBudgetSec([{ at: at(2026, 10, 10, 20), pain: 3, hoarse: 3, fatigue: 0 }], now)).toBe(120);
  });
  it('주간 자동 증가는 MVP에서 보류(정책), 자가체크 없는 주는 깨끗한 주로 세지 않음', () => {
    const now = at(2026, 10, 13);
    const checks = [
      { at: at(2026, 9, 29), pain: 0, hoarse: 0, fatigue: 0 },
      { at: at(2026, 10, 6), pain: 0, hoarse: 0, fatigue: 0 },
    ];
    expect(cleanWeeks(checks, now)).toBe(2);
    expect(cleanWeeks([], now)).toBe(0);
    expect(dailyBudgetSec(checks, now)).toBe(120);
  });
  it('남은 양·배터리 칸', () => {
    const e = { energyDate: 'x', energyBudgetSec: 120, energyUsedTodaySec: 50 };
    expect(remainingSec(e)).toBe(70);
    expect(batteryCells(e)).toBe(3);
    expect(batteryCells({ ...e, energyUsedTodaySec: 200 })).toBe(0);
  });
  it('고음역 = 상한 − 2 이상', () => {
    expect(isHighZone(68, 70)).toBe(true);
    expect(isHighZone(67, 70)).toBe(false);
  });
});

describe('퀘스트·업적·컬렉션·코치', () => {
  it('일일 퀘스트 3개, 워밍업 포함, 날짜로 결정, 중복 없음', () => {
    for (let d = 1; d <= 28; d++) {
      const q = generateDaily(`2026-10-${String(d).padStart(2, '0')}`);
      expect(q).toHaveLength(3);
      expect(q[0].kind).toBe('warmup');
      expect(new Set(q.map((x) => x.kind)).size).toBe(3);
    }
    expect(generateDaily('2026-10-13')).toEqual(generateDaily('2026-10-13'));
  });
  it('퀘스트 진행·완료', () => {
    const q = generateDaily('2026-10-13');
    const r1 = advanceQuests(q, 'warmup', 60);
    expect(r1.completed).toHaveLength(0);
    const r2 = advanceQuests(r1.quests, 'warmup', 60);
    expect(r2.completed).toHaveLength(1);
    expect(r2.quests[0].progress).toBe(90);
    expect(advanceQuests(r2.quests, 'warmup', 10).completed).toHaveLength(0);
  });
  it('업적 12종, 상향 유도 업적 없음(P1-10)', () => {
    expect(ACHIEVEMENTS).toHaveLength(12);
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(ids).toContain('restChoice');
    const stats = { warmups: 1, notesAcquired: 0, sirenGlidesCompleted: 0, maxCombo: 0, weekStreak: 0, restChoices: 1, prechecks: 0, cooldowns: 0, selfchecks: 0 };
    expect(newlyUnlocked(stats, new Set())).toEqual(['firstWarmup', 'restChoice']);
    expect(newlyUnlocked(stats, new Set(['firstWarmup']))).toEqual(['restChoice']);
  });
  it('컬렉션: 순간 도달 → 획득, 획득은 되돌아가지 않음', () => {
    const a = recordNote(undefined, 69, { success: false, touched: true, heldMs: 300, centsSD: 20 }, 1);
    expect(a.entry?.state).toBe('touched');
    const b = recordNote(a.entry, 69, { success: true, touched: true, heldMs: 1600, centsSD: 12 }, 2);
    expect(b.newlyAcquired).toBe(true);
    expect(b.entry?.state).toBe('acquired');
    const c = recordNote(b.entry, 69, { success: false, touched: true, heldMs: 200, centsSD: 40 }, 3);
    expect(c.entry?.state).toBe('acquired');
    expect(c.newlyAcquired).toBe(false);
    expect(recordNote(undefined, 70, { success: false, touched: false, heldMs: 0, centsSD: null }, 1).entry).toBeUndefined();
  });
  it('코치 메시지: 수치 요약 + 다음 행동, 금지어 없음', () => {
    const m = coachMessage({ durationSec: 600, highZoneSec: 45, warmupDone: true, newNoteLabels: [], stoppedForDiscomfort: false, selfCheckNegative: false, energyLeftSec: 30, playedClimber: true });
    expect(m).toContain('10분');
    expect(m).toContain('45초');
    expect(m).not.toMatch(/진단|치료|처방/);
  });
});
