import { HoldJudge } from '../../src/analysis/hold';
import { PlaybackGate } from '../../src/analysis/gate';
import { frames, tf, HOP } from './helpers';

// §4.5 + P1-3 유지 판정 회귀 테스트
const mk = () => new HoldJudge({ targetMidi: 69, tolCents: 35, holdMs: 1500 });
const run = (j: HoldJudge, fs: ReturnType<typeof frames>) => {
  let r = j.push(fs[0]);
  for (const f of fs.slice(1)) r = j.push(f);
  return r;
};

describe('HoldJudge', () => {
  it('허용 오차 안에서 1.5 s 유지 → 성공', () => {
    const r = run(mk(), frames(0, 2, () => 69.1));
    expect(r.status).toBe('success');
    expect(r.heldMs).toBeGreaterThanOrEqual(1500);
  });

  it('150 ms 이내 이탈은 유예(리셋 안 함), 이탈 중에는 누적하지 않음', () => {
    const j = mk();
    run(j, frames(0, 1.0, () => 69));
    const before = j.push(tf(1.0, 69)).heldMs;
    const mid = run(j, frames(1.0 + HOP, 0.1, () => 70)); // 100 ms 이탈
    expect(mid.heldMs).toBe(before);
    const r = run(j, frames(1.1 + HOP, 0.6, () => 69));
    expect(r.status).toBe('success');
  });

  it('150 ms 초과 이탈 → heldMs 0으로 리셋', () => {
    const j = mk();
    run(j, frames(0, 1.0, () => 69));
    const r = run(j, frames(1.0, 0.2, () => 70));
    expect(r.heldMs).toBe(0);
  });

  it('숨 끊김(무성)도 이탈로 본다', () => {
    const j = mk();
    run(j, frames(0, 1.0, () => 69));
    const r = run(j, frames(1.0, 0.3, () => null));
    expect(r.heldMs).toBe(0);
  });

  it('중복·역순 프레임은 시간을 늘리지 않는다', () => {
    const j = mk();
    const f = tf(0.5, 69);
    j.push(tf(0.49, 69));
    const a = j.push(f).heldMs;
    const b = j.push(f).heldMs;
    const c = j.push(tf(0.3, 69)).heldMs;
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('프레임 누락·워커 지연은 성공을 만들지 않는다(dt 상한)', () => {
    const j = mk();
    // 0.2 s 간격으로 듬성듬성 들어온 프레임 8개(실제 1.6 s 경과)
    let r = j.push(tf(0, 69));
    for (let i = 1; i <= 8; i++) r = j.push(tf(i * 0.2, 69));
    expect(r.status).not.toBe('success');
    expect(r.heldMs).toBeLessThan(1500);
  });

  it('창 4 s 동안 유효 신호가 부족하면 실패가 아닌 측정 불가', () => {
    const r = run(mk(), frames(0, 4.2, (t) => (t % 1 < 0.2 ? 69 : null)));
    expect(r.status).toBe('unmeasurable');
  });

  it('창 종료 시 원인 구분: 낮음/높음/지속 부족', () => {
    expect(run(mk(), frames(0, 4.2, () => 68)).reason).toBe('low');
    expect(run(mk(), frames(0, 4.2, () => 70)).reason).toBe('high');
    const short = run(mk(), frames(0, 4.2, (t) => (Math.floor(t / 0.5) % 2 ? 69 : 69.6)));
    expect(short.status).toBe('fail');
    expect(short.reason).toBe('short');
  });

  it('gated 프레임(기준음 재생 중)은 판정하지 않는다', () => {
    const r = run(mk(), frames(0, 3, () => 69, { gated: true }));
    expect(r.status).toBe('idle');
    expect(r.heldMs).toBe(0);
  });
});

describe('P0-8 기준음만 재생 → 성공 0건', () => {
  it('재생 구간 + 꼬리와 겹치는 프레임은 모두 제외되어 성공하지 않는다', () => {
    const gate = new PlaybackGate();
    let successes = 0;
    // 기준음 10회: 각 0.8 s 재생, 그동안 마이크에는 기준음과 같은 음이 완벽하게 들어온다
    for (let k = 0; k < 10; k++) {
      const start = k * 3;
      gate.add(start, start + 0.8, 120);
      const j = new HoldJudge({ targetMidi: 69, tolCents: 50, holdMs: 800 });
      for (const f of frames(start, 0.8 + 0.12, () => 69)) {
        f.gated = gate.isGated(f.t, 2048 / 48000);
        j.push(f);
      }
      // 이후 사용자 무음
      for (const f of frames(start + 0.92 + 2048 / 48000, 4.2, () => null)) j.push(f);
      if (j.finish().status === 'success') successes++;
    }
    expect(successes).toBe(0);
  });

  it('꼬리 120 ms까지 제외, 프레임 창이 겹치면 제외', () => {
    const gate = new PlaybackGate();
    gate.add(1, 1.8, 120);
    expect(gate.isGated(1.9)).toBe(true);
    expect(gate.isGated(1.93)).toBe(false);
    expect(gate.isGated(1.95, 0.0427)).toBe(true);
    expect(gate.isGated(0.99)).toBe(false);
  });
});
