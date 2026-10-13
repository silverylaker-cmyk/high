import { midiToHz } from './noteMath';

// 기준음: 기기에서 합성한 삼각파(§8의 샘플러 로드 실패 대체 경로를 기본으로 사용, 외부 네트워크 없음)
export function scheduleTone(ctx: AudioContext, midi: number, durSec: number, a4 = 440, startDelay = 0.05) {
  const start = ctx.currentTime + startDelay;
  const end = start + durSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = midiToHz(midi, a4);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
  gain.gain.setValueAtTime(0.25, end - 0.06);
  gain.gain.linearRampToValueAtTime(0, end);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(end + 0.02);
  return { start, end };
}

/** 짧은 효과음(발성 창 종료 후에만 사용, §4.7) */
export function scheduleBlip(ctx: AudioContext, ok: boolean) {
  const t = ctx.currentTime + 0.02;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(ok ? 880 : 330, t);
  if (ok) osc.frequency.setValueAtTime(1175, t + 0.08);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.2);
  return { start: t, end: t + 0.2 };
}
