// AudioWorklet: 128 샘플 렌더 단위를 512 샘플 홉으로 묶어 워커로 보낸다(§4.1, P1-6).
// t = 홉 마지막 샘플의 오디오 시계(초). 판정은 이 시계를 기준으로 한다(P0-6).
declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, ctor: unknown): void;

const HOP = 512;

class CaptureProcessor extends AudioWorkletProcessor {
  private buf = new Float32Array(HOP);
  private fill = 0;
  private out: MessagePort | null = null;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'port') this.out = e.data.port as MessagePort;
    };
  }

  process(inputs: Float32Array[][]): boolean {
    const ch = inputs[0]?.[0];
    if (!ch || !this.out) return true;
    for (let i = 0; i < ch.length; i++) {
      this.buf[this.fill++] = ch[i];
      if (this.fill === HOP) {
        const t = currentTime + (i + 1) / sampleRate;
        const copy = this.buf;
        this.out.postMessage({ type: 'hop', samples: copy, t, sampleRate }, [copy.buffer]);
        this.buf = new Float32Array(HOP);
        this.fill = 0;
      }
    }
    return true;
  }
}

registerProcessor('capture', CaptureProcessor);
