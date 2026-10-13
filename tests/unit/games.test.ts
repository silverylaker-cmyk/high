import { GlideScorer, highZoneSeconds, pathMidi, GLIDE_SEC } from '../../src/games/siren/sirenLogic';
import { BubbleTracker, bubbleSize } from '../../src/games/bubble/bubbleLogic';
import { frames } from './helpers';

describe('사이렌 (§2.2 B, D2)', () => {
  it('경로: 저음 → 상한 → 저음', () => {
    expect(pathMidi(60, 70, 0)).toBeCloseTo(60);
    expect(pathMidi(60, 70, GLIDE_SEC / 2)).toBeCloseTo(70);
    expect(pathMidi(60, 70, GLIDE_SEC)).toBeCloseTo(60);
  });

  it('경로를 정확히 따라가면 점수 100, 콤보는 0.5 s마다 +1', () => {
    const s = new GlideScorer(60, 70, 0, 60);
    frames(0, GLIDE_SEC, (t) => pathMidi(60, 70, t)).forEach((f) => s.push(f));
    expect(s.score()).toBe(100);
    expect(s.maxCombo).toBeGreaterThanOrEqual(13);
  });

  it('추적 끊김(무성 80 ms)은 점수 비율에만 영향, 콤보는 유예 안이면 유지', () => {
    const s = new GlideScorer(60, 70, 0, 60);
    frames(0, GLIDE_SEC, (t) => (t > 3 && t < 3.08 ? null : pathMidi(60, 70, t))).forEach((f) => s.push(f));
    expect(s.maxCombo).toBeGreaterThanOrEqual(13);
  });

  it('유효 신호 부족 → 측정 불가(실패 아님)', () => {
    const s = new GlideScorer(60, 70, 0, 60);
    frames(0, GLIDE_SEC, (t) => (t < 1 ? pathMidi(60, 70, t) : null)).forEach((f) => s.push(f));
    expect(s.measurable()).toBe(false);
  });

  it('고음역 시간 = 경로가 상한−2 이상인 시간(발성 창 총시간)', () => {
    const sec = highZoneSeconds(61, 70, 68);
    expect(sec).toBeGreaterThan(0.5);
    expect(sec).toBeLessThan(GLIDE_SEC / 2);
  });
});

describe('버블 (§2.2 A, P1-4)', () => {
  it('cents 표준편차로 크기 결정', () => {
    expect(bubbleSize(10)).toBe('big');
    expect(bubbleSize(50)).toBe('mid');
    expect(bubbleSize(100)).toBe('small');
  });
  it('유성음 시간 누적과 유효 비율', () => {
    const b = new BubbleTracker();
    frames(0, 2, (t) => (t < 1 ? 60 : null)).forEach((f) => b.push(f));
    expect(b.voicedSec).toBeCloseTo(1, 1);
    expect(b.validRatio()).toBeCloseTo(0.5, 1);
  });
  it('크게 흔들리는 소리(±1.5반음)는 작은 거품', () => {
    const b = new BubbleTracker();
    let last: { sd: number | null } = { sd: null };
    frames(0, 1.2, (t) => 60 + 1.5 * Math.sin(t * 40)).forEach((f) => (last = b.push(f)));
    expect(bubbleSize(last.sd!)).toBe('small');
  });
});
