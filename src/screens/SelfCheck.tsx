import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { finishSession, toast } from '../app/store';
import { engine } from '../audio/engine';

// S8 자가체크: 0–3 이모지 4단계, 15초 내 완료. 건너뛰면 '알 수 없음'으로 남는다(P0-3)
type Lv = 0 | 1 | 2 | 3;

export function SelfCheckScreen() {
  const nav = useNavigate();
  const [v, setV] = useState<{ pain: Lv; hoarse: Lv; fatigue: Lv }>({ pain: 0, hoarse: 0, fatigue: 0 });
  const [longHoarse, setLongHoarse] = useState(false);
  const done = async (save: boolean) => {
    await finishSession(save ? { ...v, longHoarse } : null);
    await engine.stop();
    if (save) toast(ko.selfcheck.saved);
    nav('/', { replace: true });
  };
  return (
    <div className="stack" style={{ maxWidth: 520 }}>
      <h1 className="t-title">{ko.selfcheck.title}</h1>
      <p>{ko.selfcheck.intro}</p>
      {(['pain', 'hoarse', 'fatigue'] as const).map((k) => (
        <fieldset key={k} className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="section-title" style={{ marginBottom: 8 }}>
            {ko.selfcheck[k]}
          </legend>
          <div className="emoji-scale">
            {ko.selfcheck.levels.map((label, i) => (
              <button key={label} aria-pressed={v[k] === i} onClick={() => setV({ ...v, [k]: i as Lv })}>
                <span aria-hidden="true">{ko.selfcheck.emojis[i]}</span>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="check-row">
        <input type="checkbox" checked={longHoarse} onChange={(e) => setLongHoarse(e.target.checked)} />
        {ko.selfcheck.longHoarse}
      </label>
      <button className="btn primary lg" onClick={() => done(true)}>
        {ko.selfcheck.submit}
      </button>
      <button className="btn secondary" onClick={() => done(false)}>
        {ko.selfcheck.skip}
      </button>
      <p className="t-small muted">{ko.selfcheck.skipNote}</p>
    </div>
  );
}
