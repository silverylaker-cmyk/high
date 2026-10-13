import type { TrackedFrame } from '../../audio/types';
import { HoldJudge, type HoldResult } from '../../analysis/hold';
import { SAFETY_POLICY } from '../../safety/config';
import { ko } from '../../copy/ko';
import { intlName } from '../../audio/noteMath';
import { COLORS, roundRect } from '../engine/canvas';
import type { GameRuntime, HudState, RoundResult } from '../engine/types';
import { applyOutcome, currentTarget, initClimb, isTop, type ClimbState } from './climberLogic';
import { XP } from '../../meta/xp';

// 콜앤리스폰스: 기준음 0.8 s → 꼬리 120 ms + 무음 200 ms → 발성 창(최대 4 s). 기준음 중에는 판정하지 않는다(P0-8)
const REF_SEC = 0.8;
const GAP_SEC = 0.2;
const RESULT_SEC = 1.6;

export interface ClimberHooks {
  playRef(midi: number): { start: number; end: number } | null;
  startRecord(): void;
  /** 한 번의 발성 창이 끝났을 때. windowSec = 발성 창 총시간 */
  onAttempt(a: { midi: number; result: HoldResult; windowSec: number; isTarget: boolean }): void;
}

export class ClimberRuntime implements GameRuntime {
  private s: ClimbState;
  private phase: 'intro' | 'listen' | 'gap' | 'sing' | 'result' = 'intro';
  private phaseStart: number | null = null;
  private gapUntil = 0;
  private judge: HoldJudge | null = null;
  private last: HoldResult | null = null;
  private feedback = '';
  private paused = false;
  private targetResults: boolean[] = [];
  private img: HTMLImageElement | null = null;
  private jumpAt = -10;
  finished: RoundResult | null = null;

  constructor(
    private target: number,
    lowest: number,
    private tolCents: number,
    private holdMs: number,
    private hooks: ClimberHooks,
    private targetLowered = false,
  ) {
    this.s = initClimb(target, lowest);
    if (typeof Image !== 'undefined') {
      this.img = new Image();
      this.img.src = './images/mascot-256.png';
    }
  }

  get state() {
    return this.s;
  }

  onFrame(f: TrackedFrame) {
    if (this.paused || this.finished || this.phase !== 'sing' || !this.judge || this.phaseStart == null) return;
    if (f.t < this.phaseStart) return;
    const r = this.judge.push(f);
    this.last = r;
    if (this.judge.finished) this.endAttempt(r);
  }

  tick(now: number) {
    if (this.paused || this.finished) return;
    if (this.phaseStart == null) this.phaseStart = now;
    const el = now - this.phaseStart;
    switch (this.phase) {
      case 'intro':
        if (el > 1.2) this.go('listen', now);
        break;
      case 'listen': {
        const r = this.hooks.playRef(currentTarget(this.s));
        const end = r ? r.end : now + REF_SEC;
        this.gapUntil = end + SAFETY_POLICY.PLAYBACK_TAIL_MS / 1000 + GAP_SEC;
        this.phase = 'gap';
        break;
      }
      case 'gap':
        if (now >= this.gapUntil) {
          this.go('sing', now);
          this.judge = new HoldJudge({ targetMidi: currentTarget(this.s), tolCents: this.tolCents, holdMs: this.holdMs });
          this.last = null;
          this.hooks.startRecord();
        }
        break;
      case 'sing':
        // 프레임이 들어오지 않아도 창은 끝난다(입력 중단 = 측정 불가)
        if (el > 4.6 && this.judge && !this.judge.finished) this.endAttempt(this.judge.finish());
        break;
      case 'result':
        if (el > RESULT_SEC) {
          if (this.s.done) this.finish();
          else this.go('listen', now);
        }
        break;
    }
  }

  private go(p: ClimberRuntime['phase'], now: number) {
    this.phase = p;
    this.phaseStart = now;
  }

  private endAttempt(r: HoldResult) {
    const midi = currentTarget(this.s);
    const top = isTop(this.s);
    const outcome = r.status === 'success' ? 'success' : r.status === 'unmeasurable' ? 'unmeasurable' : 'fail';
    if (top && outcome !== 'unmeasurable') this.targetResults.push(outcome === 'success');
    this.hooks.onAttempt({ midi, result: r, windowSec: r.elapsedMs / 1000, isTarget: top });
    this.feedback =
      outcome === 'success' ? ko.play.feedback.success : outcome === 'unmeasurable' ? ko.play.feedback.invalid : ko.play.feedback[(r.reason ?? 'short') as 'low' | 'high' | 'short'];
    if (outcome === 'success') this.jumpAt = performance.now();
    this.s = applyOutcome(this.s, outcome);
    this.judge = null;
    this.phase = 'result';
    this.phaseStart = null;
  }

  private finish() {
    const measured = this.targetResults.length;
    this.finished = {
      game: 'climber',
      score: this.s.held.length * XP.CLIMBER_PLATFORM,
      successRate: this.s.held.length + (3 - this.s.hearts) > 0 ? this.s.held.length / (this.s.held.length + (3 - this.s.hearts)) : null,
      xp: 0,
      heldNotes: this.s.held,
      trackBreaks: 0,
      validRatio: 1,
      restCard: this.s.done === 'hearts' ? 'hearts' : null,
      measurable: this.s.done !== 'signal' || measured > 0,
      targetLowered: this.targetLowered,
    };
  }

  /** 이번 라운드에 목표음(최상단)을 유지했는지 */
  get reachedTarget() {
    return this.s.done === 'top';
  }

  get signalLost() {
    return this.s.done === 'signal';
  }

  draw(g: CanvasRenderingContext2D, w: number, h: number) {
    g.fillStyle = COLORS.white;
    g.fillRect(0, 0, w, h);
    const n = this.s.platforms.length;
    const stepW = Math.min(110, (w - 40) / n);
    const stepH = Math.min(70, (h - 140) / n);
    const x0 = (w - stepW * n) / 2;
    const base = h - 30;
    const colors = [COLORS.aqua, COLORS.teal, COLORS.cyan, COLORS.navy, COLORS.aubergine];
    this.s.platforms.forEach((m, i) => {
      const x = x0 + i * stepW;
      const y = base - (i + 1) * stepH;
      g.fillStyle = colors[Math.min(colors.length - 1, Math.round((i / Math.max(1, n - 1)) * (colors.length - 1)))];
      roundRect(g, x + 2, y, stepW - 4, 18, 6);
      g.fill();
      if (m === this.target) {
        g.strokeStyle = COLORS.blue;
        g.lineWidth = 3;
        roundRect(g, x, y - 2, stepW, 22, 7);
        g.stroke();
      }
      g.fillStyle = COLORS.black;
      g.font = '12px Lato, sans-serif';
      g.textAlign = 'center';
      g.fillText(intlName(m), x + stepW / 2, y + 36);
      if (this.s.held.includes(m)) g.fillText('✓', x + stepW / 2, y - 6);
    });
    // 마스코트 + 유지 링
    const i = this.s.idx;
    const cx = x0 + i * stepW + stepW / 2;
    const jump = Math.max(0, 1 - (performance.now() - this.jumpAt) / 400);
    const cy = base - (i + 1) * stepH - 34 - Math.sin(jump * Math.PI) * 24;
    if (this.img?.complete && this.img.naturalWidth) g.drawImage(this.img, cx - 28, cy - 28, 56, 56);
    else {
      g.fillStyle = COLORS.aubergine;
      g.beginPath();
      g.arc(cx, cy, 20, 0, Math.PI * 2);
      g.fill();
    }
    const p = this.phase === 'sing' && this.last ? Math.min(1, this.last.heldMs / this.holdMs) : 0;
    g.lineWidth = 6;
    g.strokeStyle = COLORS.border;
    g.beginPath();
    g.arc(cx, cy - 52, 16, 0, Math.PI * 2);
    g.stroke();
    if (p > 0) {
      g.strokeStyle = COLORS.green;
      g.beginPath();
      g.arc(cx, cy - 52, 16, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      g.stroke();
    }
    // 음정 표시: 낮음/높음 화살표(색 + 기호)
    if (this.phase === 'sing' && this.last?.lastCents != null) {
      const c = this.last.lastCents;
      const sym = Math.abs(c) <= this.tolCents ? '✓' : c < 0 ? '↑' : '↓';
      g.fillStyle = Math.abs(c) <= this.tolCents ? COLORS.green : Math.abs(c) <= this.tolCents * 2 ? COLORS.yellow : COLORS.red;
      g.font = '900 22px Lato, sans-serif';
      g.fillText(sym, cx + 40, cy - 44);
    }
    g.textAlign = 'start';
  }

  hud(): HudState {
    const st =
      this.phase === 'intro'
        ? ko.play.tip
        : this.phase === 'listen' || this.phase === 'gap'
          ? `🎧 ${ko.play.listen}`
          : this.phase === 'sing'
            ? `🎤 ${ko.play.sing}`
            : this.feedback;
    return {
      hearts: this.s.hearts,
      progress: this.s.held.length / this.s.platforms.length,
      score: this.s.held.length,
      status: st,
      summary: `${ko.play.hearts} ${this.s.hearts} · ${st}`,
    };
  }

  pause() {
    this.paused = true;
    this.abandonAttempt();
  }

  /** 발성 창 도중 중단: 판정 없이(측정 불가) 연습량만 반영 */
  private abandonAttempt() {
    if (this.phase !== 'sing' || !this.judge) return;
    const r = this.judge.finish();
    this.hooks.onAttempt({ midi: currentTarget(this.s), result: { ...r, status: 'unmeasurable', reason: 'invalid' }, windowSec: r.elapsedMs / 1000, isTarget: false });
    this.judge = null;
  }
  resume(now: number) {
    if (!this.paused) return;
    this.paused = false;
    // 중단된 시도는 판정하지 않고 기준음부터 다시
    this.go('listen', now);
  }
  abort(): RoundResult {
    if (!this.finished) this.abandonAttempt();
    if (!this.finished) this.finish();
    return this.finished!;
  }
  dispose() {}
}
