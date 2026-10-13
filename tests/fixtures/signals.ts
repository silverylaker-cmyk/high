// 합성 신호 fixture(사인·톱니+잡음). 실제 발성 fixture는 tests/fixtures/voice/에 WAV+정답 F0로 추가한다(P0-4).
export function sine(hz: number, sr: number, n: number, amp = 0.5, phase = 0): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin(2 * Math.PI * hz * (i / sr) + phase);
  return out;
}

/** 대역 제한 톱니파(배음 합) + 백색 잡음(dB, 신호 RMS 대비) */
export function sawNoise(hz: number, sr: number, n: number, noiseDb = -20, seed = 1): Float32Array {
  const out = new Float32Array(n);
  const harmonics = Math.max(1, Math.floor(sr / 2 / hz) - 1);
  for (let k = 1; k <= Math.min(harmonics, 40); k++) {
    const a = (0.5 / k) * (k % 2 ? 1 : -1);
    for (let i = 0; i < n; i++) out[i] += a * Math.sin(2 * Math.PI * hz * k * (i / sr));
  }
  let rms = 0;
  for (let i = 0; i < n; i++) rms += out[i] * out[i];
  rms = Math.sqrt(rms / n);
  const nAmp = rms * Math.pow(10, noiseDb / 20) * Math.sqrt(3);
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out[i] += nAmp * ((s / 4294967296) * 2 - 1);
  }
  return out;
}
