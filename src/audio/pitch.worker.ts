/// <reference lib="webworker" />
import { analyzeFrame, FRAME_SIZE } from './pitchCore';

// 피치 워커: 링 버퍼(2048) + 홉(512)마다 분석. 밀린 홉은 최신 것만 분석하고 버린 수를 센다(P1-6).
// SharedArrayBuffer는 쓰지 않는다(교차 출처 격리 헤더가 필요 없도록).
const MAX_BACKLOG = 4;
const RECORD_MAX_SEC = 8;

const ring = new Float32Array(FRAME_SIZE);
const frame = new Float32Array(FRAME_SIZE);
let ringPos = 0;
let filled = 0;
let id = 0;
let dropped = 0;
let queue: { samples: Float32Array; t: number; sampleRate: number }[] = [];
let scheduled = false;
let recording: Float32Array[] | null = null;
let recordedLen = 0;
let recordRate = 48000;

function write(samples: Float32Array) {
  for (let i = 0; i < samples.length; i++) {
    ring[ringPos] = samples[i];
    ringPos = (ringPos + 1) % FRAME_SIZE;
  }
  filled = Math.min(FRAME_SIZE, filled + samples.length);
}

function process() {
  scheduled = false;
  const q = queue;
  queue = [];
  q.forEach((hop, i) => {
    write(hop.samples);
    if (recording && recordedLen < RECORD_MAX_SEC * hop.sampleRate) {
      recording.push(hop.samples);
      recordedLen += hop.samples.length;
      recordRate = hop.sampleRate;
    }
    const isLatest = i >= q.length - 1;
    if (filled < FRAME_SIZE) return;
    if (q.length > MAX_BACKLOG && !isLatest) {
      dropped++;
      id++;
      return;
    }
    for (let k = 0; k < FRAME_SIZE; k++) frame[k] = ring[(ringPos + k) % FRAME_SIZE];
    const a = analyzeFrame(frame, hop.sampleRate);
    (self as DedicatedWorkerGlobalScope).postMessage({ type: 'frame', id: id++, t: hop.t, ...a, dropped });
  });
}

function onHop(e: MessageEvent) {
  if (e.data?.type !== 'hop') return;
  queue.push(e.data);
  if (!scheduled) {
    scheduled = true;
    setTimeout(process, 0);
  }
}

self.onmessage = (e: MessageEvent) => {
  const d = e.data;
  if (d?.type === 'port') {
    (d.port as MessagePort).onmessage = onHop;
  } else if (d?.type === 'record-start') {
    recording = [];
    recordedLen = 0;
  } else if (d?.type === 'record-stop') {
    const out = new Float32Array(recordedLen);
    let o = 0;
    for (const c of recording ?? []) {
      out.set(c.subarray(0, Math.min(c.length, recordedLen - o)), o);
      o += c.length;
    }
    recording = null;
    recordedLen = 0;
    (self as DedicatedWorkerGlobalScope).postMessage({ type: 'recording', samples: out, sampleRate: recordRate }, [out.buffer]);
  } else if (d?.type === 'reset') {
    ring.fill(0);
    filled = 0;
    queue = [];
  }
};
