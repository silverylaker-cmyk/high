import {
  availability,
  finishSession,
  isSymptomToday,
  loadApp,
  recordStop,
  resetAll,
  saveRangeTest,
  setManualCeiling,
  spendEnergy,
  startSession,
  addWarmup,
  useApp,
  recordNoteResult,
} from '../../src/app/store';
import type { HoldResult } from '../../src/analysis/hold';

const none = { pain: false, hoarse: false, suddenChange: false, breathing: false };
const ok: HoldResult = { status: 'success', reason: null, heldMs: 1600, elapsedMs: 2000, centsMean: 3, centsSD: 10, maxRelDb: 2, measurableRatio: 1, touched: true, lastCents: 2 };

describe('앱 흐름(스토어 + IndexedDB)', () => {
  beforeEach(async () => {
    await loadApp();
    await resetAll();
  });

  it('시작 전 확인에서 증상 → 세션 안 열림, 오늘 모든 발성 게임 잠금', async () => {
    expect(await startSession({ ...none, hoarse: true })).toBe(false);
    expect(useApp.getState().session).toBeNull();
    expect(isSymptomToday()).toBe(true);
    const a = availability();
    expect(a.bubble.ok).toBe(false);
    expect(a.cooldown.ok).toBe(false);
  });

  it('워밍업 90초 → 고음 게임 열림, 불편해요 → 오늘 잠금', async () => {
    await saveRangeTest({ at: Date.now(), lowest: 50, comfortMax: 70, highestAbs: 74, passaggio: null, dbSlope: 0, algoVersion: 'range-1', a4: 440, quality: 0.9, completed: true });
    expect(await startSession(none)).toBe(true);
    expect(availability().climber.reason).toBe('warmup');
    await addWarmup(50);
    expect(availability().climber.reason).toBe('warmup');
    const done = await addWarmup(50);
    expect(done).toBe(true);
    expect(availability().climber.ok).toBe(true);
    expect(useApp.getState().quests[0].done).toBe(true);
    await recordStop('discomfort', 'climber');
    expect(availability().bubble.reason).toBe('symptom');
    expect(useApp.getState().progress.counters.restChoices).toBe(1);
  });

  it('고음역 연습량 소진 → 고음 게임 잠금', async () => {
    await saveRangeTest({ at: Date.now(), lowest: 50, comfortMax: 70, highestAbs: 74, passaggio: null, dbSlope: 0, algoVersion: 'range-1', a4: 440, quality: 0.9, completed: true });
    await startSession(none);
    await addWarmup(90);
    await spendEnergy(120);
    expect(availability().siren.reason).toBe('energy');
    expect(availability().cooldown.ok).toBe(true);
  });

  it('목표음 유지 성공은 컬렉션에 기록되지만 상한은 오르지 않는다(D1)', async () => {
    await saveRangeTest({ at: Date.now(), lowest: 50, comfortMax: 70, highestAbs: 74, passaggio: null, dbSlope: 0, algoVersion: 'range-1', a4: 440, quality: 0.9, completed: true });
    await startSession(none);
    for (let i = 0; i < 5; i++) await recordNoteResult(70, ok);
    expect(useApp.getState().notes[70].state).toBe('acquired');
    expect(useApp.getState().progress.ceiling!.comfortableCeiling).toBe(70);
    expect(useApp.getState().progress.ceiling!.practiceTarget).toBe(70);
  });

  it('수동 상한은 낮추기만', async () => {
    await setManualCeiling(66);
    expect(useApp.getState().progress.ceiling!.comfortableCeiling).toBe(66);
    await setManualCeiling(70);
    expect(useApp.getState().progress.ceiling!.comfortableCeiling).toBe(66);
    await setManualCeiling(64);
    expect(useApp.getState().progress.ceiling!.comfortableCeiling).toBe(64);
  });

  it('세션 종료 → 자가체크·코치 메시지 기록, 건너뛰면 자가체크 없음', async () => {
    await startSession(none);
    await finishSession({ pain: 0, hoarse: 2, fatigue: 1 });
    const s = useApp.getState();
    expect(s.session).toBeNull();
    expect(s.coach).toHaveLength(1);
    expect(s.coach[0].text).toContain('절반');
    expect(s.sessions.at(-1)!.selfCheck!.hoarse).toBe(2);
    await startSession(none);
    await finishSession(null);
    expect(useApp.getState().sessions.at(-1)!.selfCheck).toBeUndefined();
  });
});
