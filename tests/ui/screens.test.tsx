import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { loadApp, resetAll, saveProfile, useApp } from '../../src/app/store';
import { PreCheckScreen } from '../../src/screens/PreCheck';
import { SelfCheckScreen } from '../../src/screens/SelfCheck';
import { Home } from '../../src/screens/Home';
import { GamesScreen } from '../../src/screens/Games';
import { ko } from '../../src/copy/ko';

const wrap = (el: React.ReactElement, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={el} />
      </Routes>
    </MemoryRouter>,
  );

describe('화면', () => {
  beforeEach(async () => {
    await loadApp();
    await resetAll();
    await saveProfile({ onboarded: true, nickname: '하늘' });
  });

  it('홈: 최상단 CTA 하나 + 퀘스트 3개', () => {
    wrap(<Home />);
    expect(screen.getAllByRole('button', { name: ko.home.cta })).toHaveLength(1);
    expect(screen.getByText(ko.quests.warmup)).toBeInTheDocument();
    expect(screen.getByText(ko.home.greeting('하늘'))).toBeInTheDocument();
  });

  it('시작 전 확인: 증상 선택 → 휴식 카드', async () => {
    wrap(<PreCheckScreen />, '/precheck');
    fireEvent.click(screen.getByLabelText(ko.precheck.pain));
    fireEvent.click(screen.getByRole('button', { name: ko.precheck.start }));
    expect(await screen.findByText(ko.precheck.blockedTitle)).toBeInTheDocument();
    expect(useApp.getState().session).toBeNull();
  });

  it('숨쉬기 곤란 선택 시 즉시 도움 안내', () => {
    wrap(<PreCheckScreen />, '/precheck');
    fireEvent.click(screen.getByLabelText(ko.precheck.breathing));
    expect(screen.getByRole('alert')).toHaveTextContent('119');
  });

  it('게임 목록: 시작 전 확인 전에는 잠금 사유 표시', () => {
    wrap(<GamesScreen />, '/games');
    expect(screen.getAllByText(new RegExp(ko.games.lock.noPrecheck)).length).toBeGreaterThan(0);
  });

  it('자가체크: 4단계 이모지 선택 후 기록', async () => {
    wrap(<SelfCheckScreen />, '/selfcheck');
    const painGroup = screen.getByText(ko.selfcheck.pain).closest('fieldset')!;
    fireEvent.click(painGroup.querySelectorAll('button')[1]);
    expect(painGroup.querySelectorAll('button')[1]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: ko.selfcheck.submit }));
    await waitFor(() => expect(useApp.getState().sessions.at(-1)?.selfCheck?.pain).toBe(1));
  });
});
