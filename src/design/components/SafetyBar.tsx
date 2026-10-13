import { ko } from '../../copy/ko';

/** 게임·측정 중 언제든 누를 수 있는 중단 버튼(P0-3) */
export function SafetyBar({ onDiscomfort, onStop }: { onDiscomfort: () => void; onStop: () => void }) {
  return (
    <div className="btn-row">
      <button className="btn danger" onClick={onDiscomfort}>
        {ko.safety.discomfortButton}
      </button>
      <button className="btn secondary" onClick={onStop}>
        {ko.safety.stopButton}
      </button>
    </div>
  );
}
