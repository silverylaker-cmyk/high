import { ceilingFromRangeTest, lowerCeiling, sessionTarget } from '../../src/analysis/ceiling';
import { applyOutcome, initClimb, makePlatforms } from '../../src/games/climber/climberLogic';

// D1·P0-1: 상한 자동 상향 없음, 낮추기만
describe('Ceiling (D1)', () => {
  const t1 = { lowest: 50, comfortMax: 70, highestAbs: 74 };

  it('첫 측정은 측정값으로 설정, 목표음은 상한 이하', () => {
    const c = ceilingFromRangeTest(t1, null, 1);
    expect(c.comfortableCeiling).toBe(70);
    expect(c.practiceTarget).toBe(70);
    expect(c.observedMax).toBe(74);
  });

  it('재측정이 더 높게 나와도 상한은 오르지 않는다', () => {
    const c1 = ceilingFromRangeTest(t1, null, 1);
    const c2 = ceilingFromRangeTest({ lowest: 50, comfortMax: 73, highestAbs: 77 }, c1, 2);
    expect(c2.comfortableCeiling).toBe(70);
    expect(c2.practiceTarget).toBe(70);
  });

  it('재측정이 낮으면 상한이 내려간다', () => {
    const c1 = ceilingFromRangeTest(t1, null, 1);
    const c2 = ceilingFromRangeTest({ lowest: 50, comfortMax: 67, highestAbs: 71 }, c1, 2);
    expect(c2.comfortableCeiling).toBe(67);
    expect(c2.reason).toBe('retest-lower');
  });

  it('수동 조정은 낮추기만 허용, 최저음+3 아래로는 안 내려감', () => {
    const c = ceilingFromRangeTest(t1, null, 1);
    expect(lowerCeiling(c, 72, 2)).toBe(c);
    expect(lowerCeiling(c, 68, 2).comfortableCeiling).toBe(68);
    expect(lowerCeiling(c, 40, 2).comfortableCeiling).toBe(53);
  });

  it('comfortMax가 highestAbs보다 커도 목표음은 highestAbs 이하', () => {
    const c = ceilingFromRangeTest({ lowest: 50, comfortMax: 80, highestAbs: 74 }, null, 1);
    expect(c.practiceTarget).toBeLessThanOrEqual(74);
  });

  it('등반: 목표음 2라운드 연속 실패 → 다음 라운드 목표 −1', () => {
    const c = ceilingFromRangeTest(t1, null, 1);
    expect(sessionTarget(c, 1)).toBe(70);
    expect(sessionTarget(c, 2)).toBe(69);
  });
});

describe('climberLogic (§2.2 C, D4)', () => {
  it('발판 = 목표−4 ~ 목표, 최저음 아래로는 없음', () => {
    expect(makePlatforms(70, 50)).toEqual([66, 67, 68, 69, 70]);
    expect(makePlatforms(70, 68)).toEqual([68, 69, 70]);
  });

  it('성공을 아무리 해도 목표음 위 발판은 생기지 않는다', () => {
    let s = initClimb(70, 50);
    for (let i = 0; i < 20; i++) s = applyOutcome(s, 'success');
    expect(Math.max(...s.platforms)).toBe(70);
    expect(s.done).toBe('top');
  });

  it('측정 불가는 하트를 깎지 않고, 3번 연속이면 신호 확인으로 멈춘다', () => {
    let s = initClimb(70, 50);
    s = applyOutcome(s, 'unmeasurable');
    s = applyOutcome(s, 'unmeasurable');
    expect(s.hearts).toBe(3);
    s = applyOutcome(s, 'unmeasurable');
    expect(s.done).toBe('signal');
  });

  it('하트 0 → 휴식 카드(hearts)', () => {
    let s = initClimb(70, 50);
    for (let i = 0; i < 3; i++) s = applyOutcome(s, 'fail');
    expect(s.done).toBe('hearts');
  });
});
