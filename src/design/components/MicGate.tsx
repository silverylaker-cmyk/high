import { useState, type ReactNode } from 'react';
import { engine, useAudioStatus } from '../../audio/engine';
import { ko } from '../../copy/ko';
import { useApp } from '../../app/store';

/** 마이크가 켜져 있어야 하는 화면을 감싼다. 사용자 탭으로 시작(iOS 제스처 요구) */
export function MicGate({ children }: { children: ReactNode }) {
  const st = useAudioStatus();
  const calib = useApp((s) => s.profile.calib);
  const a4 = useApp((s) => s.profile.settings.a4);
  const [busy, setBusy] = useState(false);
  if (st.state === 'running' || st.state === 'interrupted') return <>{children}</>;
  const start = async () => {
    setBusy(true);
    try {
      await engine.start();
      engine.setCalibration({ noiseFloorDb: calib?.noiseFloorDb ?? -60, refDb: calib?.refDb ?? null, a4 });
    } catch {
      /* 오류 표시는 아래에서 */
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card warm stack" style={{ maxWidth: 480, margin: '40px auto' }}>
      <h2 className="t-title">{ko.mic.title}</h2>
      <p>{ko.mic.why}</p>
      {st.state === 'error' && st.error && (
        <p role="alert" style={{ fontWeight: 700 }}>
          {ko.mic.errors[st.error]}
        </p>
      )}
      <button className="btn primary lg" onClick={start} disabled={busy}>
        {busy ? ko.mic.requesting : ko.mic.allow}
      </button>
    </div>
  );
}
