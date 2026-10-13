/** 워커가 내보내는 원시 프레임. t는 오디오 샘플 시계(초)로 프레임 끝 시각 */
export interface RawFrame {
  id: number;
  t: number;
  hz: number;
  clarity: number;
  rmsDb: number;
  peak: number;
}

export type FrameStatus = 'voiced' | 'unvoiced' | 'clipped';

/** 추적기가 내보내는 프레임. 원시값과 평활값을 분리 보관(P0-2) */
export interface TrackedFrame {
  id: number;
  t: number;
  status: FrameStatus;
  clarity: number;
  rmsDb: number;
  relDb: number | null;
  /** 유성 판정된 원시 MIDI(가드·평활 전) */
  rawMidi: number | null;
  /** 옥타브 가드 + 5프레임 중앙값(판정용) */
  midi: number | null;
  /** 화면 선용 EMA */
  displayMidi: number | null;
  /** 옥타브 가드가 원시 점프를 숨겼는지 */
  octaveGuarded: boolean;
  /** 기준음 재생 구간 등으로 판정 제외 */
  gated: boolean;
}
