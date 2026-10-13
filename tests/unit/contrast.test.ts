import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// M0 AC: §7.2 대비표 자동 테스트(WCAG 2.x 상대 휘도)
const css = readFileSync(resolve(__dirname, '../../src/design/tokens.css'), 'utf8');
const token = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token ${name} missing`);
  return m[1];
};
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('§7.2 텍스트 대비', () => {
  const pairs: [string, string, number][] = [
    ['c-aubergine', 'c-white', 14.0],
    ['c-aubergine-2', 'c-white', 11.0],
    ['c-horchata', 'c-black', 14.6],
    ['c-white', 'c-black', 17.0],
    ['c-blue', 'c-black', 8.4],
    ['c-green', 'c-black', 6.6],
    ['c-yellow', 'c-black', 8.9],
    ['c-red', 'c-white', 4.7],
  ];
  it.each(pairs)('%s 위 %s ≥ AA(4.5), 표 값 ≈ %f', (bg, fg, expected) => {
    const r = ratio(token(bg), token(fg));
    expect(r).toBeGreaterThanOrEqual(4.5);
    expect(Math.abs(r - expected)).toBeLessThan(0.6);
  });
  it('금지 조합은 AA 미달(사용 금지 확인용)', () => {
    expect(ratio(token('c-blue'), token('c-white'))).toBeLessThan(4.5);
    expect(ratio(token('c-red'), token('c-black'))).toBeLessThan(4.5);
  });
});
