import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './AppShell';
import { loadApp, useApp } from './store';
import { ko } from '../copy/ko';
import { Home } from '../screens/Home';
import { Onboarding } from '../screens/Onboarding';
import { PreCheckScreen } from '../screens/PreCheck';
import { RangeTestScreen } from '../screens/RangeTest';
import { RangeResult } from '../screens/RangeResult';
import { ManualCeiling } from '../screens/ManualCeiling';
import { GamesScreen } from '../screens/Games';
import { PlayScreen } from '../screens/Play';
import { SelfCheckScreen } from '../screens/SelfCheck';
import { MyRange } from '../screens/MyRange';
import { History } from '../screens/History';
import { Achievements } from '../screens/Achievements';
import { SettingsScreen } from '../screens/Settings';
import { DevPitch } from '../screens/dev/DevPitch';
import { DevUI } from '../screens/dev/DevUI';
import { Toasts } from '../design/components/Toasts';
import { Celebrate } from '../design/components/Celebrate';

function RequireOnboarded({ children }: { children: React.ReactElement }) {
  const onboarded = useApp((s) => s.profile.onboarded);
  const loc = useLocation();
  if (!onboarded && !loc.pathname.startsWith('/dev')) return <Navigate to="/onboarding" replace />;
  return children;
}

export function App() {
  const loaded = useApp((s) => s.loaded);
  useEffect(() => {
    void loadApp();
  }, []);
  if (!loaded) return <p style={{ padding: 24 }}>{ko.common.loading}</p>;
  return (
    <HashRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/play/:game"
          element={
            <RequireOnboarded>
              <>
                <PlayScreen />
                <Toasts />
                <Celebrate />
              </>
            </RequireOnboarded>
          }
        />
        <Route
          element={
            <RequireOnboarded>
              <AppShell />
            </RequireOnboarded>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/precheck" element={<PreCheckScreen />} />
          <Route path="/range" element={<RangeTestScreen />} />
          <Route path="/range/manual" element={<ManualCeiling />} />
          <Route path="/range/result" element={<RangeResult />} />
          <Route path="/games" element={<GamesScreen />} />
          <Route path="/selfcheck" element={<SelfCheckScreen />} />
          <Route path="/my-range" element={<MyRange />} />
          <Route path="/history" element={<History />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/dev/pitch" element={<DevPitch />} />
          <Route path="/dev/ui" element={<DevUI />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
