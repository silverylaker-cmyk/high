import type { TrackedFrame } from '../../audio/types';

export interface HudState {
  score?: number;
  combo?: number;
  hearts?: number;
  progress?: number; // 0–1
  status: string;
  /** 화면 읽기용 한 줄 요약 */
  summary: string;
}

export interface RoundResult {
  game: 'bubble' | 'cooldown' | 'siren' | 'climber';
  score: number;
  /** 성공률(난이도 제안용, 측정 불가 제외) */
  successRate: number | null;
  xp: number;
  heldNotes: number[];
  trackBreaks: number;
  validRatio: number;
  restCard?: 'hearts' | 'energy' | null;
  voicedSec?: number;
  maxCombo?: number;
  measurable: boolean;
  targetLowered?: boolean;
}

export interface GameRuntime {
  onFrame(f: TrackedFrame): void;
  /** audioNow = 오디오 시계(초) */
  tick(audioNow: number): void;
  draw(g: CanvasRenderingContext2D, w: number, h: number, audioNow: number): void;
  hud(): HudState;
  pause(): void;
  resume(audioNow: number): void;
  /** 강제 종료(에너지·시간·중단). 진행분까지 결과로 정리 */
  abort(): RoundResult;
  dispose(): void;
  readonly finished: RoundResult | null;
}
