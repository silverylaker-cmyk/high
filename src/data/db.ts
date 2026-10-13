import Dexie, { type Table } from 'dexie';
import type { Difficulty } from '../analysis/difficulty';
import type { Ceiling, CeilingChange } from '../analysis/ceiling';
import type { NoteEntry } from '../meta/collection';
import type { Quest } from '../meta/quests';
import type { PreCheck } from '../safety/rules';

// §5 데이터 모델 + P1-8 보강(상한 분리·변경 근거, 측정 버전·A4·품질, 시작 전 확인·중단 기록)
export const SCHEMA_VERSION = 1;

export interface Settings {
  difficulty: Difficulty;
  headphones: boolean;
  a4: number;
  weeklyGoal: 3 | 4 | 5;
  replay: boolean;
  noteStyle: 'both' | 'intl';
}

export interface Calib {
  noiseFloorDb: number;
  refDb: number | null;
  updatedAt: number;
  /** 브라우저가 에코 제거·소음 억제·자동 음량을 실제로 껐는지 */
  processing: 'off' | 'on' | 'unknown';
}

export interface Profile {
  id: 'me';
  nickname: string;
  createdAt: number;
  onboarded: boolean;
  settings: Settings;
  calib: Calib | null;
}

export interface RangeTest {
  id?: number;
  at: number;
  lowest: number;
  comfortMax: number;
  highestAbs: number;
  /** 추적 끊김 군집 위치. 표시 전용(D2) */
  passaggio: number | null;
  dbSlope: number;
  algoVersion: string;
  a4: number;
  /** 유효(유성) 프레임 비율 */
  quality: number;
  completed: boolean;
}

export interface SelfCheck {
  pain: 0 | 1 | 2 | 3;
  hoarse: 0 | 1 | 2 | 3;
  fatigue: 0 | 1 | 2 | 3;
  longHoarse?: boolean;
  at: number;
}

export interface Session {
  id?: number;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  highZoneSec: number;
  xpGained: number;
  warmupDone: boolean;
  selfCheck?: SelfCheck;
  preCheckId?: number;
  interrupted?: 'discomfort' | 'stop' | null;
  a4: number;
  /** 진행 중 세션(앱을 닫았다 열어도 같은 날이면 이어서) */
  open?: boolean;
}

export type GameKind = 'bubble' | 'cooldown' | 'siren' | 'climber';

export interface Attempt {
  id?: number;
  sessionId: number;
  game: GameKind;
  targetMidi?: number;
  success: boolean;
  /** 'unmeasurable'은 성공/실패와 별도(P0-4) */
  outcome: 'success' | 'fail' | 'unmeasurable' | 'partial';
  score: number;
  centsMean?: number;
  centsSD?: number;
  heldMs?: number;
  /** 음정 추적 끊김 수(원인 미확인, 점수 미반영) */
  trackBreaks?: number;
  breakMidis?: number[];
  maxRelDb?: number;
  validRatio?: number;
  at: number;
}

export interface Progress {
  id: 'me';
  xp: number;
  level: number;
  weekStreak: number;
  energyDate: string;
  energyBudgetSec: number;
  energyUsedTodaySec: number;
  ceiling: Ceiling | null;
  /** v2 상향 정책용 기록(MVP에서는 비어 있음) */
  notesGainedLog: { midi: number; at: number }[];
  warmupDate: string;
  warmupSec: number;
  counters: {
    warmups: number;
    cooldowns: number;
    sirenGlides: number;
    maxCombo: number;
    restChoices: number;
  };
  /** 사이드바 '새로 열림' 표시용 */
  unseen: string[];
}

export interface Achievement {
  id: string;
  unlockedAt: number;
}

export interface CoachMessage {
  id?: number;
  at: number;
  text: string;
  reactions: Record<string, number>;
}

export interface StopEvent {
  id?: number;
  at: number;
  reason: 'discomfort' | 'stop';
  where: string;
}

export interface CeilingLogEntry extends CeilingChange {
  id?: number;
}

export class HighNoteDB extends Dexie {
  profile!: Table<Profile, 'me'>;
  rangeTests!: Table<RangeTest, number>;
  sessions!: Table<Session, number>;
  attempts!: Table<Attempt, number>;
  notes!: Table<NoteEntry, number>;
  progress!: Table<Progress, 'me'>;
  quests!: Table<Quest, string>;
  achievements!: Table<Achievement, string>;
  coach!: Table<CoachMessage, number>;
  prechecks!: Table<PreCheck & { id?: number }, number>;
  stops!: Table<StopEvent, number>;
  ceilingLog!: Table<CeilingLogEntry, number>;

  constructor(name = 'highnote') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      profile: 'id',
      rangeTests: '++id, at',
      sessions: '++id, startedAt',
      attempts: '++id, sessionId, game, at',
      notes: 'midi',
      progress: 'id',
      quests: 'id, date',
      achievements: 'id',
      coach: '++id, at',
      prechecks: '++id, at',
      stops: '++id, at',
      ceilingLog: '++id, at',
    });
  }
}

export const TABLES = [
  'profile',
  'rangeTests',
  'sessions',
  'attempts',
  'notes',
  'progress',
  'quests',
  'achievements',
  'coach',
  'prechecks',
  'stops',
  'ceilingLog',
] as const;
export type TableName = (typeof TABLES)[number];

export let db = new HighNoteDB();

/** 테스트용 */
export function useDb(d: HighNoteDB) {
  db = d;
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'easy',
  headphones: false,
  a4: 440,
  weeklyGoal: 4,
  replay: true,
  noteStyle: 'both',
};

export function newProfile(now: number): Profile {
  return { id: 'me', nickname: '', createdAt: now, onboarded: false, settings: { ...DEFAULT_SETTINGS }, calib: null };
}

export function newProgress(): Progress {
  return {
    id: 'me',
    xp: 0,
    level: 1,
    weekStreak: 0,
    energyDate: '',
    energyBudgetSec: 0,
    energyUsedTodaySec: 0,
    ceiling: null,
    notesGainedLog: [],
    warmupDate: '',
    warmupSec: 0,
    counters: { warmups: 0, cooldowns: 0, sirenGlides: 0, maxCombo: 0, restChoices: 0 },
    unseen: [],
  };
}
