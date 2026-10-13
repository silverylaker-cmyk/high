import { useEffect, useRef } from 'react';

/** requestAnimationFrame 루프. 콜백은 최신 값을 쓰도록 ref로 보관 */
export function useRaf(cb: (ts: number) => void, active = true) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const loop = (ts: number) => {
      ref.current(ts);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);
}
