// 자체 제작 선 아이콘(OS 이모지 외 외부 아이콘 팩 미사용)
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const IconToday = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...P}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
  </svg>
);
export const IconGames = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...P}>
    <rect x="3" y="7" width="18" height="11" rx="4" />
    <path d="M8 11v3M6.5 12.5h3M15.5 12h.01M18 14h.01" />
  </svg>
);
export const IconRange = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...P}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M8 5v8M12 5v14M16 5v8M8 13v6M16 13v6" />
  </svg>
);
export const IconHistory = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...P}>
    <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
  </svg>
);
export const IconLock = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...P}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
