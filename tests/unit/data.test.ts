import { HighNoteDB, newProfile, newProgress } from '../../src/data/db';
import { exportAll, importAll, parseImport, ImportError, clearAll } from '../../src/data/exportImport';

describe('JSON 내보내기/가져오기 (§5, P1-7)', () => {
  let d: HighNoteDB;
  beforeEach(async () => {
    d = new HighNoteDB(`t-${Math.random()}`);
    await d.open();
    await d.profile.put({ ...newProfile(1), nickname: '테스트', onboarded: true });
    await d.progress.put({ ...newProgress(), xp: 321, level: 3 });
    await d.rangeTests.add({ at: 2, lowest: 50, comfortMax: 70, highestAbs: 74, passaggio: null, dbSlope: 0.5, algoVersion: 'range-1', a4: 440, quality: 0.8, completed: true });
    await d.sessions.add({ startedAt: 3, endedAt: 4, durationSec: 600, highZoneSec: 40, xpGained: 50, warmupDone: true, a4: 440, selfCheck: { pain: 0, hoarse: 1, fatigue: 2, at: 4 } });
    await d.notes.put({ midi: 69, state: 'acquired', firstAt: 3, bestHeldMs: 1600, bestCentsSD: 12.5 });
    await d.coach.add({ at: 5, text: '좋아요', reactions: { '👍': 1 } });
  });

  it('왕복 무손실', async () => {
    const a = await exportAll(d, 100);
    const text = JSON.stringify(a);
    const d2 = new HighNoteDB(`t2-${Math.random()}`);
    await importAll(d2, parseImport(text));
    const b = await exportAll(d2, 100);
    expect(b).toEqual(a);
  });

  it('검증 실패 시 기존 데이터 유지(원자적)', async () => {
    const a = await exportAll(d);
    const bad = JSON.parse(JSON.stringify(a));
    bad.tables.notes.push({ midi: 500, state: 'acquired' });
    expect(() => parseImport(JSON.stringify(bad))).toThrow(ImportError);
    expect(await d.notes.count()).toBe(1);
  });

  it('형식·버전·크기 검사', () => {
    expect(() => parseImport('not json')).toThrow(ImportError);
    expect(() => parseImport(JSON.stringify({ app: 'other' }))).toThrow(ImportError);
    expect(() => parseImport(JSON.stringify({ app: 'highnote', schemaVersion: 99, tables: {} }))).toThrow(ImportError);
    expect(() => parseImport('x'.repeat(6 * 1024 * 1024))).toThrow(ImportError);
  });

  it('오디오 데이터 없음 — 내보내기에 샘플 배열이 없다', async () => {
    const text = JSON.stringify(await exportAll(d));
    expect(text).not.toMatch(/samples|Float32/);
  });

  it('초기화', async () => {
    await clearAll(d);
    expect(await d.profile.count()).toBe(0);
  });
});
