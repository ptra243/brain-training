import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClose: () => void;
  /** 'sheet' slides up from the bottom; 'center' sits mid-screen. */
  placement?: 'sheet' | 'center';
  /** Id of the heading inside `children` that names the dialog. */
  labelId: string;
}

/**
 * In-app modal. Closes on Escape or a tap that starts on the backdrop: on
 * touchscreens, the tap that opened it sends a late click that would
 * otherwise land on the backdrop and close it straight away.
 */
export function Dialog({ children, onClose, placement = 'sheet', labelId }: Props) {
  const downOnBackdrop = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const close = useEffectEvent(() => onClose());

  // Focus once on open (not on every re-render, or taps inside would jump focus).
  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className={`sheet-backdrop at-${placement}`}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) onClose();
        downOnBackdrop.current = false;
      }}
    >
      <div ref={boxRef} className={`sheet card at-${placement}`} role="dialog" aria-modal="true" aria-labelledby={labelId}>
        {children}
      </div>
    </div>
  );
}
