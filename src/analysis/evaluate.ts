import { analyzeFrame, FRAME_SIZE, HOP_SIZE } from '../audio/pitchCore';
import { PitchTracker, percentile, median } from '../audio/pitchTrack';

// P0-4 검출 평가: 정답 F0가 있는 신호에 대해 cents 오차 중앙값/P95, 옥타브 오류율, 유효 검출 비율
export interface EvalReport {
  frames: number;
  voicedTruth: number;
  detected: number;
  validRatio: number;
  medianCents: number;
  p95Cents: number;
  octaveErrorRate: number;
}

/** truth(t) = 정답 Hz(무성이면 null). 평활 판정값(midi) 기준으로 평가 */
export function evaluate(samples: Float32Array, sampleRate: number, truth: (t: number) => number | null, minClarity = 0.9): EvalReport {
  const tr = new PitchTracker({ noiseFloorDb: -70, minClarity });
  const errs: number[] = [];
  let voicedTruth = 0;
  let detected = 0;
  let octave = 0;
  let frames = 0;
  for (let end = FRAME_SIZE; end <= samples.length; end += HOP_SIZE) {
    const buf = samples.subarray(end - FRAME_SIZE, end);
    const t = end / sampleRate;
    const a = analyzeFrame(buf, sampleRate);
    const f = tr.push({ id: frames++, t, ...a });
    // 창 중앙 시각의 정답과 비교
    const ref = truth(t - FRAME_SIZE / 2 / sampleRate);
    if (ref == null) continue;
    voicedTruth++;
    if (f.status !== 'voiced' || f.midi == null) continue;
    detected++;
    const est = 440 * Math.pow(2, (f.midi - 69) / 12);
    const c = 1200 * Math.log2(est / ref);
    if (Math.abs(Math.abs(c) - 1200) < 150) octave++;
    else errs.push(Math.abs(c));
  }
  return {
    frames,
    voicedTruth,
    detected,
    validRatio: voicedTruth ? detected / voicedTruth : 0,
    medianCents: errs.length ? median(errs) : NaN,
    p95Cents: errs.length ? percentile(errs, 95) : NaN,
    octaveErrorRate: detected ? octave / detected : 0,
  };
}

/** 16비트 PCM 또는 32비트 float 모노/스테레오 WAV 파서(첫 채널만) */
export function parseWav(buf: ArrayBuffer): { samples: Float32Array; sampleRate: number } {
  const v = new DataView(buf);
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a wav');
  let o = 12;
  let fmt = 1;
  let ch = 1;
  let sr = 48000;
  let bits = 16;
  while (o + 8 <= v.byteLength) {
    const id = tag(o);
    const size = v.getUint32(o + 4, true);
    if (id === 'fmt ') {
      fmt = v.getUint16(o + 8, true);
      ch = v.getUint16(o + 10, true);
      sr = v.getUint32(o + 12, true);
      bits = v.getUint16(o + 22, true);
    } else if (id === 'data') {
      const bytes = bits / 8;
      const n = Math.floor(size / (bytes * ch));
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const p = o + 8 + i * bytes * ch;
        out[i] = fmt === 3 ? v.getFloat32(p, true) : v.getInt16(p, true) / 32768;
      }
      return { samples: out, sampleRate: sr };
    }
    o += 8 + size + (size % 2);
  }
  throw new Error('no data chunk');
}
