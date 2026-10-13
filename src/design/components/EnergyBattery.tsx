import { ko } from '../../copy/ko';
import { batteryCells, remainingSec, type EnergyState } from '../../meta/energy';

export function EnergyBattery({ energy, compact }: { energy: EnergyState; compact?: boolean }) {
  const cells = batteryCells(energy);
  const left = remainingSec(energy);
  return (
    <div className="stack-sm" aria-label={`${ko.home.energy}: ${ko.home.energyLeft(left)}`}>
      <div className="battery" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < cells ? 'on' : ''} />
        ))}
      </div>
      {!compact && <span className="t-small muted">{left > 0 ? ko.home.energyLeft(left) : ko.safety.energyEmpty}</span>}
    </div>
  );
}
