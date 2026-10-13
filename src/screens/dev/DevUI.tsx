import { ko } from '../../copy/ko';
import { EnergyBattery } from '../../design/components/EnergyBattery';
import { KeyboardMap } from '../../design/components/KeyboardMap';
import { MessageCard } from '../../design/components/MessageCard';
import { QuestCard } from '../../design/components/QuestCard';
import { StatTile } from '../../design/components/StatTile';
import { toast } from '../../app/store';

// /dev/ui: 컴포넌트 카탈로그
export function DevUI() {
  return (
    <div className="stack">
      <h1 className="t-title">{ko.dev.uiTitle}</h1>
      <div className="t-display">display 28/36</div>
      <div className="t-title">title 22/28</div>
      <div className="t-heading">heading 18/24</div>
      <div className="t-body">body 15/22 한글 본문</div>
      <div className="t-small">small 13/18</div>
      <div className="t-hud">HUD 1234</div>
      <div className="btn-row">
        <button className="btn primary">주 버튼</button>
        <button className="btn secondary">보조 버튼</button>
        <button className="btn danger">위험 버튼</button>
        <button className="btn secondary" onClick={() => toast('토스트 예시예요')}>
          토스트
        </button>
      </div>
      <div className="row wrap">
        {[
          ['#4A154B', '#fff'],
          ['#611F69', '#fff'],
          ['#F4EDE4', '#1D1C1D'],
          ['#36C5F0', '#1D1C1D'],
          ['#2EB67D', '#1D1C1D'],
          ['#ECB22E', '#1D1C1D'],
          ['#E01E5A', '#fff'],
        ].map(([bg, fg]) => (
          <span key={bg} className="chip" style={{ background: bg, color: fg, height: 32 }}>
            {bg}
          </span>
        ))}
      </div>
      <QuestCard q={{ id: 'x', date: '', kind: 'warmup', target: 90, progress: 45, done: false }} />
      <EnergyBattery energy={{ energyDate: '', energyBudgetSec: 120, energyUsedTodaySec: 50 }} />
      <StatTile value="3주" label="주간 스트릭" />
      <KeyboardMap
        from={48}
        to={84}
        notes={{
          60: { midi: 60, state: 'acquired', firstAt: 0, bestHeldMs: 0, bestCentsSD: 0 },
          62: { midi: 62, state: 'touched', firstAt: 0, bestHeldMs: 0, bestCentsSD: 0 },
        }}
        target={64}
      />
      <div className="card">
        <MessageCard m={{ at: Date.now(), text: '오늘 12분 연습했고 고음역은 45초였어요.', reactions: { '👍': 1 } }} onReact={() => {}} />
      </div>
    </div>
  );
}
