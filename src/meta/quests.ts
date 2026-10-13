import { ko } from '../copy/ko';

// §2.3 일일 퀘스트 3개. P1-10: 상향·'매끈' 유도 퀘스트는 넣지 않는다.
export type QuestKind = 'warmup' | 'sirenGlides' | 'climberTarget' | 'cooldown' | 'selfcheck';

export interface Quest {
  id: string;
  date: string;
  kind: QuestKind;
  target: number;
  progress: number;
  done: boolean;
}

const POOL: { kind: QuestKind; target: number }[] = [
  { kind: 'sirenGlides', target: 3 },
  { kind: 'climberTarget', target: 1 },
  { kind: 'cooldown', target: 1 },
  { kind: 'selfcheck', target: 1 },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** 날짜로 결정되는 퀘스트 3개: 워밍업은 항상 포함 */
export function generateDaily(date: string): Quest[] {
  const h = hash(date);
  const a = h % POOL.length;
  const b = (a + 1 + ((h >>> 8) % (POOL.length - 1))) % POOL.length;
  return [{ kind: 'warmup' as QuestKind, target: 90 }, POOL[a], POOL[b]].map((q) => ({
    id: `${date}:${q.kind}`,
    date,
    kind: q.kind,
    target: q.target,
    progress: 0,
    done: false,
  }));
}

export function questTitle(kind: QuestKind): string {
  return ko.quests[kind];
}

/** 진행 반영. 새로 완료된 퀘스트 목록을 함께 반환 */
export function advanceQuests(qs: Quest[], kind: QuestKind, amount: number): { quests: Quest[]; completed: Quest[] } {
  const completed: Quest[] = [];
  const quests = qs.map((q) => {
    if (q.kind !== kind || q.done) return q;
    const progress = Math.min(q.target, q.progress + amount);
    const done = progress >= q.target;
    const nq = { ...q, progress, done };
    if (done) completed.push(nq);
    return nq;
  });
  return { quests, completed };
}
