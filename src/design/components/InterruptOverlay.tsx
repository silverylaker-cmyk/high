import { useState } from 'react';
import { engine, useAudioStatus } from '../../audio/engine';
import { ko } from '../../copy/ko';
import { Modal } from './Modal';

/** 탭 숨김·잠금·장치 변경 등으로 멈춘 오디오를 사용자 탭으로 재개(D3) */
export function InterruptOverlay({ onResumed }: { onResumed?: (needsRecal: boolean) => void }) {
  const st = useAudioStatus();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (st.state !== 'interrupted') return null;
  const resume = async () => {
    setBusy(true);
    setErr(null);
    try {
      await engine.resume();
      onResumed?.(useAudioStatus.getState().needsRecalibration);
    } catch {
      const kind = useAudioStatus.getState().error ?? 'unknown';
      setErr(ko.mic.errors[kind]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal label={ko.mic.interruptedTitle}>
      <h2 className="t-title">{ko.mic.interruptedTitle}</h2>
      <p>{st.deviceChanged ? ko.mic.deviceChanged : ko.mic.interruptedBody}</p>
      {err && <p role="alert">{err}</p>}
      <button className="btn primary block lg" onClick={resume} disabled={busy}>
        {ko.common.resume}
      </button>
    </Modal>
  );
}
