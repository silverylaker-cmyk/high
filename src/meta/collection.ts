// §2.3 음표 컬렉션. D1: '획득'은 편한 상한 안에서 유지에 성공한 기록일 뿐, 상한을 바꾸지 않는다.
export interface NoteEntry {
  midi: number;
  state: 'touched' | 'acquired';
  firstAt: number;
  bestHeldMs: number;
  bestCentsSD: number;
}

export function recordNote(
  prev: NoteEntry | undefined,
  midi: number,
  r: { success: boolean; touched: boolean; heldMs: number; centsSD: number | null },
  now: number,
): { entry: NoteEntry | undefined; newlyAcquired: boolean } {
  if (!r.success && !r.touched) return { entry: prev, newlyAcquired: false };
  const state: NoteEntry['state'] = r.success || prev?.state === 'acquired' ? 'acquired' : 'touched';
  const sd = r.centsSD ?? 999;
  const entry: NoteEntry = {
    midi,
    state,
    firstAt: prev?.firstAt ?? now,
    bestHeldMs: Math.max(prev?.bestHeldMs ?? 0, r.heldMs),
    bestCentsSD: r.success ? Math.min(prev?.bestCentsSD ?? 999, sd) : (prev?.bestCentsSD ?? 999),
  };
  return { entry, newlyAcquired: r.success && prev?.state !== 'acquired' };
}

/** 키보드 표시 범위: 기본 C3–C6, 음역 결과에 맞춰 확장 */
export function keyboardRange(lowest?: number, highest?: number): [number, number] {
  let lo = 48;
  let hi = 84;
  if (lowest != null) lo = Math.min(lo, Math.floor((lowest - 2) / 12) * 12);
  if (highest != null) hi = Math.max(hi, Math.ceil((highest + 2) / 12) * 12);
  return [Math.max(24, lo), Math.min(108, hi)];
}
