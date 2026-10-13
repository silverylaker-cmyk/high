// §4.7·P0-8 기준음 재생 구간 판정 제외. 시간은 오디오 샘플 시계(초).
export class PlaybackGate {
  private ranges: [number, number][] = [];

  add(start: number, end: number, tailMs: number) {
    this.ranges.push([start, end + tailMs / 1000]);
  }

  isGated(t: number, frameSec = 0): boolean {
    // 프레임 창(끝 시각 t, 길이 frameSec)이 재생 구간과 조금이라도 겹치면 제외
    const s = t - frameSec;
    return this.ranges.some(([a, b]) => s <= b && t >= a);
  }

  /** 지금 이후로 끝나는 구간이 있는지(재생 중 또는 꼬리) */
  activeAt(t: number): boolean {
    return this.ranges.some(([a, b]) => t >= a && t <= b);
  }

  prune(now: number) {
    this.ranges = this.ranges.filter(([, b]) => b >= now - 1);
  }

  clear() {
    this.ranges = [];
  }
}
