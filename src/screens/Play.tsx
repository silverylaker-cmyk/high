import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ko } from '../copy/ko';
import { engine, useAudioStatus } from '../audio/engine';
import { JUDGE, suggestDifficulty, type Difficulty } from '../analysis/difficulty';
import { sessionTarget } from '../analysis/ceiling';
import {
  addAttempt,
  addWarmup,
  addXp,
  advanceQuest,
  availability,
  bumpCounter,
  energyLeft,
  markSeen,
  recordNoteResult,
  recordStop,
  saveSettings,
  sessionMinutes,
  spendEnergy,
  toast,
  useApp,
} from '../app/store';
import { SAFETY } from '../safety/config';
import { sessionTimeState } from '../safety/rules';
import { isHighZone } from '../meta/energy';
import { sirenXp, XP } from '../meta/xp';
import { dayKey } from '../meta/dates';
import { BubbleRuntime } from '../games/bubble/BubbleRuntime';
import { SirenRuntime } from '../games/siren/SirenRuntime';
import { ClimberRuntime } from '../games/climber/ClimberRuntime';
import { fitCanvas } from '../games/engine/canvas';
import { useRaf } from '../games/engine/loop';
import type { GameRuntime, HudState, RoundResult } from '../games/engine/types';
import { MicGate } from '../design/components/MicGate';
import { InterruptOverlay } from '../design/components/InterruptOverlay';
import { RestCard } from '../design/components/SafetyCards';
import { Modal } from '../design/components/Modal';
import { NoteText } from '../design/components/NoteText';
import { EnergyBattery } from '../design/components/EnergyBattery';
import { calibrateNoise } from './useCalibration';

type GameId = 'bubble' | 'cooldown' | 'siren' | 'climber';
const GAMES: GameId[] = ['bubble', 'cooldown', 'siren', 'climber'];

// 세션 단위 기억: 등반 목표음 연속 실패 수, 게임별 라운드 성공률(난이도 제안)
const sessionMem: Record<number, { targetFails: number; rates: Record<string, number[]> }> = {};
const mem = (sid: number) => (sessionMem[sid] ??= { targetFails: 0, rates: {} });

export function PlayScreen() {
  const { game } = useParams();
  const nav = useNavigate();
  const s = useApp();
  if (!GAMES.includes(game as GameId)) return <Navigate to="/games" replace />;
  const g = game as GameId;
  const a = availability(s)[g];
  if (!a.ok) {
    return (
      <div className="play" style={{ padding: 24 }}>
        <div className="stack" style={{ maxWidth: 480, margin: '40px auto' }}>
          <h1 className="t-title">{ko.games[g].name}</h1>
          <p>🔒 {ko.games.lock[a.reason!]}</p>
          {a.reason === 'noPrecheck' ? (
            <button className="btn primary lg" onClick={() => nav('/precheck')}>
              {ko.precheck.start}
            </button>
          ) : (
            <button className="btn primary lg" onClick={() => nav('/games')}>
              {ko.common.back}
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="play">
      <MicGate>
        <Game key={g} game={g} />
      </MicGate>
    </div>
  );
}

function effectiveDifficulty(game: GameId, level: number, setting: Difficulty): Difficulty {
  // 사이렌: 단계 1(L1–4)은 Easy만 열림
  if (game === 'siren' && level < 5) return 'easy';
  return setting;
}

function Game({ game }: { game: GameId }) {
  const nav = useNavigate();
  const profile = useApp((s) => s.profile);
  const progress = useApp((s) => s.progress);
  const session = useApp((s) => s.session)!;
  const audio = useAudioStatus();
  const canvas = useRef<HTMLCanvasElement>(null);
  const rt = useRef<GameRuntime | null>(null);
  const [round, setRound] = useState(1);
  const [hud, setHud] = useState<HudState>({ status: '', summary: '' });
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [stopped, setStopped] = useState<null | 'discomfort' | 'stop' | 'energy' | 'hardStop'>(null);
  const [replay, setReplay] = useState<{ samples: Float32Array; sampleRate: number } | null>(null);
  const [signalLost, setSignalLost] = useState(false);
  const [recal, setRecal] = useState(false);
  const replayRef = useRef<typeof replay>(null);
  const softWarned = useRef(false);
  const lastSummary = useRef(0);
  const [srSummary, setSrSummary] = useState('');
  const diff = effectiveDifficulty(game, progress.level, profile.settings.difficulty);
  const j = JUDGE[diff];
  const c = progress.ceiling;
  const isHigh = game === 'siren' || game === 'climber';

  // 직전 시도 녹음은 화면을 떠나면 버린다(P0-7)
  useEffect(() => () => void (replayRef.current = null), []);

  const keepReplay = useCallback(
    async (enabled: boolean) => {
      if (!enabled) return;
      const r = await engine.stopRecording();
      replayRef.current = r && r.samples.length ? r : null;
      setReplay(replayRef.current);
    },
    [],
  );

  const create = useCallback((): GameRuntime => {
    engine.setVoicing(game === 'bubble' || game === 'cooldown' ? 'sovt' : 'normal');
    if (game === 'bubble' || game === 'cooldown') {
      if (game === 'cooldown') return new BubbleRuntime('cooldown', 60);
      // 오늘 채운 워밍업은 이어서 채운다
      const p = useApp.getState().progress;
      const done = p.warmupDate === dayKey(Date.now()) ? p.warmupSec : 0;
      const remaining = SAFETY.WARMUP_REQUIRED_SEC - done;
      return new BubbleRuntime('bubble', remaining > 0 ? remaining : SAFETY.WARMUP_REQUIRED_SEC);
    }
    if (!c) throw new Error('no ceiling');
    const m = mem(session.id);
    if (game === 'siren') {
      const top = c.practiceTarget;
      const low = Math.max(c.lowest + 2, top - 9);
      return new SirenRuntime(low, top, j.tubeCents, c.comfortableCeiling - SAFETY.HIGH_ZONE_OFFSET, {
        onGlide: (gl) => {
          void spendEnergy(gl.highZoneSec);
          if (gl.measurable) {
            void addXp(sirenXp(gl.score));
            void bumpCounter('sirenGlides');
            void advanceQuest('sirenGlides', 1);
          }
          void bumpCounter('maxCombo', gl.maxCombo);
          void addAttempt({
            game: 'siren',
            success: gl.measurable && gl.score >= 50,
            outcome: gl.measurable ? (gl.score >= 50 ? 'success' : 'fail') : 'unmeasurable',
            score: gl.score,
            trackBreaks: gl.breaks.length,
            breakMidis: gl.breaks,
            validRatio: gl.validRatio,
          });
        },
      });
    }
    const target = sessionTarget(c, m.targetFails);
    const replayOn = useApp.getState().profile.settings.replay;
    return new ClimberRuntime(target, c.lowest, j.tolCents, j.holdMs, {
      playRef: (midi) => engine.playReference(midi, 0.8, profile.settings.a4),
      startRecord: () => {
        replayRef.current = null;
        setReplay(null);
        if (replayOn) engine.startRecording();
      },
      onAttempt: ({ midi, result, windowSec, isTarget }) => {
        void keepReplay(replayOn);
        // 고음역 발성 창은 유효 F0와 관계없이 총시간으로 센다(P0-5)
        if (isHighZone(midi, c.comfortableCeiling)) void spendEnergy(windowSec);
        if (result.status !== 'unmeasurable') void recordNoteResult(midi, result);
        if (result.status === 'success') {
          void addXp(XP.CLIMBER_PLATFORM);
          if (isTarget) void advanceQuest('climberTarget', 1);
        }
        void addAttempt({
          game: 'climber',
          targetMidi: midi,
          success: result.status === 'success',
          outcome: result.status === 'success' ? 'success' : result.status === 'unmeasurable' ? 'unmeasurable' : 'fail',
          score: result.status === 'success' ? 1 : 0,
          centsMean: result.centsMean ?? undefined,
          centsSD: result.centsSD ?? undefined,
          heldMs: result.heldMs,
          maxRelDb: result.maxRelDb ?? undefined,
          validRatio: result.measurableRatio,
        });
      },
    }, m.targetFails >= 2);
  }, [game, c, j, session.id, profile.settings.a4, keepReplay]);

  const startRound = useCallback(() => {
    rt.current?.dispose();
    rt.current = create();
    setResult(null);
    setSignalLost(false);
    if (game === 'climber' && mem(session.id).targetFails >= 2) toast(ko.play.targetLowered);
  }, [create, game, session.id]);

  useEffect(() => {
    void markSeen(game);
    startRound();
    const off = engine.subscribe((f) => rt.current?.onFrame(f));
    return () => {
      off();
      rt.current?.dispose();
      rt.current = null;
      void engine.stopRecording();
    };
  }, [startRound, game]);

  const finishRound = useCallback(
    async (r: RoundResult) => {
      const sid = session.id;
      const m = mem(sid);
      if (r.game === 'bubble') {
        await addWarmup(r.voicedSec ?? 0);
        await addAttempt({ game: 'bubble', success: r.measurable, outcome: r.measurable ? 'success' : 'partial', score: r.score, validRatio: r.validRatio });
      } else if (r.game === 'cooldown') {
        if (r.measurable) {
          await bumpCounter('cooldowns');
          await addXp(XP.COOLDOWN);
          await advanceQuest('cooldown', 1);
        }
        await addAttempt({ game: 'cooldown', success: r.measurable, outcome: r.measurable ? 'success' : 'partial', score: r.score, validRatio: r.validRatio });
      } else if (r.game === 'climber') {
        const climber = rt.current as ClimberRuntime | null;
        if (climber?.signalLost) setSignalLost(true);
        if (climber && !climber.signalLost) {
          // 목표음 2라운드 연속 실패 → 다음 라운드 목표 −1, 성공하면 원래 목표로 복귀
          m.targetFails = climber.reachedTarget ? 0 : m.targetFails + 1;
        }
      }
      if (r.successRate != null) (m.rates[r.game] ??= []).push(r.successRate);
      setResult(r);
    },
    [session.id],
  );

  // 안전 제한 감시: 시간·에너지
  const checkLimits = useCallback(() => {
    const st = sessionTimeState(sessionMinutes());
    if (st === 'soft' && !softWarned.current) {
      softWarned.current = true;
      toast(ko.safety.softStop);
    }
    if (!isHigh || !rt.current || rt.current.finished) return;
    if (st === 'hard') {
      const r = rt.current.abort();
      void finishRound(r);
      setStopped('hardStop');
    } else if (energyLeft() <= 0) {
      const r = rt.current.abort();
      void finishRound({ ...r, restCard: 'energy' });
      setStopped('energy');
    }
  }, [isHigh, finishRound]);

  const interrupted = audio.state !== 'running';
  useEffect(() => {
    if (interrupted) {
      rt.current?.pause();
      void engine.stopRecording();
    }
  }, [interrupted]);

  useRaf((ts) => {
    const r = rt.current;
    const cv = canvas.current;
    if (!r || !cv) return;
    const now = engine.now();
    if (!paused && !interrupted && !result && !stopped && !recal) {
      r.tick(now);
      if (r.finished) {
        void finishRound(r.finished);
        return;
      }
    }
    const { g, w, h } = fitCanvas(cv);
    r.draw(g, w, h, now);
    if (engine.lastFrame) engine.noteRendered(engine.lastFrame.t);
    if (ts - lastSummary.current > 250) {
      setHud(r.hud());
      checkLimits();
    }
    if (ts - lastSummary.current > 1000) {
      lastSummary.current = ts;
      setSrSummary(r.hud().summary);
    }
  });

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (p) rt.current?.resume(engine.now());
      else rt.current?.pause();
      return !p;
    });
  }, []);

  const stop = useCallback(
    async (reason: 'discomfort' | 'stop') => {
      const wasRunning = rt.current && !rt.current.finished;
      const r = rt.current?.abort();
      if (wasRunning && r && r.game === 'bubble') await addWarmup(r.voicedSec ?? 0);
      await recordStop(reason, game);
      setStopped(reason);
    },
    [game],
  );

  // 키보드: Space 일시정지, Esc 종료(입력 중에는 비활성)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space' && !result && !stopped) {
        e.preventDefault();
        togglePause();
      } else if (e.key === 'Escape' && !stopped) {
        void stop('stop');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, stop, result, stopped]);

  const playReplay = async () => {
    const r = replayRef.current;
    if (!r) return;
    replayRef.current = null;
    setReplay(null);
    await engine.playBuffer(r.samples, r.sampleRate);
  };

  const suggestion = useMemo(() => {
    if (!result || game === 'bubble' || game === 'cooldown') return null;
    return suggestDifficulty(profile.settings.difficulty, mem(session.id).rates[game] ?? []);
  }, [result, game, profile.settings.difficulty, session.id]);

  const leave = (to: string) => {
    replayRef.current = null;
    nav(to, { replace: true });
  };

  const onResumed = async (needsRecal: boolean) => {
    if (needsRecal) {
      setRecal(true);
      toast(ko.mic.recalibrating);
      await calibrateNoise();
      setRecal(false);
    }
    setPaused(true);
  };

  return (
    <>
      <header className="hud">
        <span style={{ fontWeight: 700 }}>{ko.games[game].name}</span>
        <span className="spacer" />
        {hud.score != null && (
          <span className="stat">
            <small>{ko.play.score}</small>
            <span className="t-hud">{hud.score}</span>
          </span>
        )}
        {hud.combo != null && (
          <span className="stat">
            <small>{ko.play.combo}</small>
            <span className="t-hud">{hud.combo}</span>
          </span>
        )}
        {hud.hearts != null && (
          <span className="stat" aria-label={`${ko.play.hearts} ${hud.hearts}`}>
            <small>{ko.play.hearts}</small>
            <span className="t-hud" aria-hidden="true">
              {'♥'.repeat(hud.hearts)}
              <span style={{ opacity: 0.25 }}>{'♥'.repeat(Math.max(0, 3 - hud.hearts))}</span>
            </span>
          </span>
        )}
        {isHigh && (
          <span className="stat">
            <small>{ko.play.energy}</small>
            <EnergyBattery energy={progress} compact />
          </span>
        )}
        <button className="btn secondary" onClick={togglePause} aria-pressed={paused}>
          {paused ? ko.play.resume : ko.common.pause}
        </button>
      </header>
      <div className="play-canvas">
        <canvas ref={canvas} aria-hidden="true" />
        {paused && !stopped && (
          <div className="overlay" style={{ position: 'absolute' }}>
            <div className="modal">
              <h2 className="t-title">{ko.play.paused}</h2>
              <button className="btn primary lg" onClick={togglePause}>
                {ko.play.resume}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="sr-only" aria-live="polite">
        {srSummary}
      </div>
      <footer className="play-footer">
        <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
          <span className="status-line">{hud.status}</span>
          <span className="t-small muted">{hud.summary}</span>
          {game === 'climber' && c && (
            <span className="t-small muted">
              {ko.home.nextTarget}: <NoteText midi={sessionTarget(c, mem(session.id).targetFails)} />
            </span>
          )}
        </div>
        <div className="btn-row" style={{ flex: 'none' }}>
          <button className="btn danger" onClick={() => stop('discomfort')}>
            {ko.safety.discomfortButton}
          </button>
          <button className="btn secondary" onClick={() => stop('stop')}>
            {ko.safety.stopButton}
          </button>
        </div>
      </footer>

      <InterruptOverlay onResumed={onResumed} />

      {result && !stopped && (
        <RoundResultModal
          r={result}
          round={round}
          replay={!!replay}
          onReplay={playReplay}
          signalLost={signalLost}
          suggestion={suggestion}
          onApplySuggestion={(d) => void saveSettings({ difficulty: d })}
          onNext={() => {
            setRound((n) => n + 1);
            startRound();
          }}
          onRest={async () => {
            await bumpCounter('restChoices');
            leave('/selfcheck');
          }}
          onDiscomfort={() => stop('discomfort')}
          onGames={() => leave('/games')}
          canContinue={availability(useApp.getState())[game].ok && result.restCard == null && game !== 'bubble' && game !== 'cooldown'}
        />
      )}
      {stopped === 'discomfort' && <RestCard title={ko.safety.discomfortTitle} body={ko.safety.discomfortBody} onClose={() => leave('/selfcheck')} closeLabel={ko.selfcheck.title} />}
      {stopped === 'stop' && <RestCard title={ko.safety.stoppedTitle} body={ko.safety.stoppedBody} onClose={() => leave('/games')} closeLabel={ko.common.close} />}
      {stopped === 'energy' && <RestCard title={ko.safety.restCardTitle} body={ko.safety.energyEmpty} onClose={() => leave('/games')} closeLabel={ko.common.close} />}
      {stopped === 'hardStop' && <RestCard title={ko.safety.restCardTitle} body={ko.safety.hardStop} onClose={() => leave('/games')} closeLabel={ko.common.close} />}
    </>
  );
}

function RoundResultModal(p: {
  r: RoundResult;
  round: number;
  replay: boolean;
  onReplay: () => void;
  signalLost: boolean;
  suggestion: Difficulty | null;
  onApplySuggestion: (d: Difficulty) => void;
  onNext: () => void;
  onRest: () => void;
  onDiscomfort: () => void;
  onGames: () => void;
  canContinue: boolean;
}) {
  const { r } = p;
  const [applied, setApplied] = useState(false);
  const cur = useApp((s) => s.profile.settings.difficulty);
  if (r.restCard === 'hearts') {
    return <RestCard title={ko.safety.restCardTitle} body={ko.safety.restCardBody} onClose={p.onGames} closeLabel={ko.common.close} />;
  }
  const isWarm = r.game === 'bubble' || r.game === 'cooldown';
  return (
    <Modal warm label={ko.result.title}>
      <h2 className="t-title">{ko.result.title}</h2>
      {isWarm ? (
        <>
          <p className="t-display">{ko.play.voicedSec(Math.floor(r.voicedSec ?? 0), r.game === 'bubble' ? SAFETY.WARMUP_REQUIRED_SEC : 60)}</p>
          <p>{r.game === 'bubble' ? (r.measurable ? ko.result.warmupDone : ko.result.warmupPartial) : ''}</p>
          <p className="t-small muted">{ko.play.validRatio(Math.round(r.validRatio * 100))}</p>
        </>
      ) : (
        <>
          <p className="t-display">
            {ko.result.score} {r.score}
          </p>
          {r.game === 'climber' && <p>{ko.result.notesHeld(r.heldNotes.length)}</p>}
          {r.game === 'siren' && (
            <>
              <p className="t-small muted">{ko.play.trackBreaks(r.trackBreaks)}</p>
              <p className="t-small muted">{ko.play.validRatio(Math.round(r.validRatio * 100))}</p>
            </>
          )}
        </>
      )}
      {p.signalLost && <p role="alert">{ko.play.noFrames}</p>}
      <p className="t-small">{ko.safety.comfortFirst}</p>
      {p.replay && (
        <div className="stack-sm">
          <button className="btn secondary" onClick={p.onReplay}>
            ▶ {ko.play.replay}
          </button>
          <span className="t-small muted">{ko.play.replayNote}</span>
        </div>
      )}
      {p.suggestion && !applied && (
        <div className="card stack-sm">
          <p>{['easy', 'normal', 'hard'].indexOf(p.suggestion) > ['easy', 'normal', 'hard'].indexOf(cur) ? ko.result.suggestUp : ko.result.suggestDown}</p>
          <div className="btn-row">
            <button
              className="btn secondary"
              onClick={() => {
                p.onApplySuggestion(p.suggestion!);
                setApplied(true);
              }}
            >
              {ko.result.applySuggest}
            </button>
            <button className="btn secondary" onClick={() => setApplied(true)}>
              {ko.result.keep}
            </button>
          </div>
        </div>
      )}
      {p.canContinue ? (
        <>
          <h3 className="section-title">{ko.safety.betweenRoundsTitle}</h3>
          <div className="btn-row">
            <button className="btn primary" onClick={p.onNext}>
              {ko.safety.betweenRoundsOk}
            </button>
            <button className="btn secondary" onClick={p.onRest}>
              {ko.safety.betweenRoundsRest}
            </button>
            <button className="btn danger" onClick={p.onDiscomfort}>
              {ko.safety.discomfortButton}
            </button>
          </div>
        </>
      ) : (
        <button className="btn primary" onClick={p.onGames}>
          {ko.common.done}
        </button>
      )}
    </Modal>
  );
}
