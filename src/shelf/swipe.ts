// Horizontal swipes on #shelf: the notebook's tabs and the book's ribbon sections. The decision is pure;
// `watchSwipe` is the thin touch-event wrapper (touch events, not pointer events: a pointer swipe is
// cancelled when the browser starts to pan).

export const SWIPE = { minDx: 60, ratio: 1.5, maxMs: 600 } as const;

export type SwipeDir = 'left' | 'right';

/** A swipe if it went far enough sideways, mostly sideways, and quickly. */
export function swipeDirection(dx: number, dy: number, ms: number): SwipeDir | null {
  if (ms >= SWIPE.maxMs) return null;
  if (Math.abs(dx) < SWIPE.minDx) return null;
  if (!(Math.abs(dx) > SWIPE.ratio * Math.abs(dy))) return null;
  return dx < 0 ? 'left' : 'right';
}

/** Left = next, right = previous, no wrap: the new index, or null at either end. */
export function stepIndex(index: number, count: number, dir: SwipeDir): number | null {
  const next = dir === 'left' ? index + 1 : index - 1;
  return next < 0 || next >= count || index < 0 ? null : next;
}

/** Things a swipe must never start on: drag sources, inputs and anything that opts out. */
export const NO_SWIPE = '[data-noswipe],[data-cbpid],[data-cbtray],.counter,.weapon,.tray,input,textarea,select,[contenteditable="true"]';

/** Does a gesture starting on `target` belong to something else (a drag, a typed field, a sideways scroller)? */
export function swipeBlocked(target: Element | null, root: Element): boolean {
  if (!target) return true;
  if (target.closest(NO_SWIPE)) return true;
  for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    const overflow = getComputedStyle(el).overflowX;
    if (overflow === 'auto' || overflow === 'scroll') return true;
  }
  return false;
}

/** Calls `onSwipe` for each clean one-finger swipe that starts inside `root`. Returns the remover. */
export function watchSwipe(root: HTMLElement, onSwipe: (dir: SwipeDir) => void, accept: (target: Element | null) => boolean = () => true): () => void {
  let from: { x: number; y: number; t: number } | null = null;
  const start = (e: TouchEvent) => {
    from = null;
    const target = e.target as Element | null;
    if (e.touches.length !== 1 || !accept(target)) return;
    if (swipeBlocked(target, root)) return;
    from = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: e.timeStamp };
  };
  const end = (e: TouchEvent) => {
    const f = from;
    from = null;
    if (!f || e.touches.length > 0 || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const dir = swipeDirection(t.clientX - f.x, t.clientY - f.y, e.timeStamp - f.t);
    if (dir) onSwipe(dir);
  };
  const cancel = () => {
    from = null;
  };
  root.addEventListener('touchstart', start, { passive: true });
  root.addEventListener('touchend', end, { passive: true });
  root.addEventListener('touchcancel', cancel, { passive: true });
  return () => {
    root.removeEventListener('touchstart', start);
    root.removeEventListener('touchend', end);
    root.removeEventListener('touchcancel', cancel);
  };
}
