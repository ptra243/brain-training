import type { RefObject } from 'react';

/** Focus without scrolling the page; on a laptop, also on first open. */
export function focusTyping(ref: RefObject<HTMLInputElement | null>) {
  ref.current?.focus({ preventScroll: true });
}

/** Phones show their keyboard only after a tap, so only autofocus with a mouse. */
export const hasFinePointer = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
