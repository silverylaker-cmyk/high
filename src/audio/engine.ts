import { create } from 'zustand';
import workletUrl from './worklet/capture-processor.ts?worker&url';
import { PitchTracker, percentile } from './pitchTrack';
import { checkSupport, classifyError, MicError, processingState, requestMic, type MicErrorKind, type MicRequest } from './mic';
import { scheduleBlip, scheduleTone } from './synth';
import { FRAME_SIZE } from './pitchCore';
import { PlaybackGate } from '../analysis/gate';
import { SAFETY_POLICY } from '../safety/config';
import type { RawFrame, TrackedFrame } from './types';

// §4.1 오디오 파이프라인 + D3 모바일 생명주기 복구
// getUserMedia → MediaStreamSource → AudioWorklet('capture') → MessageChannel → pitch.worker → 추적기 → 구독자

export type EngineState = 'idle' | 'requesting' | 'running' | 'interrupted' | 'error';
export type InterruptCause = 'hidden' | 'context' | 'track' | 'device' | 'pagehide';

export interface AudioStatus {
  state: EngineState;
  error: MicErrorKind | null;
  processing: 'off' | 'on' | 'unknown';
  interruptCause: InterruptCause | null;
  deviceChanged: boolean;
  needsRecalibration: boolean;
  settings: MediaTrackSettings | null;
}

export const useAudioStatus = create<AudioStatus>(() => ({
  state: 'idle',
  error: null,
  processing: 'unknown',
  interruptCause: null,
  deviceChanged: false,
  needsRecalibration: false,
  settings: null,
}));

/** 유성 판정 임계값(P0-5). 립트릴·허밍 값은 실측 후 승인 전까지 기본값과 같게 둔다(후보 0.75–0.85) */
export const VOICING = { normal: 0.9, sovt: 0.9 } as const;
export type VoicingMode = keyof typeof VOICING;

const STALE_SEC = 0.25;
type Listener = (f: TrackedFrame) => void;

class AudioEngine {
  ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private sink: GainNode | null = null;
  private worker: Worker | null = null;
  private pending: MicRequest | null = null;
  private listeners = new Set<Listener>();
  private rawListeners = new Set<(f: RawFrame) => void>();
  readonly tracker = new PitchTracker();
  readonly gate = new PlaybackGate();
  private latencies: number[] = [];
  droppedWorker = 0;
  droppedStale = 0;
  lastFrame: TrackedFrame | null = null;
  private recordResolve: ((r: { samples: Float32Array; sampleRate: number }) => void) | null = null;
  private lifecycleBound = false;
  /** 프레임 창 길이(초). 게이트 겹침 판정에 사용 */
  private frameSec = FRAME_SIZE / 48000;

  get state() {
    return useAudioStatus.getState().state;
  }

  get running() {
    return this.state === 'running';
  }

  now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  subscribeRaw(fn: (f: RawFrame) => void): () => void {
    this.rawListeners.add(fn);
    return () => this.rawListeners.delete(fn);
  }

  setVoicing(mode: VoicingMode) {
    this.tracker.setConfig({ minClarity: VOICING[mode] });
  }

  setCalibration(c: { noiseFloorDb?: number; refDb?: number | null; a4?: number }) {
    const patch: Record<string, unknown> = {};
    if (c.noiseFloorDb != null) patch.noiseFloorDb = c.noiseFloorDb;
    if (c.a4 != null) patch.a4 = c.a4;
    // 브라우저 처리가 남아 있으면 강도 평가를 끈다(P1-2)
    if (c.refDb !== undefined) patch.refDb = useAudioStatus.getState().processing === 'on' ? null : c.refDb;
    this.tracker.setConfig(patch);
  }

  /** 반드시 사용자 제스처 안에서 호출(iOS Safari) */
  async start(): Promise<void> {
    if (this.state === 'running' || this.state === 'requesting') return;
    const unsupported = checkSupport();
    if (unsupported) {
      useAudioStatus.setState({ state: 'error', error: unsupported });
      throw new MicError(unsupported);
    }
    useAudioStatus.setState({ state: 'requesting', error: null });
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioContext({ latencyHint: 'interactive' });
        this.ctx.onstatechange = () => this.onContextState();
      }
      const resumeP = this.ctx.resume();
      await this.openStream();
      await resumeP;
      await this.buildGraph();
      this.bindLifecycle();
      useAudioStatus.setState({ state: 'running', interruptCause: null, deviceChanged: false });
    } catch (e) {
      const kind = classifyError(e);
      this.teardownStream();
      useAudioStatus.setState({ state: 'error', error: kind });
      throw e instanceof MicError ? e : new MicError(kind, e);
    }
  }

  private async openStream() {
    this.pending = requestMic();
    try {
      this.stream = await this.pending.promise;
    } catch (e) {
      if (classifyError(e) !== 'constraint') throw e;
      // 제약을 만족할 수 없으면 기본 설정으로 한 번 더 요청
      this.pending = requestMic(15000, true);
      this.stream = await this.pending.promise;
    } finally {
      this.pending = null;
    }
    const track = this.stream.getAudioTracks()[0];
    const settings = track.getSettings?.() ?? {};
    useAudioStatus.setState({ settings, processing: processingState(settings) });
    track.onmute = () => this.interrupt('track');
    track.onended = () => this.interrupt('track');
    track.onunmute = () => {};
  }

  private async buildGraph() {
    const ctx = this.ctx!;
    this.frameSec = FRAME_SIZE / ctx.sampleRate;
    if (!this.workletLoaded) {
      await ctx.audioWorklet.addModule(workletUrl);
      this.workletLoaded = true;
    }
    this.worker?.terminate();
    this.worker = new Worker(new URL('./pitch.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => this.onWorkerMessage(e.data);
    const chan = new MessageChannel();
    this.node = new AudioWorkletNode(ctx, 'capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
    this.node.port.postMessage({ type: 'port', port: chan.port1 }, [chan.port1]);
    this.worker.postMessage({ type: 'port', port: chan.port2 }, [chan.port2]);
    this.source = ctx.createMediaStreamSource(this.stream!);
    this.sink = ctx.createGain();
    this.sink.gain.value = 0;
    this.source.connect(this.node).connect(this.sink).connect(ctx.destination);
    this.tracker.reset();
  }
  private workletLoaded = false;

  private onWorkerMessage(d: { type: string } & Record<string, unknown>) {
    if (d.type === 'recording') {
      this.recordResolve?.({ samples: d.samples as Float32Array, sampleRate: d.sampleRate as number });
      this.recordResolve = null;
      return;
    }
    if (d.type !== 'frame') return;
    this.droppedWorker = d.dropped as number;
    if (!this.running || !this.ctx) return;
    const raw = d as unknown as RawFrame;
    const lag = this.ctx.currentTime - raw.t;
    // 오래된 프레임은 판정에 쓰지 않는다(P1-6)
    if (lag > STALE_SEC) {
      this.droppedStale++;
      return;
    }
    this.rawListeners.forEach((fn) => fn(raw));
    const f = this.tracker.push(raw);
    f.gated = this.gate.isGated(f.t, this.frameSec);
    this.lastFrame = f;
    this.listeners.forEach((fn) => fn(f));
  }

  /** 화면에 그린 시점에 호출 → 내부 캡처→렌더 지연(샘플 시계 기준) 기록(P0-6) */
  noteRendered(frameT: number) {
    if (!this.ctx) return;
    this.latencies.push((this.ctx.currentTime - frameT) * 1000);
    if (this.latencies.length > 600) this.latencies.shift();
  }

  latencyStats(): { p50: number; p95: number; n: number } {
    const xs = this.latencies;
    return { p50: percentile(xs, 50), p95: percentile(xs, 95), n: xs.length };
  }

  /** 기준음 재생. 재생 + 꼬리 구간은 판정 제외(P0-8, 이어폰 모드여도 동일) */
  playReference(midi: number, durSec: number, a4: number) {
    if (!this.ctx) return null;
    const r = scheduleTone(this.ctx, midi, durSec, a4);
    this.gate.prune(this.ctx.currentTime);
    if (!SAFETY_POLICY.JUDGE_DURING_PLAYBACK) this.gate.add(r.start, r.end, SAFETY_POLICY.PLAYBACK_TAIL_MS);
    return r;
  }

  playBlip(ok: boolean) {
    if (!this.ctx) return;
    const r = scheduleBlip(this.ctx, ok);
    this.gate.add(r.start, r.end, SAFETY_POLICY.PLAYBACK_TAIL_MS);
  }

  /** 오디오 시계 기준으로 일정 시간 프레임 수집 */
  collect(sec: number, raw = false): Promise<(TrackedFrame | RawFrame)[]> {
    return new Promise((resolve) => {
      const out: (TrackedFrame | RawFrame)[] = [];
      const t0 = this.now();
      const off = raw
        ? this.subscribeRaw((f) => {
            out.push(f);
            if (f.t - t0 >= sec) done();
          })
        : this.subscribe((f) => {
            out.push(f);
            if (f.t - t0 >= sec) done();
          });
      const timer = setTimeout(() => done(), (sec + 2) * 1000);
      const done = () => {
        off();
        clearTimeout(timer);
        resolve(out);
      };
    });
  }

  /** 2초 무음 → noiseFloorDb = rmsDb 95번째 백분위수(§4.4) */
  async measureNoiseFloor(sec = 2): Promise<number> {
    const frames = (await this.collect(sec, true)) as RawFrame[];
    const floor = frames.length ? percentile(frames.map((f) => f.rmsDb), 95) : -60;
    this.tracker.setConfig({ noiseFloorDb: floor });
    useAudioStatus.setState({ needsRecalibration: false });
    return floor;
  }

  startRecording() {
    this.worker?.postMessage({ type: 'record-start' });
  }

  stopRecording(): Promise<{ samples: Float32Array; sampleRate: number } | null> {
    if (!this.worker) return Promise.resolve(null);
    return new Promise((resolve) => {
      this.recordResolve = resolve;
      this.worker!.postMessage({ type: 'record-stop' });
      setTimeout(() => {
        if (this.recordResolve === resolve) {
          this.recordResolve = null;
          resolve(null);
        }
      }, 1000);
    });
  }

  playBuffer(samples: Float32Array, sampleRate: number): Promise<void> {
    if (!this.ctx) return Promise.resolve();
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, samples.length, sampleRate);
    buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const start = ctx.currentTime + 0.05;
    src.start(start);
    this.gate.add(start, start + buf.duration, SAFETY_POLICY.PLAYBACK_TAIL_MS);
    return new Promise((r) => (src.onended = () => r()));
  }

  // ── 생명주기(D3) ──
  private bindLifecycle() {
    if (this.lifecycleBound) return;
    this.lifecycleBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.interrupt('hidden');
    });
    window.addEventListener('pagehide', () => {
      this.interrupt('pagehide');
      // bfcache로 들어가면 마이크를 놓아 준다
      this.teardownStream();
    });
    window.addEventListener('pageshow', (e) => {
      if ((e as PageTransitionEvent).persisted && this.state !== 'idle') this.interrupt('pagehide');
    });
    navigator.mediaDevices?.addEventListener?.('devicechange', () => {
      if (this.state === 'running' || this.state === 'interrupted') {
        useAudioStatus.setState({ deviceChanged: true });
        this.interrupt('device');
      }
    });
  }

  private onContextState() {
    const s = this.ctx?.state as string | undefined;
    if (s && s !== 'running' && this.state === 'running') this.interrupt('context');
  }

  interrupt(cause: InterruptCause) {
    if (this.state !== 'running' && this.state !== 'interrupted') return;
    useAudioStatus.setState({ state: 'interrupted', interruptCause: cause });
    this.tracker.reset();
    this.listeners.forEach((fn) => fn(this.interruptMarker()));
  }

  private interruptMarker(): TrackedFrame {
    return {
      id: -1,
      t: this.now(),
      status: 'unvoiced',
      clarity: 0,
      rmsDb: -120,
      relDb: null,
      rawMidi: null,
      midi: null,
      displayMidi: null,
      octaveGuarded: false,
      gated: true,
    };
  }

  /** 사용자 탭으로 재개. 트랙이 끝났으면 stream·graph를 새로 만들고 재보정 필요 표시 */
  async resume(): Promise<void> {
    if (!this.ctx) return this.start();
    const track = this.stream?.getAudioTracks()[0];
    const dead = !track || track.readyState === 'ended' || track.muted;
    const ctxClosed = this.ctx.state === 'closed';
    try {
      if (ctxClosed) {
        this.ctx = null;
        this.workletLoaded = false;
        useAudioStatus.setState({ state: 'idle' });
        await this.start();
        useAudioStatus.setState({ needsRecalibration: true });
        return;
      }
      const resumeP = this.ctx.resume();
      if (dead || useAudioStatus.getState().deviceChanged) {
        this.teardownStream();
        await this.openStream();
        await resumeP;
        await this.buildGraph();
        useAudioStatus.setState({ needsRecalibration: true });
      } else {
        await resumeP;
      }
      this.tracker.reset();
      useAudioStatus.setState({ state: 'running', interruptCause: null, deviceChanged: false });
    } catch (e) {
      const kind = classifyError(e);
      useAudioStatus.setState({ state: 'error', error: kind });
      throw e;
    }
  }

  private teardownStream() {
    this.pending?.cancel();
    this.pending = null;
    try {
      this.source?.disconnect();
      this.node?.disconnect();
      this.sink?.disconnect();
    } catch {
      /* 이미 끊긴 노드 */
    }
    this.stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.onmute = null;
      t.stop();
    });
    this.stream = null;
    this.source = null;
    this.node = null;
    this.worker?.terminate();
    this.worker = null;
  }

  /** 종료 시 모든 track을 멈춘다 */
  async stop() {
    this.teardownStream();
    this.gate.clear();
    try {
      await this.ctx?.close();
    } catch {
      /* noop */
    }
    this.ctx = null;
    this.workletLoaded = false;
    useAudioStatus.setState({ state: 'idle', interruptCause: null });
  }
}

export const engine = new AudioEngine();
