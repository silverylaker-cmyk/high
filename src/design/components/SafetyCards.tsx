import { ko } from '../../copy/ko';
import type { RedFlag } from '../../safety/rules';
import { Modal } from './Modal';

export function RestCard({ title, body, onClose, closeLabel }: { title: string; body: string; onClose: () => void; closeLabel?: string }) {
  return (
    <Modal warm label={title}>
      <img className="illus" src="./images/rest-card.png" alt="" />
      <h2 className="t-title">{title}</h2>
      <p>{body}</p>
      <p className="t-small muted">{ko.safety.comfortFirst}</p>
      <button className="btn primary block" onClick={onClose}>
        {closeLabel ?? ko.common.home}
      </button>
    </Modal>
  );
}

export function DoctorCard({ flag }: { flag: Exclude<RedFlag, null> }) {
  return (
    <div className="card warm stack-sm" role="note">
      <h2 className="section-title">{ko.safety.doctorTitle}</h2>
      <p>{ko.safety.redFlagReason[flag]}</p>
      <p>{ko.safety.doctorBody}</p>
      <p className="t-small muted">{ko.safety.doctorPolicy}</p>
    </div>
  );
}

export function BreathingCard() {
  return (
    <div className="card stack-sm" role="alert" style={{ borderColor: 'var(--c-red)', borderWidth: 2 }}>
      <h2 className="section-title">{ko.safety.breathingTitle}</h2>
      <p>{ko.safety.breathingBody}</p>
    </div>
  );
}
