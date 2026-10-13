import { useAudioStatus } from '../../audio/engine';
import { ko } from '../../copy/ko';

export function ProcessingWarning() {
  const p = useAudioStatus((s) => s.processing);
  const state = useAudioStatus((s) => s.state);
  if (state !== 'running' || p === 'off') return null;
  return (
    <p className="chip" role="note" style={{ height: 'auto', padding: '6px 8px' }}>
      {p === 'on' ? ko.mic.processingWarning : ko.mic.processingUnknown}
    </p>
  );
}
