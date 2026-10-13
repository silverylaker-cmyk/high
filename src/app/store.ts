import { create } from 'zustand';
import {
  db,
  newProfile,
  newProgress,
  type Attempt,
  type Calib,
  type CoachMessage,
  type Profile,
  type Progress,
  type RangeTest,
  type SelfCheck,
  type Session,
  type Settings,
  type StopEvent,
} from '../data/db';
import { clearAll, exportAll, importAll, parseImport } from '../data/exportImport';
import { ceilingFromRangeTest, ceilingFromManual, lowerCeiling as lowerC, type Ceiling } from '../analysis/ceiling';
import { recordNote, type NoteEntry } from '../meta/collection';
import { advanceQuests, generateDaily, questTitle, type Quest, type QuestKind } from '../meta/quests';
import { newlyUnlocked } from '../meta/achievements';
import { coachMessage } from '../meta/coach';
import { dayKey } from '../meta/dates';
import { ensureToday, isNegative, remainingSec } from '../meta/energy';
import { levelForXp, XP } from '../meta/xp';
import { weekStreak } from '../meta/streak';
import { gameAvailability, symptomToday, preCheckBlocks, type PreCheck } from '../safety/rules';
import { SAFETY } from '../safety/config';
import { noteLabel } from '../audio/noteMath';
import { ko } from '../copy/ko';
import type { HoldResult } from '../analysis/hold';

export interface CurrentSession {
  id: number;
  startedAt: number;
  highZoneSec: number;
  xp: number;
  warmupDone: boolean;
  newNotes: string[];
  playedClimber: boolean;
  interrupted: 'discomfort' | 'stop' | null;
}

export interface Toast {
  id: number;
  text: string;
}

interface AppState {
  loaded: boolean;
  storageOk: boolean;
  profile: Profile;
  progress: Progress;
  quests: Quest[];
  notes: Record<number, NoteEntry>;
  achievements: Record<string, number>;
  coach: CoachMessage[];
  ranges: RangeTest[];
  sessions: Session[];
  prechecks: PreCheck[];
  stops: StopEvent[];
  session: CurrentSession | null;
  toasts: Toast[];
  celebrate: string | null;
}

const initial: AppState = {
  loaded: false,
  storageOk: true,
  profile: newProfile(0),
  progress: newProgress(),
  quests: [],
  notes: {},
  achievements: {},
  coach: [],
  ranges: [],
  sessions: [],
  prechecks: [],
  stops: [],
  session: null,
  toasts: [],
  celebrate: null,
};

export const useApp = create<AppState>(() => initial);
const set = useApp.setState;
const get = useApp.getState;

let toastId = 1;
export function toast(text: string) {
  const id = toastId++;
  set((s) => ({ toasts: [...s.toasts, { id, text }] }));
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000);
}

export const selfChecks = (s: AppState = get()) =>
  s.sessions.filter((x) => x.selfCheck).map((x) => x.selfCheck as SelfCheck);

async function persistProgress(p: Progress) {
  set({ progress: p });
  await db.progress.put(p);
}

/** 날짜가 바뀌면 에너지·퀘스트 갱신 */
async function rollDay(now = Date.now()) {
  const s = get();
  const energy = ensureToday(s.progress, selfChecks(s), now);
  if (energy !== s.progress) await persistProgress({ ...s.progress, ...energy });
  const today = dayKey(now);
  if (!s.quests.length || s.quests[0].date !== today) {
    const existing = await db.quests.where('date').equals(today).toArray();
    const qs = existing.length ? existing : generateDaily(today);
    if (!existing.length) await db.quests.bulkPut(qs);
    set({ quests: qs });
  }
}

export async function loadApp(now = Date.now()) {
  try {
    const [profile, progress, notes, ach, coach, ranges, sessions, prechecks, stops] = await Promise.all([
      db.profile.get('me'),
      db.progress.get('me'),
      db.notes.toArray(),
      db.achievements.toArray(),
      db.coach.orderBy('at').reverse().limit(30).toArray(),
      db.rangeTests.orderBy('at').toArray(),
      db.sessions.orderBy('startedAt').toArray(),
      db.prechecks.orderBy('at').toArray(),
      db.stops.orderBy('at').toArray(),
    ]);
    const p = profile ?? newProfile(now);
    if (!profile) await db.profile.put(p);
    const pr = { ...newProgress(), ...(progress ?? {}) } as Progress;
    pr.counters = { ...newProgress().counters, ...(pr.counters ?? {}) };
    // 같은 날 열려 있던 세션은 이어서, 아니면 닫는다
    let session: CurrentSession | null = null;
    const open = sessions.filter((x) => x.open);
    for (const o of open) {
      if (dayKey(o.startedAt) === dayKey(now) && now - o.startedAt < 3 * 3600_000) {
        session = {
          id: o.id!,
          startedAt: o.startedAt,
          highZoneSec: o.highZoneSec,
          xp: o.xpGained,
          warmupDone: o.warmupDone,
          newNotes: [],
          playedClimber: false,
          interrupted: o.interrupted ?? null,
        };
      } else {
        await db.sessions.update(o.id!, { open: false } );
      }
    }
    set({
      loaded: true,
      profile: p,
      progress: pr,
      notes: Object.fromEntries(notes.map((n) => [n.midi, n])),
      achievements: Object.fromEntries(ach.map((a) => [a.id, a.unlockedAt])),
      coach,
      ranges,
      sessions,
      prechecks,
      stops,
      session,
    });
    await rollDay(now);
  } catch {
    // 사생활 보호 모드 등으로 IndexedDB를 못 쓰면 메모리로만 동작
    set({ loaded: true, storageOk: false, quests: generateDaily(dayKey(now)) });
  }
}

// ── 프로필·설정 ──
export async function saveProfile(patch: Partial<Profile>) {
  const p = { ...get().profile, ...patch };
  set({ profile: p });
  await db.profile.put(p).catch(() => {});
}

export async function saveSettings(patch: Partial<Settings>) {
  await saveProfile({ settings: { ...get().profile.settings, ...patch } });
}

export async function saveCalib(c: Partial<Calib>) {
  const prev = get().profile.calib ?? { noiseFloorDb: -60, refDb: null, updatedAt: 0, processing: 'unknown' as const };
  await saveProfile({ calib: { ...prev, ...c, updatedAt: Date.now() } });
}

// ── 파생 상태 ──
export function ceiling(): Ceiling | null {
  return get().progress.ceiling;
}

export function warmupDoneToday(s: AppState = get(), now = Date.now()) {
  return s.progress.warmupDate === dayKey(now) && s.progress.warmupSec >= SAFETY.WARMUP_REQUIRED_SEC;
}

export function sessionMinutes(s: AppState = get(), now = Date.now()) {
  return s.session ? (now - s.session.startedAt) / 60000 : 0;
}

export function isSymptomToday(s: AppState = get(), now = Date.now()) {
  return symptomToday(now, s.prechecks, s.stops, selfChecks(s));
}

export function availability(s: AppState = get(), now = Date.now()) {
  return gameAvailability({
    now,
    level: s.progress.level,
    hasRange: !!s.progress.ceiling,
    symptomToday: isSymptomToday(s, now),
    precheckDone: !!s.session,
    warmupDoneToday: warmupDoneToday(s, now),
    energy: s.progress,
    sessionMinutes: sessionMinutes(s, now),
  });
}

// ── 세션 ──
/** 시작 전 상태 확인. 증상이 있으면 세션을 열지 않고 false */
export async function startSession(pc: Omit<PreCheck, 'at'>, now = Date.now()): Promise<boolean> {
  await rollDay(now);
  const rec: PreCheck = { ...pc, at: now };
  const id = await db.prechecks.add(rec).catch(() => 0);
  set((s) => ({ prechecks: [...s.prechecks, rec] }));
  if (preCheckBlocks(rec)) return false;
  if (get().session) return true;
  const sess: Session = {
    startedAt: now,
    endedAt: now,
    durationSec: 0,
    highZoneSec: 0,
    xpGained: 0,
    warmupDone: warmupDoneToday(get(), now),
    preCheckId: id || undefined,
    interrupted: null,
    a4: get().profile.settings.a4,
    open: true,
  };
  const sid = await db.sessions.add(sess).catch(() => Date.now());
  set({
    session: {
      id: sid,
      startedAt: now,
      highZoneSec: 0,
      xp: 0,
      warmupDone: sess.warmupDone,
      newNotes: [],
      playedClimber: false,
      interrupted: null,
    },
  });
  await checkAchievements();
  return true;
}

async function syncSession() {
  const s = get().session;
  if (!s) return;
  const now = Date.now();
  await db.sessions
    .update(s.id, {
      endedAt: now,
      durationSec: Math.round((now - s.startedAt) / 1000),
      highZoneSec: Math.round(s.highZoneSec),
      xpGained: s.xp,
      warmupDone: s.warmupDone,
      interrupted: s.interrupted,
    })
    .catch(() => {});
}

export async function addAttempt(a: Omit<Attempt, 'sessionId' | 'at'>) {
  const s = get().session;
  if (!s) return;
  await db.attempts.add({ ...a, sessionId: s.id, at: Date.now() }).catch(() => {});
  if (a.game === 'climber') set({ session: { ...s, playedClimber: true } });
}

export async function addXp(n: number) {
  if (n <= 0) return;
  const s = get();
  const before = s.progress.level;
  const xp = s.progress.xp + n;
  const level = levelForXp(xp);
  const unseen = [...s.progress.unseen];
  await persistProgress({ ...s.progress, xp, level, unseen });
  if (s.session) set({ session: { ...s.session, xp: s.session.xp + n } });
  if (level > before) {
    toast(ko.result.levelUp(level));
    set({ celebrate: ko.result.levelUp(level) });
  }
}

/** 고음역 연습량 사용(발성 창 총시간 기준, P0-5) */
export async function spendEnergy(sec: number) {
  if (sec <= 0) return;
  await rollDay();
  const s = get();
  await persistProgress({ ...s.progress, energyUsedTodaySec: s.progress.energyUsedTodaySec + sec });
  if (s.session) set({ session: { ...s.session, highZoneSec: s.session.highZoneSec + sec } });
  await syncSession();
}

export function energyLeft(s: AppState = get()) {
  return remainingSec(s.progress);
}

export async function addWarmup(voicedSec: number, now = Date.now()) {
  const s = get();
  const today = dayKey(now);
  const prev = s.progress.warmupDate === today ? s.progress.warmupSec : 0;
  const warmupSec = Math.min(SAFETY.WARMUP_REQUIRED_SEC, prev + voicedSec);
  const justDone = prev < SAFETY.WARMUP_REQUIRED_SEC && warmupSec >= SAFETY.WARMUP_REQUIRED_SEC;
  const counters = { ...s.progress.counters, warmups: s.progress.counters.warmups + (justDone ? 1 : 0) };
  const unseen = justDone ? [...new Set([...s.progress.unseen, 'siren', 'climber'])] : s.progress.unseen;
  await persistProgress({ ...s.progress, warmupDate: today, warmupSec, counters, unseen });
  await advanceQuest('warmup', warmupSec - prev);
  if (justDone) {
    if (s.session) set({ session: { ...get().session!, warmupDone: true } });
    await addXp(XP.BUBBLE_DONE);
    await syncSession();
    await checkAchievements();
  }
  return justDone;
}

export async function bumpCounter(key: keyof Progress['counters'], value?: number) {
  const s = get();
  const c = { ...s.progress.counters };
  c[key] = value != null ? Math.max(c[key], value) : c[key] + 1;
  await persistProgress({ ...s.progress, counters: c });
  await checkAchievements();
}

export async function recordNoteResult(midi: number, r: HoldResult) {
  const s = get();
  const { entry, newlyAcquired } = recordNote(
    s.notes[midi],
    midi,
    { success: r.status === 'success', touched: r.touched, heldMs: r.heldMs, centsSD: r.centsSD },
    Date.now(),
  );
  if (!entry) return false;
  set({ notes: { ...s.notes, [midi]: entry } });
  await db.notes.put(entry).catch(() => {});
  if (newlyAcquired) {
    const label = noteLabel(midi);
    if (s.session) set({ session: { ...get().session!, newNotes: [...get().session!.newNotes, label] } });
    set({ celebrate: ko.result.newNote(label) });
    await addXp(XP.NOTE_ACQUIRED);
    await checkAchievements();
  }
  return newlyAcquired;
}

export async function advanceQuest(kind: QuestKind, amount: number) {
  if (amount <= 0) return;
  await rollDay();
  const { quests, completed } = advanceQuests(get().quests, kind, amount);
  set({ quests });
  await db.quests.bulkPut(quests).catch(() => {});
  for (const q of completed) {
    toast(ko.quests.done(questTitle(q.kind)));
    await addXp(XP.QUEST_DONE);
  }
}

/** '불편해요'·'그만하기'. 불편함이면 오늘 발성 연습 전체 잠금(P0-3) */
export async function recordStop(reason: 'discomfort' | 'stop', where: string) {
  const ev: StopEvent = { at: Date.now(), reason, where };
  await db.stops.add(ev).catch(() => {});
  set((s) => ({ stops: [...s.stops, ev] }));
  const s = get();
  if (s.session) {
    set({ session: { ...s.session, interrupted: reason === 'discomfort' ? 'discomfort' : s.session.interrupted ?? 'stop' } });
    await syncSession();
  }
  if (reason === 'discomfort') await bumpCounter('restChoices');
}

export async function finishSession(check: Omit<SelfCheck, 'at'> | null, now = Date.now()) {
  const s = get();
  const sess = s.session;
  const selfCheck: SelfCheck | undefined = check ? { ...check, at: now } : undefined;
  if (sess) {
    const patch = {
      endedAt: now,
      durationSec: Math.round((now - sess.startedAt) / 1000),
      highZoneSec: Math.round(sess.highZoneSec),
      xpGained: sess.xp,
      warmupDone: sess.warmupDone,
      interrupted: sess.interrupted,
      selfCheck,
      open: false,
    };
    await db.sessions.update(sess.id, patch ).catch(() => {});
    const full = { ...(s.sessions.find((x) => x.id === sess.id) ?? { startedAt: sess.startedAt, a4: s.profile.settings.a4 }), ...patch, id: sess.id } as Session;
    set({ sessions: [...s.sessions.filter((x) => x.id !== sess.id), full] });
    const text = coachMessage({
      durationSec: patch.durationSec,
      highZoneSec: patch.highZoneSec,
      warmupDone: sess.warmupDone,
      newNoteLabels: sess.newNotes,
      stoppedForDiscomfort: sess.interrupted === 'discomfort',
      selfCheckNegative: !!selfCheck && isNegative(selfCheck),
      energyLeftSec: remainingSec(get().progress),
      playedClimber: sess.playedClimber,
    });
    const msg: CoachMessage = { at: now, text, reactions: {} };
    const id = await db.coach.add(msg).catch(() => undefined);
    set((st) => ({ coach: [{ ...msg, id }, ...st.coach].slice(0, 30), session: null }));
  } else if (selfCheck) {
    // 세션 없이 자가체크만 남기는 경우도 기록
    const rec: Session = { startedAt: now, endedAt: now, durationSec: 0, highZoneSec: 0, xpGained: 0, warmupDone: false, selfCheck, a4: s.profile.settings.a4 };
    const id = await db.sessions.add(rec).catch(() => undefined);
    set((st) => ({ sessions: [...st.sessions, { ...rec, id }] }));
  }
  if (selfCheck) await advanceQuest('selfcheck', 1);
  // 스트릭 갱신
  const starts = get().sessions.filter((x) => x.durationSec > 0).map((x) => x.startedAt);
  const ws = weekStreak(starts, get().profile.settings.weeklyGoal, now);
  await persistProgress({ ...get().progress, weekStreak: ws });
  await checkAchievements();
}

export async function reactCoach(id: number, emoji: string) {
  const s = get();
  const coach = s.coach.map((m) => {
    if (m.id !== id) return m;
    const r = { ...m.reactions };
    r[emoji] = r[emoji] ? 0 : 1;
    if (!r[emoji]) delete r[emoji];
    return { ...m, reactions: r };
  });
  set({ coach });
  const m = coach.find((x) => x.id === id);
  if (m) await db.coach.put(m).catch(() => {});
}

// ── 음역·상한(D1) ──
export async function saveRangeTest(t: Omit<RangeTest, 'id'>) {
  const s = get();
  const id = await db.rangeTests.add(t).catch(() => undefined);
  const prev = s.progress.ceiling;
  const c = ceilingFromRangeTest(t, prev, t.at);
  await db.ceilingLog.add({ at: t.at, from: prev?.comfortableCeiling ?? null, to: c.comfortableCeiling, reason: c.reason }).catch(() => {});
  set({ ranges: [...s.ranges, { ...t, id }] });
  await persistProgress({ ...get().progress, ceiling: c, unseen: [...new Set([...get().progress.unseen, 'siren', 'climber'])] });
  return c;
}

export async function setManualCeiling(note: number) {
  const now = Date.now();
  const prev = get().progress.ceiling;
  // 이미 상한이 있으면 낮추기만 허용
  const c = prev ? lowerC(prev, note, now) : ceilingFromManual(note, now);
  if (c === prev) return prev;
  await db.ceilingLog.add({ at: now, from: prev?.comfortableCeiling ?? null, to: c.comfortableCeiling, reason: c.reason }).catch(() => {});
  await persistProgress({ ...get().progress, ceiling: c });
  return c;
}

export async function lowerCeilingBy1() {
  const prev = get().progress.ceiling;
  if (!prev) return null;
  return setManualCeiling(prev.comfortableCeiling - 1);
}

// ── 업적 ──
export async function checkAchievements() {
  const s = get();
  const stats = {
    warmups: s.progress.counters.warmups,
    notesAcquired: Object.values(s.notes).filter((n) => n.state === 'acquired').length,
    sirenGlidesCompleted: s.progress.counters.sirenGlides,
    maxCombo: s.progress.counters.maxCombo,
    weekStreak: s.progress.weekStreak,
    restChoices: s.progress.counters.restChoices,
    prechecks: s.prechecks.length,
    cooldowns: s.progress.counters.cooldowns,
    selfchecks: s.sessions.filter((x) => x.selfCheck).length,
  };
  const ids = newlyUnlocked(stats, new Set(Object.keys(s.achievements)));
  if (!ids.length) return;
  const now = Date.now();
  await db.achievements.bulkPut(ids.map((id) => ({ id, unlockedAt: now }))).catch(() => {});
  set({ achievements: { ...s.achievements, ...Object.fromEntries(ids.map((id) => [id, now])) } });
  for (const id of ids) toast(ko.achievements.unlocked(ko.achievements.items[id][0]));
}

export async function markSeen(key: string) {
  const p = get().progress;
  if (!p.unseen.includes(key)) return;
  await persistProgress({ ...p, unseen: p.unseen.filter((k) => k !== key) });
}

// ── 데이터 ──
export async function exportJson(): Promise<string> {
  return JSON.stringify(await exportAll(db), null, 1);
}

export async function importJson(text: string) {
  const file = parseImport(text);
  await importAll(db, file);
  set({ ...initial });
  await loadApp();
}

export async function resetAll() {
  await clearAll(db);
  set({ ...initial });
  await loadApp();
}
