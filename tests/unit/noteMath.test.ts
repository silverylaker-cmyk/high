import { hzToMidi, intlName, koName, midiToHz, noteLabel } from '../../src/audio/noteMath';

describe('noteMath (§4.3, 부록 A)', () => {
  const table: [number, string, string, number][] = [
    [48, 'C3', '1옥타브 도', 130.8],
    [60, 'C4', '2옥타브 도', 261.6],
    [64, 'E4', '2옥타브 미', 329.6],
    [67, 'G4', '2옥타브 솔', 392.0],
    [69, 'A4', '2옥타브 라', 440.0],
    [71, 'B4', '2옥타브 시', 493.9],
    [72, 'C5', '3옥타브 도', 523.3],
    [74, 'D5', '3옥타브 레', 587.3],
    [76, 'E5', '3옥타브 미', 659.3],
    [79, 'G5', '3옥타브 솔', 784.0],
    [81, 'A5', '3옥타브 라', 880.0],
    [84, 'C6', '4옥타브 도', 1046.5],
  ];
  it.each(table)('MIDI %i = %s = %s ≈ %f Hz', (midi, intl, ko, hz) => {
    expect(intlName(midi)).toBe(intl);
    expect(koName(midi)).toBe(ko);
    expect(midiToHz(midi)).toBeCloseTo(hz, 0);
    expect(hzToMidi(hz)).toBeCloseTo(midi, 1);
  });
  it('C3 미만은 국제식만', () => {
    expect(koName(47)).toBeNull();
    expect(noteLabel(45)).toBe('A2');
    expect(noteLabel(69)).toBe('2옥타브 라 · A4');
  });
  it('A4 기준 변경', () => {
    expect(hzToMidi(432, 432)).toBeCloseTo(69, 6);
  });
});
