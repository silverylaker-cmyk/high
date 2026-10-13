import { analyzeFrame, FRAME_SIZE } from '../../src/audio/pitchCore';
import { hzToMidi } from '../../src/audio/noteMath';
import { PitchTracker } from '../../src/audio/pitchTrack';
import { sawNoise, sine } from '../fixtures/signals';

// M1 AC: 사인 65–1046 Hz 오차 ≤ 5 cents, 톱니+잡음(−20 dB) ≤ 10 cents, 옥타브 오류율 < 1%
const SR = 48000;
const freqs: number[] = [];
for (let m = 36; m <= 84; m++) freqs.push(440 * Math.pow(2, (m - 69) / 12));
freqs.unshift(65);

const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

describe('pitch detection fixtures', () => {
  it('사인파 65–1046 Hz: 오차 ≤ 5 cents', () => {
    for (const f of freqs) {
      const [hz, clarity] = (() => {
        const r = analyzeFrame(sine(f, SR, FRAME_SIZE), SR);
        return [r.hz, r.clarity];
      })();
      expect(clarity).toBeGreaterThan(0.9);
      expect(Math.abs(cents(hz, f))).toBeLessThanOrEqual(5);
    }
  });

  it('톱니파 + 잡음(−20 dB): 오차 ≤ 10 cents, 옥타브 오류 < 1%', () => {
    let octaveErrors = 0;
    let n = 0;
    for (const f of freqs) {
      for (let seed = 1; seed <= 4; seed++) {
        const r = analyzeFrame(sawNoise(f, SR, FRAME_SIZE, -20, seed), SR);
        n++;
        const c = cents(r.hz, f);
        if (Math.abs(Math.abs(c) - 1200) < 100) octaveErrors++;
        else expect(Math.abs(c)).toBeLessThanOrEqual(10);
      }
    }
    expect(octaveErrors / n).toBeLessThan(0.01);
  });

  it('RMS dB 계산', () => {
    const r = analyzeFrame(sine(440, SR, FRAME_SIZE, 1), SR);
    expect(r.rmsDb).toBeCloseTo(-3.01, 1);
    expect(r.peak).toBeCloseTo(1, 2);
  });
});

describe('PitchTracker', () => {
  const frame = (id: number, hz: number, clarity = 0.95, rmsDb = -20, peak = 0.3) => ({ id, t: id * 0.0107, hz, clarity, rmsDb, peak });

  it('유성 판정: clarity·소음 대비 dB·주파수 범위', () => {
    const tr = new PitchTracker({ noiseFloorDb: -60 });
    expect(tr.push(frame(0, 440)).status).toBe('voiced');
    expect(tr.push(frame(1, 440, 0.8)).status).toBe('unvoiced');
    expect(tr.push(frame(2, 440, 0.95, -55)).status).toBe('unvoiced');
    expect(tr.push(frame(3, 50)).status).toBe('unvoiced');
    expect(tr.push(frame(4, 1500)).status).toBe('unvoiced');
  });

  it('클리핑 프레임은 측정 불가', () => {
    const tr = new PitchTracker({ noiseFloorDb: -60 });
    expect(tr.push(frame(0, 440, 0.95, -3, 1)).status).toBe('clipped');
  });

  it('옥타브 가드: 4프레임 미만 옥타브 점프는 숨기고, 원시값은 보존한다', () => {
    const tr = new PitchTracker({ noiseFloorDb: -60 });
    for (let i = 0; i < 6; i++) tr.push(frame(i, 220));
    const j = tr.push(frame(6, 440));
    expect(j.octaveGuarded).toBe(true);
    expect(j.midi).toBeCloseTo(hzToMidi(220), 3);
    expect(j.rawMidi).toBeCloseTo(hzToMidi(440), 3);
    tr.push(frame(7, 220));
    // 4프레임 이상 지속되면 실제 이동으로 받아들인다
    for (let i = 8; i < 12; i++) tr.push(frame(i, 440));
    const k = tr.push(frame(12, 440));
    expect(k.octaveGuarded).toBe(false);
    expect(k.midi).toBeCloseTo(hzToMidi(440), 1);
  });

  it('5프레임 중앙값으로 순간 튐을 걸러낸다', () => {
    const tr = new PitchTracker({ noiseFloorDb: -60 });
    for (let i = 0; i < 4; i++) tr.push(frame(i, 440));
    const f = tr.push(frame(4, 500));
    expect(f.midi).toBeCloseTo(69, 3);
  });
});
