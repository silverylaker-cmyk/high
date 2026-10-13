import type { TrackedFrame } from '../../audio/types';
import { ko } from '../../copy/ko';
import { COLORS } from '../engine/canvas';
import type { GameRuntime, HudState, RoundResult } from '../engine/types';
import { BubbleTracker, bubbleSize, type BubbleSize } from './bubbleLogic';

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  color: string;
}

const R: Record<BubbleSize, number> = { big: 26, mid: 16, small: 8 };
const LABEL: Record<BubbleSize, string> = { big: '큰 거품', mid: '중간 거품', small: '작은 거품' };
const PALETTE = [COLORS.aqua, COLORS.cyan, COLORS.teal, COLORS.butter];

export class BubbleRuntime implements GameRuntime {
  private tracker = new BubbleTracker();
  private bubbles: Bubble[] = [];
  private lastSpawn = 0;
  private lastSize: BubbleSize | null = null;
  private paused = false;
  private lastDrawT: number | null = null;
  finished: RoundResult | null = null;

  constructor(
    private mode: 'bubble' | 'cooldown',
    /** 이번 라운드에서 채워야 할 유성음 초 */
    private targetSec: number,
  ) {}

  onFrame(f: TrackedFrame) {
    if (this.paused || this.finished) return;
    const r = this.tracker.push(f);
    if (r.voiced && f.t - this.lastSpawn > 0.28) {
      this.lastSpawn = f.t;
      const size = r.sd == null ? 'small' : bubbleSize(r.sd);
      this.lastSize = size;
      this.bubbles.push({
        x: 0.5 + (Math.random() - 0.5) * 0.5,
        y: 0,
        r: R[size],
        vy: 0.28 + Math.random() * 0.1,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      });
    }
    if (!r.voiced) this.lastSize = null;
    if (this.tracker.voicedSec >= this.targetSec) this.finish();
  }

  tick() {}

  private finish() {
    if (this.finished) return;
    const done = this.tracker.voicedSec >= this.targetSec;
    this.finished = {
      game: this.mode,
      score: Math.round(this.tracker.validRatio() * 100),
      successRate: null,
      xp: 0,
      heldNotes: [],
      trackBreaks: 0,
      validRatio: this.tracker.validRatio(),
      voicedSec: this.tracker.voicedSec,
      measurable: done,
    };
  }

  draw(g: CanvasRenderingContext2D, w: number, h: number, now: number) {
    const dt = this.lastDrawT == null ? 0 : Math.min(0.05, Math.max(0, now - this.lastDrawT));
    this.lastDrawT = now;
    g.fillStyle = COLORS.white;
    g.fillRect(0, 0, w, h);
    // 물 높이
    g.fillStyle = '#E4F6F7';
    g.fillRect(0, h * 0.35, w, h * 0.65);
    // 빨대
    g.fillStyle = COLORS.aubergine;
    g.fillRect(w / 2 - 6, h - 90, 12, 90);
    g.fillStyle = COLORS.pink;
    g.fillRect(w / 2 - 6, h - 90, 12, 10);
    for (const b of this.bubbles) {
      if (!this.paused) b.y += b.vy * dt * h * 0.9;
      const x = b.x * w + Math.sin(b.y * 0.04) * 6;
      const y = h - 95 - b.y;
      g.beginPath();
      g.arc(x, y, b.r, 0, Math.PI * 2);
      g.fillStyle = b.color;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = COLORS.white;
      g.stroke();
    }
    this.bubbles = this.bubbles.filter((b) => h - 95 - b.y > -40);
    // 진행 바
    const p = Math.min(1, this.tracker.voicedSec / this.targetSec);
    g.fillStyle = COLORS.border;
    g.fillRect(16, 16, w - 32, 8);
    g.fillStyle = COLORS.green;
    g.fillRect(16, 16, (w - 32) * p, 8);
  }

  hud(): HudState {
    const s = Math.floor(this.tracker.voicedSec);
    const t = this.targetSec;
    const status = this.lastSize ? `${LABEL[this.lastSize]}` : this.mode === 'cooldown' ? ko.play.cooldownHint : ko.play.bubbleHint;
    return {
      progress: Math.min(1, this.tracker.voicedSec / t),
      score: Math.round(this.tracker.validRatio() * 100),
      status,
      summary: `${ko.play.voicedSec(s, Math.round(t))} · ${ko.play.validRatio(Math.round(this.tracker.validRatio() * 100))}`,
    };
  }

  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  abort(): RoundResult {
    this.finish();
    return this.finished!;
  }
  dispose() {}
}
