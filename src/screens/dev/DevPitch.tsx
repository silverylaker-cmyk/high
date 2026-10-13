import { useEffect, useRef, useState } from 'react';
import { engine, useAudioStatus } from '../../audio/engine';
import { noteLabel } from '../../audio/noteMath';
import type { TrackedFrame } from '../../audio/types';
import { ko } from '../../copy/ko';
import { MicGate } from '../../design/components/MicGate';
import { ProcessingWarning } from '../../design/components/ProcessingWarning';
import { InterruptOverlay } from '../../design/components/InterruptOverlay';

// /dev/pitch: 실시간 Hz·MIDI·cents·clarity·dB, 실제 마이크 설정, 내부 지연 P50/P95
export function DevPitch() {
  return (
    <MicGate>
      <DevPitchInner />
    </MicGate>
  );
}

function DevPitchInner() {
  const st = useAudioStatus();
  const canvas = useRef<HTMLCanvasElement>(null);
  const hist = useRef<TrackedFrame[]>([]);
  const [f, setF] = useState<TrackedFrame | null>(null);
  const [lat, setLat] = useState(engine.latencyStats());

  useEffect(() => {
    const off = engine.subscribe((fr) => {
      hist.current.push(fr);
      if (hist.current.length > 400) hist.current.shift();
    });
    let raf = 0;
    let lastUi = 0;
    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      const last = engine.lastFrame;
      if (last) engine.noteRendered(last.t);
      const c = canvas.current;
      if (c) {
        const dpr = devicePixelRatio || 1;
        const w = c.clientWidth;
        const h = c.clientHeight;
        if (c.width !== w * dpr) {
          c.width = w * dpr;
          c.height = h * dpr;
        }
        const g = c.getContext('2d')!;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        const lo = 40;
        const hi = 90;
        const y = (m: number) => h - ((m - lo) / (hi - lo)) * h;
        g.strokeStyle = 'rgba(29,28,29,.13)';
        for (let m = lo; m <= hi; m += 12) {
          g.beginPath();
          g.moveTo(0, y(m));
          g.lineTo(w, y(m));
          g.stroke();
        }
        const n = hist.current.length;
        hist.current.forEach((fr, i) => {
          const x = (i / 400) * w + (w - (n / 400) * w);
          if (fr.rawMidi != null) {
            g.fillStyle = '#E01E5A';
            g.fillRect(x, y(fr.rawMidi), 2, 2);
          }
          if (fr.displayMidi != null) {
            g.fillStyle = fr.gated ? '#ECB22E' : '#4A154B';
            g.fillRect(x, y(fr.displayMidi) - 1, 2, 3);
          }
        });
      }
      if (ts - lastUi > 150) {
        lastUi = ts;
        setF(engine.lastFrame);
        setLat(engine.latencyStats());
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, []);

  const hz = f?.midi != null ? 440 * Math.pow(2, (f.midi - 69) / 12) : null;
  return (
    <div className="stack">
      <h1 className="t-title">{ko.dev.pitchTitle}</h1>
      <ProcessingWarning />
      <div className="card" style={{ height: 220, position: 'relative' }}>
        <canvas ref={canvas} style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="card t-small" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <div>status: {f?.status ?? '-'} {f?.gated ? '(gated)' : ''}</div>
        <div>Hz: {hz?.toFixed(1) ?? '-'}</div>
        <div>MIDI: {f?.midi?.toFixed(2) ?? '-'} {f?.midi != null ? noteLabel(Math.round(f.midi)) : ''}</div>
        <div>raw MIDI: {f?.rawMidi?.toFixed(2) ?? '-'} {f?.octaveGuarded ? '(octave guard)' : ''}</div>
        <div>cents: {f?.midi != null ? Math.round((f.midi - Math.round(f.midi)) * 100) : '-'}</div>
        <div>clarity: {f?.clarity.toFixed(3) ?? '-'}</div>
        <div>rms dB: {f?.rmsDb.toFixed(1) ?? '-'} · rel dB: {f?.relDb?.toFixed(1) ?? '-'}</div>
        <div>
          {ko.dev.latency}: P50 {isFinite(lat.p50) ? lat.p50.toFixed(1) : '-'} ms · P95 {isFinite(lat.p95) ? lat.p95.toFixed(1) : '-'} ms (n={lat.n})
        </div>
        <div>
          {ko.dev.dropped}: worker {engine.droppedWorker} · stale {engine.droppedStale}
        </div>
        <div>sampleRate: {engine.ctx?.sampleRate ?? '-'} · baseLatency: {engine.ctx?.baseLatency?.toFixed(4) ?? '-'}</div>
      </div>
      <p className="t-small muted">{ko.dev.latencyNote}</p>
      <div className="card t-small">
        <strong>{ko.dev.settings}</strong>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(st.settings, null, 1)}</pre>
      </div>
      <button className="btn secondary" onClick={() => engine.playReference(69, 0.8, 440)}>
        A4 0.8 s
      </button>
      <InterruptOverlay />
    </div>
  );
}
