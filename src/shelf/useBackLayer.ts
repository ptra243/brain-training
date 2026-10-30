import { useEffect, useEffectEvent } from 'react';
import { shelfBack } from './backStack.ts';

/**
 * Registers an open #shelf layer with the Back button: while `open`, Back calls `close` (one layer per
 * press, top first). Closing it on screen removes its history entry. Every new shelf layer uses this.
 * `enabled` is false off the shelf, where nothing is registered.
 */
export function useBackLayer(open: boolean, close: () => void, enabled = true) {
  const onBack = useEffectEvent(() => close());
  useEffect(() => {
    if (!open || !enabled) return;
    return shelfBack().pushLayer(() => onBack());
  }, [open, enabled]);
}

/** Is the shelf look on (the green table's pop-ups register nothing)? */
export const onShelf = () => document.body.classList.contains('shelf');
