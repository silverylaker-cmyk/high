// Canvas 2D 공통: devicePixelRatio 대응
export function fitCanvas(c: HTMLCanvasElement): { g: CanvasRenderingContext2D; w: number; h: number } {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const g = c.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}

export const COLORS = {
  aubergine: '#4A154B',
  black: '#1D1C1D',
  white: '#FFFFFF',
  blue: '#36C5F0',
  green: '#2EB67D',
  yellow: '#ECB22E',
  red: '#E01E5A',
  border: 'rgba(29,28,29,.13)',
  muted: 'rgba(29,28,29,.7)',
  horchata: '#F4EDE4',
  // 세컨더리: 오브젝트 전용
  aqua: '#78D7DD',
  cyan: '#0E9DD3',
  teal: '#2392A2',
  butter: '#FFD57E',
  peach: '#FED4BE',
  pink: '#FFB6BD',
  navy: '#1E328F',
} as const;

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
