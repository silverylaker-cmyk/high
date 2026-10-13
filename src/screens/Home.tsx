import { Link, useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { isSymptomToday, reactCoach, selfChecks, useApp } from '../app/store';
import { useUpdate } from '../app/sw';
import { QuestCard } from '../design/components/QuestCard';
import { EnergyBattery } from '../design/components/EnergyBattery';
import { MessageCard } from '../design/components/MessageCard';
import { DoctorCard } from '../design/components/SafetyCards';
import { NoteText } from '../design/components/NoteText';
import { StatTile } from '../design/components/StatTile';
import { redFlag } from '../safety/rules';
import { daysThisWeek } from '../meta/streak';
import { levelProgress } from '../meta/xp';

// S4 오늘(홈): 최상단 CTA는 항상 하나
export function Home() {
  const nav = useNavigate();
  const s = useApp();
  const upd = useUpdate();
  const now = Date.now();
  const flag = redFlag(selfChecks(s), now);
  const symptom = isSymptomToday(s, now);
  const lp = levelProgress(s.progress.xp);
  const starts = s.sessions.filter((x) => x.durationSec > 0).map((x) => x.startedAt);
  const c = s.progress.ceiling;

  return (
    <div className="stack">
      <div className="row-between">
        <h1 className="t-title">{ko.home.greeting(s.profile.nickname)}</h1>
        <span className="chip">{ko.home.level(lp.level)}</span>
      </div>
      {flag && <DoctorCard flag={flag} />}
      {!s.storageOk && <p className="chip">{ko.settings.storageWarn}</p>}
      {upd.ready && !s.session && (
        <div className="card row-between">
          <span>{ko.home.updateReady}</span>
          <button className="btn secondary" onClick={() => upd.apply?.()}>
            {ko.home.updateNow}
          </button>
        </div>
      )}
      {symptom ? (
        <div className="card warm row">
          <img src="./images/rest-card.png" alt="" style={{ width: 72 }} />
          <p>{ko.safety.symptomLocked}</p>
        </div>
      ) : s.session ? (
        <div className="btn-row">
          <button className="btn primary lg" style={{ flex: 1 }} onClick={() => nav('/games')}>
            {ko.home.continue}
          </button>
          <button className="btn secondary lg" onClick={() => nav('/selfcheck')}>
            {ko.home.finishSession}
          </button>
        </div>
      ) : (
        <button className="btn primary lg block" onClick={() => nav('/precheck')}>
          {ko.home.cta}
        </button>
      )}

      <div className="grid-auto stack">
        <section className="stack-sm">
          <h2 className="section-title">{ko.home.quests}</h2>
          {s.quests.map((q) => (
            <QuestCard key={q.id} q={q} />
          ))}
        </section>
        <section className="stack-sm">
          <div className="card stack-sm">
            <h2 className="section-title">{ko.home.energy}</h2>
            <EnergyBattery energy={s.progress} />
            <p className="t-small muted">{ko.safety.energyExplain}</p>
          </div>
          <div className="card grid-2">
            <StatTile value={ko.home.streakValue(s.progress.weekStreak)} label={ko.home.streak} />
            <StatTile value={`${daysThisWeek(starts, now)}/${s.profile.settings.weeklyGoal}`} label={ko.home.weekDaysLabel} />
          </div>
          <div className="card stack-sm">
            <h2 className="section-title">{ko.home.nextTarget}</h2>
            {c ? (
              <span className="t-display">
                <NoteText midi={c.practiceTarget} />
              </span>
            ) : (
              <>
                <p className="muted">{ko.home.noRange}</p>
                <Link className="btn secondary" to={s.session ? '/range' : '/precheck'}>
                  {ko.home.measure}
                </Link>
              </>
            )}
          </div>
        </section>
      </div>

      <section className="stack-sm">
        <h2 className="section-title">{ko.home.coach}</h2>
        {s.coach.length === 0 && <p className="muted">{ko.coach.empty}</p>}
        {s.coach.slice(0, 3).map((m) => (
          <div key={m.id ?? m.at} className="card">
            <MessageCard m={m} onReact={m.id != null ? (e) => reactCoach(m.id!, e) : undefined} />
          </div>
        ))}
      </section>
    </div>
  );
}
