import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

export interface DragPoint {
  x: number;
  y: number;
}

export interface PointerDragOptions<T> {
  /** Pixels the pointer must travel before a press becomes a drag. Default 8. */
  threshold?: number;
  /** The press crossed the threshold. */
  onLift?: (payload: T) => void;
  /** Every move after the lift. The ghost is already positioned; do not set state here per move. */
  onMove?: (payload: T, at: DragPoint, e: PointerEvent) => void;
  /** Released after a lift. */
  onDrop: (payload: T, at: DragPoint) => void;
  /** Released without a lift. */
  onTap?: (payload: T, e: PointerEvent) => void;
  /** Pointer cancelled, window blurred, or the mouse button was let go off-window. */
  onCancel?: (payload: T) => void;
  /** Another pointer went down during a lifted drag (it never starts a second drag). */
  onExtraPointer?: () => void;
}

interface Active<T> {
  payload: T;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  lifted: boolean;
}

/**
 * One piece dragged by one pointer, with window listeners (no pointer capture).
 * Call `start` from a piece's onPointerDown. The ghost element (give it `ref={ghostRef}`,
 * render it while `held` is set, `position: fixed`) is moved directly, with no React state per move.
 */
export function usePointerDrag<T>(opts: PointerDragOptions<T>): {
  start: (payload: T, e: ReactPointerEvent) => void;
  held: T | null;
  ghostRef: RefObject<HTMLDivElement | null>;
} {
  const [held, setHeld] = useState<T | null>(null);
  const active = useRef<Active<T> | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const positionGhost = () => {
    const d = active.current;
    const g = ghostRef.current;
    if (!d || !g || !d.lifted) return;
    g.style.left = `${d.x}px`;
    g.style.top = `${d.y}px`;
  };

  // The ghost appears at the last point, not at 0,0.
  useLayoutEffect(() => {
    if (held !== null) positionGhost();
  }, [held]);

  const finish = useEffectEvent((kind: 'drop' | 'cancel' | 'tap', e?: PointerEvent) => {
    const d = active.current;
    if (!d) return;
    active.current = null;
    setHeld(null);
    if (kind === 'drop') opts.onDrop(d.payload, { x: d.x, y: d.y });
    else if (kind === 'tap') opts.onTap?.(d.payload, e as PointerEvent);
    else opts.onCancel?.(d.payload);
  });

  const move = useEffectEvent((e: PointerEvent) => {
    const d = active.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) {
      finish('cancel');
      return;
    }
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.lifted) {
      if (Math.hypot(d.x - d.startX, d.y - d.startY) <= (opts.threshold ?? 8)) return;
      d.lifted = true;
      setHeld(d.payload);
      opts.onLift?.(d.payload);
    }
    positionGhost();
    opts.onMove?.(d.payload, { x: d.x, y: d.y }, e);
  });

  const up = useEffectEvent((e: PointerEvent) => {
    const d = active.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.x = e.clientX;
    d.y = e.clientY;
    finish(d.lifted ? 'drop' : 'tap', e);
  });

  const cancel = useEffectEvent((e?: PointerEvent) => {
    const d = active.current;
    if (!d || (e && e.pointerId !== d.pointerId)) return;
    finish('cancel');
  });

  const extra = useEffectEvent((e: PointerEvent) => {
    const d = active.current;
    if (d?.lifted && e.pointerId !== d.pointerId) {
      e.preventDefault();
      opts.onExtraPointer?.();
    }
  });

  useEffect(() => {
    const onDown = (e: PointerEvent) => extra(e);
    const onMove = (e: PointerEvent) => move(e);
    const onUp = (e: PointerEvent) => up(e);
    const onCancel = (e: PointerEvent) => cancel(e);
    const onBlur = () => cancel();
    window.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const start = (payload: T, e: ReactPointerEvent) => {
    e.stopPropagation(); // the floor plan's own tap handling must not fire
    if (active.current || e.button > 0) return; // one drag at a time
    e.preventDefault();
    active.current = { payload, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, lifted: false };
  };

  return { start, held, ghostRef };
}
