import { create } from 'zustand';

// P1-7: 게임 중 서비스 워커 교체 금지. 새 버전은 홈에서 사용자가 새로 고칠 때만 적용한다.
export const useUpdate = create<{ ready: boolean; apply: (() => void) | null }>(() => ({ ready: false, apply: null }));

export function registerSW() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  import('virtual:pwa-register')
    .then(({ registerSW: reg }) => {
      const update = reg({
        onNeedRefresh() {
          useUpdate.setState({ ready: true, apply: () => void update(true) });
        },
      });
    })
    .catch(() => {});
}
