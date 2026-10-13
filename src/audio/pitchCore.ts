import { PitchDetector } from 'pitchy';

// §4.1·§4.2 프레임 분석(워커와 테스트에서 공유). 상태 없는 순수 분석만 한다.
export const FRAME_SIZE = 2048;
export const HOP_SIZE = 512;

export interface RawAnalysis {
  hz: number;
  clarity: number;
  rmsDb: number;
  peak: number;
}

const detectors = new Map<number, PitchDetector<Float32Array>>();

export function analyzeFrame(buf: Float32Array, sampleRate: number): RawAnalysis {
  let det = detectors.get(buf.length);
  if (!det) {
    det = PitchDetector.forFloat32Array(buf.length);
    detectors.set(buf.length, det);
  }
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i];
    sum += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  const rms = Math.sqrt(sum / buf.length);
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -120;
  const [hz, clarity] = det.findPitch(buf, sampleRate);
  return { hz, clarity, rmsDb, peak };
}
