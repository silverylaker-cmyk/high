import type { TrackedFrame } from '../../audio/types';
import { BreakDetector } from '../../analysis/breaks';
import { ko } from '../../copy/ko';
import { intlName } from '../../audio/noteMath';
import { COLORS } from '../engine/canvas';
import type { GameRuntime, HudState, RoundResult } from '../engine/types';
import { GLIDE_SEC, GLIDES_PER_ROUND, GlideScorer, highZoneSeconds, pathMidi } from './sirenLogic';

const READY_SEC = 2;

export interface SirenHooks {
  /** 한 글라이드가 끝날 때(점수·연습량 반영) */
  onGlide(g: { score: number; measurable: boolean; highZoneSec: number; maxCombo: number; breaks: number[]; validRatio: number }): void;
}

export class SirenRuntime implements GameRuntime {
  private phase: 'ready' | 'glide' = 'ready';
  private phaseStart: number | null = null;
  private glideIdx = 0;
  private scorer: GlideScorer | null = null;
  private breaks = new BreakDetector();
  private trace: { t: number; m: number | null; br?: boolean }[] = [];
  private scores: number[] = [];
  private allBreaks: number[] = [];
  private validRatios: number[] = [];
  private maxCombo = 0;
  private paused = false;
  private hzSec: number;
  finished: RoundResult | null = null;

  constructor(
    private low: number,
    private top: number,
    private tubeCents: number,
    zoneFrom: number,
    private hooks: SirenHooks,
  ) {
    this.hzSec = highZoneSeconds(low, top, zoneFrom);
  }

  onFrame(f: TrackedFrame) {
    if (this.paused || this.finished || this.phase !== 'glide' || !this.scorer || this.phaseStart == null) return;
    if (f.t < this.phaseStart) return;
    this.scorer.push(f);
    const br = this.breaks.push(f);
    this.trace.push({ t: f.t - this.phaseStart, m: f.status === 'voiced' ? f.displayMidi : null, br: !!br });
  }

  tick(now: number) {
    if (this.paused || this.finished) return;
    if (this.phaseStart == null) this.phaseStart = now;
    const el = now - this.phaseStart;
    if (this.phase === 'ready' && el >= READY_SEC) {
      this.phase = 'glide';
      this.phaseStart = now;
      this.scorer = new GlideScorer(this.low, this.top, now, this.tubeCents);
      this.breaks.reset();
      this.trace = [];
    } else if (this.phase === 'glide' && el >= GLIDE_SEC) {
      this.endGlide();
      this.glideIdx++;
      if (this.glideIdx >= GLIDES_PER_ROUND) this.finish();
      else {
        this.phase = 'ready';
        this.phaseStart = now;
      }
    }
  }

  private endGlide() {
    const s = this.scorer!;
    const measurable = s.measurable();
    const brMidis = this.breaks.events.map((e) => e.midi);
    this.allBreaks.push(...brMidis);
    this.validRatios.push(s.validRatio());
    if (measurable) this.scores.push(s.score());
    this.maxCombo = Math.max(this.maxCombo, s.maxCombo);
    this.hooks.onGlide({ score: s.score(), measurable, highZoneSec: this.hzSec, maxCombo: s.maxCombo, breaks: brMidis, validRatio: s.validRatio() });
    this.scorer = null;
  }

  private finish() {
    const avg = this.scores.length ? Math.round(this.scores.reduce((a, b) => a + b, 0) / this.scores.length) : 0;
    this.finished = {
      game: 'siren',
      score: avg,
      successRate: this.scores.length ? avg / 100 : null,
      xp: 0,
      heldNotes: [],
      trackBreaks: this.allBreaks.length,
      validRatio: this.validRatios.length ? this.validRatios.reduce((a, b) => a + b, 0) / this.validRatios.length : 0,
      maxCombo: this.maxCombo,
      measurable: this.scores.length > 0,
    };
  }

  draw(g: CanvasRenderingContext2D, w: number, h: number, now: number) {
    g.fillStyle = COLORS.white;
    g.fillRect(0, 0, w, h);
    const lo = this.low - 2;
    const hi = this.top + 2;
    const y = (m: number) => 16 + (1 - (m - lo) / (hi - lo)) * (h - 32);
    // 반음 격자
    g.font = '11px Lato, sans-serif';
    for (let m = Math.ceil(lo); m <= hi; m++) {
      g.strokeStyle = m === this.top ? COLORS.blue : COLORS.border;
      g.lineWidth = m === this.top ? 2 : 1;
      g.beginPath();
      g.moveTo(40, y(m));
      g.lineTo(w, y(m));
      g.stroke();
      if (m % 12 === 0 || m === this.top || m === this.low) {
        g.fillStyle = COLORS.black;
        g.fillText(intlName(m), 4, y(m) + 4);
      }
    }
    const playX = w * 0.3;
    const pxPerSec = (w - playX) / 3.5;
    const el = this.phaseStart == null ? 0 : now - this.phaseStart;
    const glideT = this.phase === 'glide' ? el : -(READY_SEC - el);
    // 튜브(단색 면)
    const tube = this.tubeCents / 100;
    g.fillStyle = 'rgba(120,215,221,.45)';
    g.beginPath();
    const pts: [number, number][] = [];
    for (let x = 40; x <= w; x += 4) {
      const t = glideT + (x - playX) / pxPerSec;
      if (t < 0 || t > GLIDE_SEC) continue;
      pts.push([x, pathMidi(this.low, this.top, t)]);
    }
    if (pts.length) {
      pts.forEach(([x, m], i) => (i ? g.lineTo(x, y(m + tube)) : g.moveTo(x, y(m + tube))));
      [...pts].reverse().forEach(([x, m]) => g.lineTo(x, y(m - tube)));
      g.closePath();
      g.fill();
      g.strokeStyle = COLORS.teal;
      g.lineWidth = 2;
      g.beginPath();
      pts.forEach(([x, m], i) => (i ? g.lineTo(x, y(m)) : g.moveTo(x, y(m))));
      g.stroke();
    }
    // 내 소리 궤적
    g.strokeStyle = COLORS.aubergine;
    g.lineWidth = 3;
    g.beginPath();
    let pen = false;
    for (const p of this.trace) {
      const x = playX - (glideT - p.t) * pxPerSec;
      if (x < 40 || p.m == null) {
        pen = false;
        continue;
      }
      if (!pen) g.moveTo(x, y(p.m));
      else g.lineTo(x, y(p.m));
      pen = true;
    }
    g.stroke();
    for (const p of this.trace) {
      if (!p.br) continue;
      const x = playX - (glideT - p.t) * pxPerSec;
      g.fillStyle = COLORS.yellow;
      g.fillRect(x - 3, 16, 6, 6);
    }
    // 플레이헤드
    g.strokeStyle = COLORS.black;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(playX, 0);
    g.lineTo(playX, h);
    g.stroke();
    if (this.phase === 'ready' && !this.finished) {
      g.fillStyle = COLORS.black;
      g.font = '900 28px Lato, sans-serif';
      g.textAlign = 'center';
      g.fillText(String(Math.max(1, Math.ceil(READY_SEC - el))), w / 2, h / 2);
      g.textAlign = 'start';
    }
  }

  hud(): HudState {
    const s = this.scorer;
    return {
      score: s ? s.score() : this.scores.length ? this.scores[this.scores.length - 1] : 0,
      combo: s?.combo ?? 0,
      progress: (this.glideIdx + (this.phase === 'glide' ? 0.5 : 0)) / GLIDES_PER_ROUND,
      status: this.phase === 'ready' ? `${ko.play.ready} · ${ko.play.glide(this.glideIdx + 1, GLIDES_PER_ROUND)}` : ko.play.glide(this.glideIdx + 1, GLIDES_PER_ROUND),
      summary: `${ko.play.glide(Math.min(this.glideIdx + 1, GLIDES_PER_ROUND), GLIDES_PER_ROUND)} · ${ko.play.score} ${s ? s.score() : 0}`,
    };
  }

  pause() {
    this.paused = true;
  }
  resume(now: number) {
    if (!this.paused) return;
    this.paused = false;
    // 진행 중이던 글라이드는 버리고 준비부터 다시
    this.phase = 'ready';
    this.phaseStart = now;
    this.scorer = null;
  }
  abort(): RoundResult {
    // 진행 중이던 글라이드도 연습량에 넣는다(보수적으로 전체 고음역 시간)
    if (!this.finished && this.phase === 'glide' && this.scorer) this.endGlide();
    if (!this.finished) this.finish();
    return this.finished!;
  }
  dispose() {}
}
