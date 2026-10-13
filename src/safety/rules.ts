import { SAFETY } from './config';
import { DAY_MS, dayKey } from '../meta/dates';
import type { SelfCheckRecord } from '../meta/energy';
import { remainingSec, type EnergyState } from '../meta/energy';

// §6 안전 규칙 + 검수 D3·P0-3

export type GameId = 'bubble' | 'cooldown' | 'siren' | 'climber';
export type LockReason = 'symptom' | 'noRange' | 'warmup' | 'energy' | 'hardStop' | 'level' | 'noPrecheck';

/** 시작 전 상태 확인(P0-3). 하나라도 해당하면 오늘 발성 연습을 하지 않는다 */
export interface PreCheck {
  at: number;
  pain: boolean;
  hoarse: boolean;
  suddenChange: boolean;
  breathing: boolean;
}

export const preCheckBlocks = (p: PreCheck) => p.pain || p.hoarse || p.suddenChange || p.breathing;

export interface AvailabilityContext {
  now: number;
  level: number;
  hasRange: boolean;
  /** 오늘 증상 보고(시작 전 확인·게임 중 '불편해요'·자가체크 통증) → 버블·쿨다운까지 잠금 */
  symptomToday: boolean;
  /** 이번 세션에서 시작 전 상태 확인을 마쳤는지 */
  precheckDone: boolean;
  warmupDoneToday: boolean;
  energy: EnergyState;
  sessionMinutes: number;
}

export type Availability = Record<GameId, { ok: boolean; reason?: LockReason }>;

export function gameAvailability(c: AvailabilityContext): Availability {
  const lock = (reason: LockReason) => ({ ok: false, reason });
  const base = (): { ok: boolean; reason?: LockReason } => {
    if (c.symptomToday) return lock('symptom');
    if (!c.precheckDone) return lock('noPrecheck');
    return { ok: true };
  };
  const high = (): { ok: boolean; reason?: LockReason } => {
    const b = base();
    if (!b.ok) return b;
    if (!c.hasRange) return lock('noRange');
    if (!c.warmupDoneToday) return lock('warmup');
    if (sessionTimeState(c.sessionMinutes) === 'hard') return lock('hardStop');
    if (remainingSec(c.energy) <= 0) return lock('energy');
    return { ok: true };
  };
  return { bubble: base(), cooldown: base(), siren: high(), climber: high() };
}

export function sessionTimeState(minutes: number): 'ok' | 'soft' | 'hard' {
  if (minutes >= SAFETY.SESSION_HARD_STOP_MIN) return 'hard';
  if (minutes >= SAFETY.SESSION_SOFT_STOP_MIN) return 'soft';
  return 'ok';
}

export interface SelfCheckFull extends SelfCheckRecord {
  /** "2주 이상 쉰 목소리가 이어져요" */
  longHoarse?: boolean;
}

export type RedFlag = null | 'pain3' | 'longHoarse' | 'repeatedHoarse';

/** 진료 권장 카드 조건. 숫자는 제품 정책이며 진료 지침에서 도출한 값이 아니다(§11.5) */
export function redFlag(checks: readonly SelfCheckFull[], now: number): RedFlag {
  const recent = checks.filter((c) => now - c.at <= SAFETY.RED_FLAG_WINDOW_DAYS * DAY_MS);
  if (recent.some((c) => c.pain >= 3)) return 'pain3';
  if (recent.some((c) => c.longHoarse)) return 'longHoarse';
  const hoarseDays = new Set(recent.filter((c) => c.hoarse >= 2).map((c) => dayKey(c.at)));
  if (hoarseDays.size >= SAFETY.RED_FLAG_HOARSE_DAYS) return 'repeatedHoarse';
  return null;
}

/** 오늘 발성 연습을 막는 증상이 있었는지 */
export function symptomToday(
  now: number,
  prechecks: readonly PreCheck[],
  stops: readonly { at: number; reason: 'discomfort' | 'stop' }[],
  checks: readonly SelfCheckFull[],
): boolean {
  const today = dayKey(now);
  return (
    prechecks.some((p) => dayKey(p.at) === today && preCheckBlocks(p)) ||
    stops.some((s) => s.reason === 'discomfort' && dayKey(s.at) === today) ||
    checks.some((c) => dayKey(c.at) === today && (c.pain >= 2 || c.hoarse >= 2))
  );
}

/** 7일 롤링 신규 상한 음 개수 상한(§6). MVP에서는 상한 상향이 꺼져 있어 v2 상향 정책에서 사용 */
export function newNotesRemaining(log: readonly { midi: number; at: number }[], now: number): number {
  const used = log.filter((e) => now - e.at < 7 * DAY_MS).length;
  return Math.max(0, SAFETY.NEW_NOTE_MAX_PER_7D - used);
}
