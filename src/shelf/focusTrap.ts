/** Which of `count` focusable elements Tab should land on, wrapping at both ends. `index` is -1 when focus is outside them. */
export function nextFocus(index: number, count: number, shift: boolean): number {
  if (count <= 0) return -1;
  if (index < 0) return shift ? count - 1 : 0;
  return shift ? (index - 1 + count) % count : (index + 1) % count;
}

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab inside `root`. Returns a function that removes the listener. */
export function trapTab(root: HTMLElement): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[hidden], [inert]'));
    const at = items.indexOf(document.activeElement as HTMLElement);
    const to = nextFocus(at, items.length, e.shiftKey);
    if (to < 0) return;
    // Let the browser move focus within the layer; step in only to wrap round or to pull focus back in.
    const edge = at < 0 || (e.shiftKey ? at === 0 : at === items.length - 1);
    if (!edge) return;
    e.preventDefault();
    items[to].focus();
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
