import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { engine } from '../audio/engine';
import type { TrackedFrame } from '../audio/types';
import { BreakDetector } from '../analysis/breaks';
import { HoldJudge } from '../analysis/hold';
import {
  breakCluster,
  comfortNext,
  comfortResult,
  comfortStart,
  computeHighest,
  computeLowest,
  RANGE_ALGO_VERSION,
  type ComfortState,
} from '../analysis/rangeTest';
import { SAFETY_POLICY } from '../safety/config';
import { isSymptomToday, recordStop, saveRangeTest, useApp } from '../app/store';
import { MicGate } from '../design/components/MicGate';
import { InterruptOverlay } from '../design/components/InterruptOverlay';
import { LivePitch } from '../design/components/LivePitch';
import { SafetyBar } from '../design/components/SafetyBar';
import { RestCard } from '../design/components/SafetyCards';
import { NoteText } from '../design/components/NoteText';
import { calibrateRef } from './useCalibration';

// S2 음역 측정(§4.9 + 검수: 중단 버튼·시간/시도/휴식 제한, passaggio 미사용, 최대 숨 길이 측정 제외)
type Phase = 'ref' | 'down' | 'up' | 'comfort' | 'done';
const MAX_TRY_SEC = 10;
const COMFORT_HOLD_MS = 1500;
const COMFORT_TOL = 50;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function RangeTestScreen() {
  const session = useApp((s) => s.session);
  const symptom = useApp((s) => isSymptomToday(s));
  if (symptom) return <Navigate to="/" replace />;
  if (!session) return <Navigate to="/precheck" replace />;
  return (
    <MicGate>
      <RangeTestInner />
    </MicGate>
  );
}

function RangeTestInner() {
  const nav = useNavigate();
  const calib = useApp((s) => s.profile.calib);
  const a4 = useApp((s) => s.profile.settings.a4);
  const prevTest = useApp((s) => s.ranges[s.ranges.length - 1]);
  const [phase, setPhase] = useState<Phase>(calib?.refDb != null ? 'down' : 'ref');
  const [tryNo, setTryNo] = useState(1);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [comfort, setComfort] = useState<ComfortState | null>(null);
  const [holdPct, setHoldPct] = useState(0);
  const [stopped, setStopped] = useState<null | 'discomfort' | 'stop'>(null);
  const startedAt = useRef(performance.now());
  const aborted = useRef(false);
  const downFrames = useRef<TrackedFrame[]>([]);
  const upFrames = useRef<TrackedFrame[]>([]);
  const upBreaks = useRef<number[][]>([]);
  const lowest = useRef<number | null>(null);
  const highest = useRef<number | null>(null);
  const tryBuf = useRef<TrackedFrame[]>([]);
  const stopTry = useRef<(() => void) | null>(null);
  const totalFrames = useRef(0);
  const voicedFrames = useRef(0);

  const overTime = () => (performance.now() - startedAt.current) / 1000 > SAFETY_POLICY.RANGE_TEST_MAX_SEC;

  useEffect(() => {
    engine.setVoicing('normal');
    return () => {
      aborted.current = true;
      stopTry.current?.();
    };
  }, []);

  const recordTry = () =>
    new Promise<TrackedFrame[]>((resolve) => {
      tryBuf.current = [];
      setRecording(true);
      const off = engine.subscribe((f) => {
        if (f.gated) return;
        tryBuf.current.push(f);
        totalFrames.current++;
        if (f.status === 'voiced') voicedFrames.current++;
      });
      const timer = setTimeout(() => finish(), MAX_TRY_SEC * 1000);
      const finish = () => {
        off();
        clearTimeout(timer);
        stopTry.current = null;
        setRecording(false);
        resolve(tryBuf.current);
      };
      stopTry.current = finish;
    });

  const doRef = async () => {
    setBusy(ko.onboarding.refRecording);
    const r = await calibrateRef();
    setBusy(null);
    setNote(r == null ? ko.onboarding.refRetry : ko.onboarding.refDone);
    if (r != null) setPhase('down');
  };

  const doSiren = async () => {
    const frames = await recordTry();
    if (aborted.current) return;
    if (phase === 'down') {
      downFrames.current.push(...frames);
      if (tryNo < 2) setTryNo(tryNo + 1);
      else {
        lowest.current = computeLowest(downFrames.current);
        setTryNo(1);
        setPhase('up');
      }
    } else {
      upFrames.current.push(...frames);
      const bd = new BreakDetector();
      frames.forEach((f) => bd.push(f));
      upBreaks.current.push(bd.events.map((e) => e.midi));
      if (tryNo < 3 && !overTime()) setTryNo(tryNo + 1);
      else {
        highest.current = computeHighest(upFrames.current);
        const lo = lowest.current ?? computeLowest(upFrames.current);
        lowest.current = lo;
        if (highest.current == null || lo == null || highest.current - lo < 3) {
          setNote(ko.range.notEnough);
          downFrames.current = [];
          upFrames.current = [];
          upBreaks.current = [];
          setTryNo(1);
          setPhase('down');
          return;
        }
        setComfort(comfortStart(highest.current, lo));
        setPhase('comfort');
      }
    }
    if (overTime()) await finalize();
  };

  const runComfort = async () => {
    let s = comfort!;
    setBusy(ko.range.stepComfort);
    while (!s.done && !aborted.current) {
      if (overTime()) {
        setNote(ko.range.timeLimit);
        break;
      }
      // highestAbs 위로는 절대 제시하지 않는다
      const target = Math.min(s.current, s.highestAbs);
      setNote(null);
      setBusy(ko.range.comfortListen);
      const r = engine.playReference(target, 0.8, a4);
      if (!r) break;
      await sleep((r.end - engine.now()) * 1000 + SAFETY_POLICY.PLAYBACK_TAIL_MS + 200);
      if (aborted.current) return;
      setBusy(ko.range.comfortSing);
      const outcome = await new Promise<'success' | 'fail' | 'unmeasurable'>((resolve) => {
        const judge = new HoldJudge({ targetMidi: target, tolCents: COMFORT_TOL, holdMs: COMFORT_HOLD_MS });
        const off = engine.subscribe((f) => {
          if (f.id === -1) {
            off();
            resolve('unmeasurable');
            return;
          }
          const res = judge.push(f);
          setHoldPct(Math.min(1, res.heldMs / COMFORT_HOLD_MS));
          if (judge.finished) {
            off();
            resolve(res.status === 'success' ? 'success' : res.status === 'unmeasurable' ? 'unmeasurable' : 'fail');
          }
        });
        stopTry.current = () => {
          off();
          resolve('unmeasurable');
        };
      });
      stopTry.current = null;
      setHoldPct(0);
      if (outcome === 'unmeasurable') setNote(ko.range.unmeasurable);
      s = comfortNext(s, outcome);
      setComfort(s);
      setBusy(ko.range.rest);
      await sleep(1500);
    }
    setBusy(null);
    if (!aborted.current) await finalize(s);
  };

  const finalize = async (s: ComfortState | null = comfort) => {
    const hi = highest.current ?? computeHighest(upFrames.current);
    const lo = lowest.current ?? computeLowest(downFrames.current);
    if (hi == null || lo == null) {
      setNote(ko.range.notEnough);
      return;
    }
    const comfortMax = s ? comfortResult(s) : Math.max(lo, hi - 5);
    const slope = dbSlope(upFrames.current);
    await saveRangeTest({
      at: Date.now(),
      lowest: lo,
      highestAbs: hi,
      comfortMax: Math.min(comfortMax, hi),
      passaggio: breakCluster(upBreaks.current),
      dbSlope: slope,
      algoVersion: RANGE_ALGO_VERSION,
      a4,
      quality: totalFrames.current ? voicedFrames.current / totalFrames.current : 0,
      completed: !!s?.done,
    });
    setPhase('done');
    nav('/range/result', { replace: true, state: { prevId: prevTest?.id ?? null } });
  };

  const stop = async (reason: 'discomfort' | 'stop') => {
    aborted.current = true;
    stopTry.current?.();
    await recordStop(reason, 'range');
    setStopped(reason);
  };

  const stepIdx = { ref: 1, down: 2, up: 3, comfort: 4, done: 4 }[phase];
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="row-between">
        <span className="t-small muted">{ko.range.progress(stepIdx, 4)}</span>
        <SafetyBar onDiscomfort={() => stop('discomfort')} onStop={() => stop('stop')} />
      </div>
      <div className="bar">
        <span style={{ width: `${(stepIdx / 4) * 100}%` }} />
      </div>
      <h1 className="t-title">
        {phase === 'ref' && ko.range.stepRef}
        {phase === 'down' && ko.range.stepDown(tryNo)}
        {phase === 'up' && ko.range.stepUp(tryNo)}
        {phase === 'comfort' && ko.range.stepComfort}
      </h1>
      {phase === 'up' && <p className="muted">{ko.range.stepUpHint}</p>}
      <LivePitch />
      {phase === 'comfort' && comfort && (
        <div className="card warm stack-sm" style={{ alignItems: 'center' }}>
          <span className="t-heading">
            <NoteText midi={comfort.current} />
          </span>
          <div className="bar green" style={{ width: '100%' }} aria-label="유지 진행">
            <span style={{ width: `${holdPct * 100}%` }} />
          </div>
        </div>
      )}
      {busy && (
        <p className="status-line" aria-live="polite">
          {busy}
        </p>
      )}
      {note && <p role="status">{note}</p>}
      {phase === 'ref' && (
        <button className="btn primary lg" onClick={doRef} disabled={!!busy}>
          {ko.range.record}
        </button>
      )}
      {(phase === 'down' || phase === 'up') &&
        (recording ? (
          <button className="btn primary lg" onClick={() => stopTry.current?.()}>
            {ko.range.stopRecord}
          </button>
        ) : (
          <button className="btn primary lg" onClick={doSiren}>
            {ko.range.record}
          </button>
        ))}
      {phase === 'comfort' && !busy && (
        <button className="btn primary lg" onClick={runComfort}>
          {ko.common.start}
        </button>
      )}
      <InterruptOverlay />
      {stopped && (
        <RestCard
          title={stopped === 'discomfort' ? ko.safety.discomfortTitle : ko.safety.stoppedTitle}
          body={stopped === 'discomfort' ? ko.safety.discomfortBody : ko.safety.stoppedBody}
          onClose={() => nav('/', { replace: true })}
        />
      )}
    </div>
  );
}

/** 반음당 dB 기울기(선형 회귀). v2 밀어붙임 지표용 기록만 */
function dbSlope(frames: TrackedFrame[]): number {
  const v = frames.filter((f) => f.status === 'voiced' && f.midi != null);
  if (v.length < 10) return 0;
  const xs = v.map((f) => f.midi!);
  const ys = v.map((f) => f.rmsDb);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den ? num / den : 0;
}
