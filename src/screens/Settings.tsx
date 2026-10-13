import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ko } from '../copy/ko';
import { exportJson, importJson, resetAll, saveProfile, saveSettings, toast, useApp } from '../app/store';
import type { Difficulty } from '../analysis/difficulty';
import { engine } from '../audio/engine';

// S12 설정
export function SettingsScreen() {
  const profile = useApp((s) => s.profile);
  const st = profile.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [nick, setNick] = useState(profile.nickname);

  const doExport = async () => {
    const text = await exportJson();
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `highnote-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const doImport = async (f: File) => {
    if (!confirm(ko.settings.importConfirm)) return;
    try {
      await importJson(await f.text());
      toast(ko.settings.importOk);
    } catch (e) {
      toast(ko.settings.importFail((e as Error).message));
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1 className="t-title">{ko.settings.title}</h1>

      <label className="field">
        <span className="section-title">{ko.settings.nickname}</span>
        <input type="text" value={nick} maxLength={20} onChange={(e) => setNick(e.target.value)} onBlur={() => saveProfile({ nickname: nick.trim() })} />
      </label>

      <div className="stack-sm">
        <span className="section-title">{ko.settings.difficulty}</span>
        <div className="seg" role="group" aria-label={ko.settings.difficulty}>
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
            <button key={d} aria-pressed={st.difficulty === d} onClick={() => saveSettings({ difficulty: d })}>
              {ko.settings.difficulties[d]}
            </button>
          ))}
        </div>
        <p className="t-small muted">{ko.settings.difficultyNote}</p>
      </div>

      <Toggle label={ko.settings.headphones} note={ko.settings.headphonesNote} checked={st.headphones} onChange={(v) => saveSettings({ headphones: v })} />
      <Toggle label={ko.settings.replay} note={ko.settings.replayNote} checked={st.replay} onChange={(v) => saveSettings({ replay: v })} />

      <label className="field">
        <span className="section-title">{ko.settings.a4}</span>
        <select
          value={st.a4}
          onChange={(e) => {
            const a4 = Number(e.target.value);
            void saveSettings({ a4 });
            engine.setCalibration({ a4 });
          }}
        >
          {Array.from({ length: 21 }, (_, i) => 430 + i).map((v) => (
            <option key={v} value={v}>
              {v} Hz
            </option>
          ))}
        </select>
        <span className="t-small muted">{ko.settings.a4Note}</span>
      </label>

      <div className="stack-sm">
        <span className="section-title">{ko.settings.weeklyGoal}</span>
        <div className="seg" role="group" aria-label={ko.settings.weeklyGoal}>
          {([3, 4, 5] as const).map((n) => (
            <button key={n} aria-pressed={st.weeklyGoal === n} onClick={() => saveSettings({ weeklyGoal: n })}>
              {ko.settings.weeklyGoalValue(n)}
            </button>
          ))}
        </div>
      </div>

      <div className="stack-sm">
        <span className="section-title">{ko.settings.noteStyle}</span>
        <div className="seg" role="group" aria-label={ko.settings.noteStyle}>
          {(['both', 'intl'] as const).map((n) => (
            <button key={n} aria-pressed={st.noteStyle === n} onClick={() => saveSettings({ noteStyle: n })}>
              {ko.settings.noteStyles[n]}
            </button>
          ))}
        </div>
      </div>

      <div className="stack-sm">
        <span className="section-title">{ko.settings.data}</span>
        <div className="btn-row">
          <button className="btn secondary" onClick={doExport}>
            {ko.settings.export}
          </button>
          <button className="btn secondary" onClick={() => fileRef.current?.click()}>
            {ko.settings.import}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn danger"
            onClick={async () => {
              if (!confirm(ko.settings.resetConfirm)) return;
              await engine.stop();
              await resetAll();
              toast(ko.settings.resetDone);
            }}
          >
            {ko.settings.reset}
          </button>
        </div>
      </div>

      <div className="card warm stack-sm">
        <h2 className="section-title">{ko.settings.about}</h2>
        <p>{ko.disclaimer.body}</p>
        <p>{ko.disclaimer.privacy}</p>
        <p>{ko.disclaimer.minors}</p>
        <p className="t-small muted">{ko.settings.safetyReview}</p>
        <h3 className="section-title">{ko.settings.licenses}</h3>
        <p className="t-small">{ko.settings.licenseText}</p>
      </div>
      <div className="row t-small">
        <span className="muted">{ko.settings.devTools}:</span>
        <Link to="/dev/pitch">/dev/pitch</Link>
        <Link to="/dev/ui">/dev/ui</Link>
      </div>
    </div>
  );
}

function Toggle({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check-row" style={{ alignItems: 'flex-start' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 2 }} />
      <span className="stack-sm" style={{ gap: 2 }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span className="t-small muted">{note}</span>
      </span>
    </label>
  );
}
