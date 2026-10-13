import { intlName, noteLabel } from '../../audio/noteMath';
import { useApp } from '../../app/store';

/** 설정의 음 이름 표기(P2-2: 국제식이 기준, 한국식은 보조) */
export function NoteText({ midi }: { midi: number }) {
  const style = useApp((s) => s.profile.settings.noteStyle);
  return <>{style === 'intl' ? intlName(midi) : noteLabel(midi)}</>;
}
