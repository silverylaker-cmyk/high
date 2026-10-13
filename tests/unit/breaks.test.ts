import { BreakDetector } from '../../src/analysis/breaks';
import { frames, tf } from './helpers';

describe('BreakDetector (§4.6, D2·P0-2)', () => {
  it('부드러운 글라이드는 끊김 0', () => {
    const d = new BreakDetector();
    frames(0, 3, (t) => 60 + t * 4).forEach((f) => d.push(f));
    expect(d.events).toHaveLength(0);
  });

  it('2프레임 이내 2.5반음 이상 점프 → 1회', () => {
    const d = new BreakDetector();
    frames(0, 0.5, () => 64).forEach((f) => d.push(f));
    frames(0.5, 0.5, () => 68).forEach((f) => d.push(f));
    expect(d.events).toHaveLength(1);
    expect(d.events[0].kind).toBe('jump');
    expect(d.events[0].midi).toBeCloseTo(66, 0);
  });

  it('유성 사이 30–150 ms 무성 → 1회, 더 긴 쉼은 끊김 아님', () => {
    const d = new BreakDetector();
    frames(0, 0.3, () => 64).forEach((f) => d.push(f));
    frames(0.3, 0.08, () => null).forEach((f) => d.push(f));
    frames(0.38, 0.3, () => 64.2).forEach((f) => d.push(f));
    expect(d.events.map((e) => e.kind)).toEqual(['gap']);
    frames(0.68, 0.5, () => null).forEach((f) => d.push(f));
    frames(1.18, 0.3, () => 64).forEach((f) => d.push(f));
    expect(d.events).toHaveLength(1);
  });

  it('옥타브 가드가 숨긴 점프도 원시값으로 잡는다(매끈 보상 방지)', () => {
    const d = new BreakDetector();
    frames(0, 0.3, () => 57).forEach((f) => d.push(f));
    // 평활값(midi)은 57 유지, 원시값만 69로 튐
    d.push(tf(0.31, 57, { rawMidi: 69, octaveGuarded: true }));
    expect(d.events).toHaveLength(1);
  });
});
