import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ children, warm, label }: { children: ReactNode; warm?: boolean; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={label}>
      <div ref={ref} className={`modal${warm ? ' warm' : ''}`}>
        {children}
      </div>
    </div>
  );
}
