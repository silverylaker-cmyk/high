import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { saveProfile, useApp } from '../app/store';
import { engine, useAudioStatus } from '../audio/engine';
import { calibrateNoise, calibrateRef } from './useCalibration';
import { ProcessingWarning } from '../design/components/ProcessingWarning';

// S1 온보딩: 환영 → 교육용 안내·이어폰 권장 → 마이크 권한 + 소음 2 s → 편한 "아" 3 s
export function Onboarding() {
  const nav = useNavigate();
  const profile = useApp((s) => s.profile);
  const mic = useAudioStatus();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState(profile.nickname);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const finish = async (to: string) => {
    await saveProfile({ nickname: nickname.trim(), onboarded: true });
    nav(to, { replace: true });
  };

  const startMic = async () => {
    setMsg(null);
    setBusy(ko.mic.requesting);
    try {
      await engine.start();
      engine.setCalibration({ a4: profile.settings.a4 });
      setBusy(ko.mic.noiseMeasuring);
      const floor = await calibrateNoise();
      setMsg(ko.mic.noiseDone(floor) + (floor > -45 ? ` ${ko.mic.noiseHigh}` : ''));
      setStep(3);
    } catch {
      setMsg(ko.mic.errors[useAudioStatus.getState().error ?? 'unknown']);
    } finally {
      setBusy(null);
    }
  };

  const recordRef = async () => {
    setMsg(null);
    setBusy(ko.onboarding.refRecording);
    const ref = await calibrateRef();
    setBusy(null);
    if (ref == null) setMsg(ko.onboarding.refRetry);
    else {
      setMsg(ko.onboarding.refDone);
      setStep(4);
    }
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--c-horchata)', padding: 16 }}>
      <div className="stack" style={{ maxWidth: 520, margin: '0 auto', paddingTop: 24 }}>
        <div className="bar" aria-label={`${step + 1}/5`}>
          <span style={{ width: `${((step + 1) / 5) * 100}%` }} />
        </div>
        {step === 0 && (
          <>
            <img src="./images/onboarding-hero.png" alt="" style={{ borderRadius: 12 }} />
            <h1 className="t-title">{ko.onboarding.welcomeTitle}</h1>
            <p>{ko.onboarding.welcomeBody}</p>
            <label className="field">
              <span className="t-small muted">{ko.onboarding.nickname}</span>
              <input type="text" value={nickname} maxLength={20} placeholder={ko.onboarding.nicknamePlaceholder} onChange={(e) => setNickname(e.target.value)} />
            </label>
            <button className="btn primary lg" onClick={() => setStep(1)}>
              {ko.common.next}
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="t-title">{ko.disclaimer.title}</h1>
            <div className="card stack-sm">
              <p>{ko.disclaimer.body}</p>
              <p>{ko.disclaimer.limits}</p>
              <p>{ko.disclaimer.privacy}</p>
              <p className="t-small muted">{ko.disclaimer.minors}</p>
            </div>
            <h2 className="section-title">{ko.onboarding.earphoneTitle}</h2>
            <p>{ko.onboarding.earphoneBody}</p>
            <button className="btn primary lg" onClick={() => setStep(2)}>
              {ko.onboarding.agree}
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="t-title">{ko.mic.title}</h1>
            <p>{ko.mic.why}</p>
            {busy && <p className="status-line" aria-live="polite">{busy}</p>}
            {msg && <p role="alert">{msg}</p>}
            <button className="btn primary lg" onClick={startMic} disabled={!!busy}>
              {ko.mic.allow}
            </button>
            <button className="btn secondary" onClick={() => finish('/')}>
              {ko.mic.tryWithoutMic}
            </button>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="t-title">{ko.onboarding.refTitle}</h1>
            <p>{ko.onboarding.refBody}</p>
            <ProcessingWarning />
            {busy && <p className="status-line" aria-live="polite">{busy}</p>}
            {msg && <p role="status">{msg}</p>}
            <button className="btn primary lg" onClick={recordRef} disabled={!!busy || mic.state !== 'running'}>
              {ko.range.record}
            </button>
          </>
        )}
        {step === 4 && (
          <>
            <img src="./images/mascot-256.png" alt="" style={{ width: 120, margin: '0 auto' }} />
            <p>{msg}</p>
            <button className="btn primary lg" onClick={() => finish('/range')}>
              {ko.onboarding.finish}
            </button>
            <button className="btn secondary" onClick={() => finish('/range/manual')}>
              {ko.onboarding.skipRange}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
