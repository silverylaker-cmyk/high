// §4.3 음 표기. 데이터 기준은 MIDI·국제식이고 한국식은 보조 표기(P2-2).
const NAMES_INTL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const NAMES_KO = ['도', '도#', '레', '레#', '미', '파', '파#', '솔', '솔#', '라', '라#', '시'] as const;

export function hzToMidi(hz: number, a4 = 440): number {
  return 69 + 12 * Math.log2(hz / a4);
}

export function midiToHz(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function centsBetween(hz: number, targetHz: number): number {
  return 1200 * Math.log2(hz / targetHz);
}

/** 목표 MIDI(정수) 대비 cents */
export function centsFromMidi(midi: number, targetMidi: number): number {
  return (midi - targetMidi) * 100;
}

export function intlName(midi: number): string {
  const m = Math.round(midi);
  return `${NAMES_INTL[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

/** 한국식 옥타브: koOct = floor(midi/12) − 3. C3(48) 미만은 null */
export function koName(midi: number): string | null {
  const m = Math.round(midi);
  if (m < 48) return null;
  return `${Math.floor(m / 12) - 3}옥타브 ${NAMES_KO[((m % 12) + 12) % 12]}`;
}

/** UI 표기: "2옥타브 라 · A4" (C3 미만은 국제식만) */
export function noteLabel(midi: number): string {
  const ko = koName(midi);
  return ko ? `${ko} · ${intlName(midi)}` : intlName(midi);
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((Math.round(midi) % 12) + 12) % 12);
}
