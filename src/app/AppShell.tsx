import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ko } from '../copy/ko';
import { availability, useApp } from './store';
import { IconGames, IconHistory, IconLock, IconRange, IconToday } from '../design/components/Icons';
import { Toasts } from '../design/components/Toasts';
import { Celebrate } from '../design/components/Celebrate';

const TITLES: Record<string, string> = {
  '/': ko.nav.today,
  '/games': ko.nav.games,
  '/my-range': ko.nav.range,
  '/history': ko.nav.history,
  '/achievements': ko.nav.achievements,
  '/settings': ko.nav.settings,
  '/precheck': ko.precheck.title,
  '/selfcheck': ko.selfcheck.title,
  '/range': ko.range.title,
};

export function AppShell() {
  const loc = useLocation();
  const nav = useNavigate();
  const state = useApp();
  const avail = availability(state);
  const unseen = new Set(state.progress.unseen);
  const title = TITLES[loc.pathname] ?? (loc.pathname.startsWith('/range') ? ko.range.title : ko.appName);

  const games: { key: 'bubble' | 'siren' | 'climber' | 'cooldown'; label: string }[] = [
    { key: 'bubble', label: ko.nav.warmup },
    { key: 'siren', label: ko.nav.siren },
    { key: 'climber', label: ko.nav.climber },
    { key: 'cooldown', label: ko.nav.cooldown },
  ];

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="주 메뉴">
        <div className="brand">
          <img src="./icons/icon-192.png" alt="" />
          {ko.appName}
        </div>
        <NavLink to="/" end className={({ isActive }) => `side-item${isActive ? ' active' : ''}`}>
          <span className="dot" />
          {ko.nav.todayTraining}
        </NavLink>
        {games.map((g) => {
          const a = avail[g.key];
          return (
            <NavLink
              key={g.key}
              to={a.ok ? `/play/${g.key}` : '/games'}
              className={`side-item${!a.ok ? ' locked' : ''}${unseen.has(g.key) && a.ok ? ' unseen' : ''}`}
            >
              <span className="dot" />
              {g.label}
              {!a.ok && (
                <span style={{ marginLeft: 'auto' }} aria-label="잠김">
                  <IconLock />
                </span>
              )}
            </NavLink>
          );
        })}
        <div className="side-sep" />
        {[
          ['/my-range', ko.nav.range],
          ['/history', ko.nav.history],
          ['/achievements', ko.nav.achievements],
          ['/settings', ko.nav.settings],
        ].map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `side-item${isActive ? ' active' : ''}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <button className="avatar-btn" aria-label={ko.nav.openSettings} onClick={() => nav('/settings')}>
            <img src="./images/coach-avatar.png" alt="" />
          </button>
        </header>
        <main className="content" id="main">
          <Outlet />
        </main>
        <nav className="tabs" aria-label="하단 탭">
          {[
            ['/', ko.nav.today, <IconToday key="i" />],
            ['/games', ko.nav.games, <IconGames key="i" />],
            ['/my-range', ko.nav.range, <IconRange key="i" />],
            ['/history', ko.nav.history, <IconHistory key="i" />],
          ].map(([to, label, icon]) => (
            <NavLink key={to as string} to={to as string} end className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Toasts />
      <Celebrate />
    </div>
  );
}
