import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { startSession, useApp } from '../app/store';
import { BreathingCard, RestCard } from '../design/components/SafetyCards';

// 시작 전 상태 확인(D3·P0-3). 하나라도 해당하면 버블·쿨다운을 포함한 발성 연습을 열지 않는다.
export function PreCheckScreen() {
  const nav = useNavigate();
  const hasRange = useApp((s) => !!s.progress.ceiling);
  const [a, setA] = useState({ pain: false, hoarse: false, suddenChange: false, breathing: false });
  const [blocked, setBlocked] = useState(false);
  const keys = ['pain', 'hoarse', 'suddenChange', 'breathing'] as const;

  const submit = async () => {
    const ok = await startSession(a);
    if (!ok) setBlocked(true);
    else nav(hasRange ? '/play/bubble' : '/range');
  };

  return (
    <div className="stack" style={{ maxWidth: 520 }}>
      <h1 className="t-title">{ko.precheck.title}</h1>
      <p>{ko.precheck.intro}</p>
      {keys.map((k) => (
        <label key={k} className="check-row">
          <input type="checkbox" checked={a[k]} onChange={(e) => setA({ ...a, [k]: e.target.checked })} />
          {ko.precheck[k]}
        </label>
      ))}
      {a.breathing && <BreathingCard />}
      <button className="btn primary lg" onClick={submit}>
        {ko.precheck.start}
      </button>
      {blocked && <RestCard title={ko.precheck.blockedTitle} body={ko.precheck.blockedBody} onClose={() => nav('/')} />}
    </div>
  );
}
