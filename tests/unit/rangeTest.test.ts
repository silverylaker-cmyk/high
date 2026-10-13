import {
  breakCluster,
  comfortNext,
  comfortResult,
  comfortStart,
  computeHighest,
  computeLowest,
  stableRuns,
  type ComfortOutcome,
} from '../../src/analysis/rangeTest';
import { frames } from './helpers';

describe('rangeTest (§4.9)', () => {
  it('안정 구간: 같은 반음 300 ms 이상만', () => {
    const fs = [...frames(0, 0.5, () => 60), ...frames(0.5, 0.2, () => 62), ...frames(0.7, 0.4, () => 64)];
    expect(stableRuns(fs).map((r) => Math.round(r.midi))).toEqual([60, 64]);
  });

  it('최저음 = 5번째 백분위수, 최고음 = 안정 구간 최고(반음 내림)', () => {
    const down = frames(0, 6, (t) => 72 - Math.floor(t / 0.4)); // 72 → 58, 각 0.4 s
    expect(computeLowest(down)).toBe(58);
    const up = [...frames(0, 0.4, () => 70), ...frames(0.4, 0.4, () => 76.3), ...frames(0.8, 0.1, () => 79)];
    expect(computeHighest(up)).toBe(76);
  });

  it('끊김 위치: 3회 중 2회 이상 나온 반음의 중앙값, 없으면 null', () => {
    expect(breakCluster([[66.2], [65.9, 70], [71]])).toBe(66);
    expect(breakCluster([[60], [64], [70]])).toBeNull();
  });

  it('편한 최고음 단계: highestAbs 위 음 제시 0건(무작위 1000회)', () => {
    let rnd = 7;
    const rand = () => ((rnd = (rnd * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let trial = 0; trial < 1000; trial++) {
      const highest = 60 + Math.floor(rand() * 25);
      const lowest = highest - 3 - Math.floor(rand() * 20);
      let s = comfortStart(highest, lowest);
      let guard = 0;
      while (!s.done && guard++ < 100) {
        expect(s.current).toBeLessThanOrEqual(highest);
        const o: ComfortOutcome = rand() < 0.7 ? 'success' : rand() < 0.5 ? 'fail' : 'unmeasurable';
        s = comfortNext(s, o);
      }
      expect(s.done).toBe(true);
      expect(comfortResult(s)).toBeLessThanOrEqual(highest);
      expect(comfortResult(s)).toBeGreaterThanOrEqual(lowest);
    }
  });

  it('시작음은 passaggio가 아닌 highestAbs − 5 (D2)', () => {
    expect(comfortStart(76, 50).current).toBe(71);
  });

  it('2회 연속 실패 → 중단, 측정 불가는 실패로 세지 않음', () => {
    let s = comfortStart(76, 50);
    s = comfortNext(s, 'success');
    s = comfortNext(s, 'fail');
    s = comfortNext(s, 'unmeasurable');
    expect(s.done).toBe(false);
    s = comfortNext(s, 'success');
    s = comfortNext(s, 'fail');
    s = comfortNext(s, 'fail');
    expect(s.done).toBe(true);
    expect(comfortResult(s)).toBe(72);
  });
});
