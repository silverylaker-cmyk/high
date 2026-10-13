// §6 안전 규칙 — 원장(검토자) 검토 없이 변경 금지.
// 초기값이며 근거 기반 임계값이 아니다. 검토자 역할·자격·검토일·승인 버전은 docs/PROGRESS.md에 기록한다(§11.5).
export const SAFETY = {
  SESSION_SOFT_STOP_MIN: 20, // 안내 후 계속 가능
  SESSION_HARD_STOP_MIN: 25, // 고음 게임 강제 종료
  HIGH_ZONE_OFFSET: 2, // 고음역 = comfortMax − 2 이상
  ENERGY_INITIAL_SEC: 120, // 하루 고음역 유성음 예산
  ENERGY_WEEKLY_STEP_SEC: 15, // 부정 자가체크 없는 주마다 +15
  ENERGY_MAX_SEC: 300,
  ENERGY_PENALTY_RATIO: 0.5, // 통증 ≥2 또는 쉰 목소리 ≥2 → 다음 날 50%
  WARMUP_REQUIRED_SEC: 90, // 버블 완료 전 고음 게임 잠금
  NEW_NOTE_MAX_PER_7D: 2, // 7일 롤링 최대 +2반음
  RED_FLAG_HOARSE_DAYS: 3, // 14일 내 쉰 목소리 ≥2가 3회 → 진료 권장 카드
  RED_FLAG_WINDOW_DAYS: 14,
} as const; // 초기값 — 근거 기반 임계값 아님, 원장 판단으로 조정

// 검수 결정(§11.2)에 따른 MVP 정책 스위치. 상수 값은 바꾸지 않고, 적용 여부만 정한다.
export const SAFETY_POLICY = {
  /** D1: MVP에서 편한 상한 자동 상향 보류. 상한은 낮추기만 허용 */
  AUTO_CEILING_RAISE: false,
  /** §11.5: 에너지 주간 자동 증가 보류(전문가 검토 대상) */
  ENERGY_AUTO_STEP: false,
  /** D2: 추적 끊김(크랙)·전환점 추정을 점수·목표 생성에 쓰지 않음 */
  BREAKS_AFFECT_SCORE: false,
  /** P0-8: 이어폰 모드여도 기준음 재생 중에는 판정하지 않음 */
  JUDGE_DURING_PLAYBACK: false,
  /** 기준음 재생 뒤 판정 제외 꼬리(§4.7) */
  PLAYBACK_TAIL_MS: 120,
  /** 음역 측정 총 시간 제한(§4.9: 4분 이내) */
  RANGE_TEST_MAX_SEC: 240,
} as const;
