import { SAFETY, SAFETY_POLICY } from '../../src/safety/config';
import { gameAvailability, newNotesRemaining, preCheckBlocks, redFlag, sessionTimeState, symptomToday } from '../../src/safety/rules';
import { DAY_MS } from '../../src/meta/dates';
import { ko } from '../../src/copy/ko';

const now = new Date(2026, 9, 13, 12).getTime();
const energy = { energyDate: 'x', energyBudgetSec: 120, energyUsedTodaySec: 0 };
const ctx = {
  now,
  level: 1,
  hasRange: true,
  symptomToday: false,
  precheckDone: true,
  warmupDoneToday: true,
  energy,
  sessionMinutes: 5,
};

describe('§6 안전 상수(변경 금지)', () => {
  it('초기값 그대로', () => {
    expect(SAFETY).toEqual({
      SESSION_SOFT_STOP_MIN: 20,
      SESSION_HARD_STOP_MIN: 25,
      HIGH_ZONE_OFFSET: 2,
      ENERGY_INITIAL_SEC: 120,
      ENERGY_WEEKLY_STEP_SEC: 15,
      ENERGY_MAX_SEC: 300,
      ENERGY_PENALTY_RATIO: 0.5,
      WARMUP_REQUIRED_SEC: 90,
      NEW_NOTE_MAX_PER_7D: 2,
      RED_FLAG_HOARSE_DAYS: 3,
      RED_FLAG_WINDOW_DAYS: 14,
    });
  });
  it('검수 결정 정책: 자동 상향 끔, 끊김 점수 미반영, 재생 중 판정 금지', () => {
    expect(SAFETY_POLICY.AUTO_CEILING_RAISE).toBe(false);
    expect(SAFETY_POLICY.BREAKS_AFFECT_SCORE).toBe(false);
    expect(SAFETY_POLICY.JUDGE_DURING_PLAYBACK).toBe(false);
  });
});

describe('게임 잠금 규칙', () => {
  it('모두 충족 → 열림', () => {
    const a = gameAvailability(ctx);
    expect(Object.values(a).every((x) => x.ok)).toBe(true);
  });
  it('증상 있으면 버블·쿨다운까지 잠금(P0-3)', () => {
    const a = gameAvailability({ ...ctx, symptomToday: true });
    expect(a.bubble).toEqual({ ok: false, reason: 'symptom' });
    expect(a.cooldown.ok).toBe(false);
    expect(a.climber.ok).toBe(false);
  });
  it('시작 전 상태 확인 없이는 잠금', () => {
    expect(gameAvailability({ ...ctx, precheckDone: false }).bubble.reason).toBe('noPrecheck');
  });
  it('워밍업 전 고음 게임 잠금', () => {
    const a = gameAvailability({ ...ctx, warmupDoneToday: false });
    expect(a.bubble.ok).toBe(true);
    expect(a.siren.reason).toBe('warmup');
    expect(a.climber.reason).toBe('warmup');
  });
  it('에너지 0 → 고음 게임 잠금, 버블·쿨다운 가능', () => {
    const a = gameAvailability({ ...ctx, energy: { ...energy, energyUsedTodaySec: 120 } });
    expect(a.climber.reason).toBe('energy');
    expect(a.cooldown.ok).toBe(true);
  });
  it('25분 → 고음 게임 강제 종료, 20분 → 안내', () => {
    expect(sessionTimeState(19.9)).toBe('ok');
    expect(sessionTimeState(20)).toBe('soft');
    expect(sessionTimeState(25)).toBe('hard');
    expect(gameAvailability({ ...ctx, sessionMinutes: 25 }).siren.reason).toBe('hardStop');
  });
  it('음역 없으면 고음 게임 잠금', () => {
    expect(gameAvailability({ ...ctx, hasRange: false }).climber.reason).toBe('noRange');
  });
});

describe('증상 처리', () => {
  it('시작 전 확인 항목 하나라도 → 차단', () => {
    const base = { at: now, pain: false, hoarse: false, suddenChange: false, breathing: false };
    expect(preCheckBlocks(base)).toBe(false);
    for (const k of ['pain', 'hoarse', 'suddenChange', 'breathing'] as const) expect(preCheckBlocks({ ...base, [k]: true })).toBe(true);
  });
  it('오늘 증상: 시작 전 확인·불편해요·자가체크 통증 ≥2', () => {
    const pc = { at: now - 3600_000, pain: true, hoarse: false, suddenChange: false, breathing: false };
    expect(symptomToday(now, [pc], [], [])).toBe(true);
    expect(symptomToday(now, [{ ...pc, at: now - DAY_MS }], [], [])).toBe(false);
    expect(symptomToday(now, [], [{ at: now, reason: 'discomfort' }], [])).toBe(true);
    expect(symptomToday(now, [], [{ at: now, reason: 'stop' }], [])).toBe(false);
    expect(symptomToday(now, [], [], [{ at: now, pain: 2, hoarse: 0, fatigue: 0 }])).toBe(true);
  });
});

describe('진료 권장 카드', () => {
  const c = (daysAgo: number, hoarse: number, pain = 0) => ({ at: now - daysAgo * DAY_MS, pain, hoarse, fatigue: 0 });
  it('14일 내 쉰 목소리 ≥2가 3일', () => {
    expect(redFlag([c(1, 2), c(5, 2), c(13, 3)], now)).toBe('repeatedHoarse');
    expect(redFlag([c(1, 2), c(5, 2), c(15, 3)], now)).toBeNull();
    expect(redFlag([c(1, 1), c(2, 1), c(3, 1)], now)).toBeNull();
  });
  it('통증 3 또는 2주 이상 쉰 목소리 체크', () => {
    expect(redFlag([c(0, 0, 3)], now)).toBe('pain3');
    expect(redFlag([{ ...c(0, 0), longHoarse: true }], now)).toBe('longHoarse');
  });
  it('문구: 진료 지침에서 도출한 숫자라고 쓰지 않음, 급성 호흡 곤란 별도 안내', () => {
    expect(ko.safety.doctorPolicy).toContain('제품 정책');
    expect(ko.safety.breathingBody).toContain('119');
  });
});

describe('주간 신규음 상한(7일 롤링 +2)', () => {
  it('7일 안 2개면 0', () => {
    expect(newNotesRemaining([{ midi: 70, at: now - DAY_MS }, { midi: 71, at: now - 2 * DAY_MS }], now)).toBe(0);
    expect(newNotesRemaining([{ midi: 70, at: now - 8 * DAY_MS }], now)).toBe(2);
    expect(newNotesRemaining([{ midi: 70, at: now - 6 * DAY_MS }], now)).toBe(1);
  });
});

describe('문구 규칙(§6, §7.6)', () => {
  it('UI 문자열에 진단·치료·처방 없음', () => {
    const all = JSON.stringify(ko, (_k, v) => (typeof v === 'function' ? v.toString() : v));
    expect(all).not.toMatch(/진단|치료|처방/);
    expect(all).not.toMatch(/Slack|슬랙/);
  });
});
