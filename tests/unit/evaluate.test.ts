import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluate, parseWav } from '../../src/analysis/evaluate';
import { sawNoise } from '../fixtures/signals';

describe('검출 평가(P0-4)', () => {
  it('합성 글라이드(톱니+잡음 −20 dB, A2→A5): 중앙값 ≤ 10 cents, 옥타브 오류 < 1%, 유효 비율 ≥ 90%', () => {
    const sr = 48000;
    const dur = 6;
    const out = new Float32Array(sr * dur);
    // 짧은 조각을 이어 붙인 계단식 글라이드(조각마다 정답 고정)
    const seg = 0.25;
    const hzAt = (t: number) => 110 * Math.pow(2, Math.floor(t / seg) / 8);
    for (let s = 0; s < dur / seg; s++) {
      const hz = hzAt(s * seg + 1e-6);
      const piece = sawNoise(hz, sr, Math.round(seg * sr), -20, s + 1);
      out.set(piece, Math.round(s * seg * sr));
    }
    const r = evaluate(out, sr, (t) => {
      // 조각 경계 근처(창이 두 음에 걸침)는 평가 제외
      const u = t % seg;
      return u < 0.05 || u > seg - 0.05 ? null : hzAt(t);
    });
    expect(r.medianCents).toBeLessThanOrEqual(10);
    expect(r.octaveErrorRate).toBeLessThan(0.01);
    expect(r.validRatio).toBeGreaterThanOrEqual(0.9);
  });

  it('WAV 파서 + e2e fixture(220 Hz 사인)', () => {
    const { samples, sampleRate } = parseWav(readFileSync(resolve(process.cwd(), 'tests/fixtures/a3-sine.wav')).buffer as ArrayBuffer);
    expect(sampleRate).toBe(48000);
    const r = evaluate(samples, sampleRate, () => 220);
    expect(r.medianCents).toBeLessThanOrEqual(5);
    expect(r.validRatio).toBeGreaterThan(0.95);
  });

  const dir = resolve(process.cwd(), 'tests/fixtures/voice');
  const wavs = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.wav') && existsSync(resolve(dir, f.replace(/\.wav$/, '.f0.csv')))) : [];
  it.skipIf(wavs.length === 0)('실제 발성 fixture 리포트', () => {
    for (const f of wavs) {
      const { samples, sampleRate } = parseWav(readFileSync(resolve(dir, f)).buffer as ArrayBuffer);
      const rows = readFileSync(resolve(dir, f.replace(/\.wav$/, '.f0.csv')), 'utf8')
        .trim()
        .split(/\r?\n/)
        .map((l) => l.split(',').map(Number))
        .filter((r) => r.length === 2 && !isNaN(r[0]));
      const truth = (t: number) => {
        let best = rows[0];
        for (const r of rows) if (Math.abs(r[0] - t) < Math.abs(best[0] - t)) best = r;
        return best && best[1] > 0 ? best[1] : null;
      };
      const r = evaluate(samples, sampleRate, truth);
      console.log(`[fixture] ${f}`, JSON.stringify(r));
    }
  });
});
