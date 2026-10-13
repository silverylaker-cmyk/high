// §4.1·P1-1·P1-2 마이크 요청과 실패 분류
export type MicErrorKind = 'insecure' | 'unsupported' | 'denied' | 'notFound' | 'busy' | 'constraint' | 'timeout' | 'unknown';

/** boolean 제약은 '요청'일 뿐 보장이 아니다. exact로 강제하지 않는다(P1-2) */
export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
};

export class MicError extends Error {
  constructor(public kind: MicErrorKind, cause?: unknown) {
    super(kind);
    this.cause = cause;
  }
}

export function checkSupport(): MicErrorKind | null {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC || typeof AudioWorkletNode === 'undefined') return 'unsupported';
  return null;
}

export function classifyError(e: unknown): MicErrorKind {
  if (e instanceof MicError) return e.kind;
  const name = (e as { name?: string })?.name ?? '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'notFound';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'constraint';
    default:
      return 'unknown';
  }
}

/** 실제 적용된 처리 상태: 셋 다 false면 'off', 하나라도 true면 'on', 값이 없으면 'unknown' */
export function processingState(s: MediaTrackSettings): 'off' | 'on' | 'unknown' {
  const vals = [s.echoCancellation, s.noiseSuppression, s.autoGainControl];
  if (vals.some((v) => v === true)) return 'on';
  if (vals.every((v) => v === false)) return 'off';
  return 'unknown';
}

export interface MicRequest {
  promise: Promise<MediaStream>;
  cancel: () => void;
}

/** 무응답 타임아웃·취소 지원. 취소 뒤 늦게 도착한 stream은 즉시 정지한다 */
export function requestMic(timeoutMs = 15000, constraints: MediaTrackConstraints | true = AUDIO_CONSTRAINTS): MicRequest {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectFn: (e: unknown) => void = () => {};
  const promise = new Promise<MediaStream>((resolve, reject) => {
    rejectFn = reject;
    timer = setTimeout(() => {
      cancelled = true;
      reject(new MicError('timeout'));
    }, timeoutMs);
    navigator.mediaDevices.getUserMedia({ audio: constraints, video: false }).then(
      (stream) => {
        clearTimeout(timer);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        resolve(stream);
      },
      (err) => {
        clearTimeout(timer);
        if (!cancelled) reject(new MicError(classifyError(err), err));
      },
    );
  });
  return {
    promise,
    cancel: () => {
      cancelled = true;
      clearTimeout(timer);
      rejectFn(new MicError('unknown'));
    },
  };
}
