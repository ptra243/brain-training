import { useLayoutEffect, useRef } from 'react';
import { itemName } from '../game/names.ts';
import { MapPanel } from '../game/MapPanel.tsx';
import type { Subject } from '../game/state.ts';
import styles from './MapPlate.module.css';
import type { Height } from './notebook.ts';
import type { QuickBook } from './useQuickBook.ts';

interface Props {
  book: QuickBook;
  /** The counter or weapon to ring in brass (the subject page showing), if any. */
  ring: Subject | null;
  /** How far up the notebook is: at half it covers the lower half of the screen. */
  height: Height;
  /** A short tap on a counter or weapon. */
  onSubject: (s: Subject) => void;
  /** A tap on the map itself: put the notebook away. */
  onTuck: () => void;
}

/** The button for this counter or weapon on the map above, if it is drawn. */
function pieceElement(root: HTMLElement, s: Subject): HTMLElement | null {
  if (s.kind === 'suspect') return root.querySelector<HTMLElement>(`[data-suspect="${CSS.escape(s.id)}"]`);
  const label = `The ${itemName(s.id)}`;
  for (const el of root.querySelectorAll<HTMLElement>('button.weapon')) {
    const text = el.getAttribute('aria-label') ?? '';
    if (text === label || text.startsWith(`${label}, held by`)) return el;
  }
  return null;
}

/**
 * The Map section: the classic floor plan and tray (`MapPanel`, her moves through `book.dispatch`)
 * drawn as a printed plate. A short tap on a counter or weapon asks for its page in the notebook; the
 * piece it is about is ringed in brass (a data attribute set from here, since MapPanel is unchanged).
 * With the notebook up, the plate scrolls so the ringed piece stays above the notebook.
 * Accusing from the map is hidden here: the Answer section is where she accuses.
 */
export function MapPlate({ book, ring, height, onSubject, onTuck }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const downOnPiece = useRef(false);
  const ringKey = ring ? `${ring.kind}:${ring.id}` : '';

  // Every render, because MapPanel makes new buttons when a piece moves to another room.
  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    for (const old of root.querySelectorAll('[data-ringed]')) old.removeAttribute('data-ringed');
    if (ring) pieceElement(root, ring)?.setAttribute('data-ringed', '');
  });

  // Keep the ringed piece between the top of the plate and the notebook's top edge.
  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root || !ring || height !== 'half') return;
    const place = () => {
      const el = pieceElement(root, ring);
      const box = root.getBoundingClientRect();
      if (!el || box.height === 0) return; // the page is still turned away
      const line = window.innerHeight / 2 - 30; // clear of the notebook's rings and shadow
      const r = el.getBoundingClientRect();
      if (r.bottom > line) root.scrollTop += r.bottom - line;
      else if (r.top < box.top + 4) root.scrollTop -= box.top + 4 - r.top;
    };
    place();
    // A book that opens straight onto the map (the preview) has no size until its page turns.
    const watch = new ResizeObserver(place);
    watch.observe(root);
    return () => watch.disconnect();
    // The piece's identity is ringKey; the ring object itself changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringKey, height]);

  return (
    <div
      ref={scrollRef}
      className={styles.scroll}
      data-testid="map-plate"
      onPointerDownCapture={(e) => {
        downOnPiece.current = !!(e.target as HTMLElement).closest('button');
      }}
      onClick={() => {
        // A tap on the plate itself, not a button or the end of a drag that began on one.
        if (!downOnPiece.current && height !== 'peek') onTuck();
        downOnPiece.current = false;
      }}
    >
      <p className={styles.head}>
        <span>Plate II</span>
        <em>The house, after dinner</em>
      </p>
      <div className={styles.plate}>
        <MapPanel c={book.c} progress={book.progress} dispatch={book.dispatch} onAccused={() => {}} onSubject={onSubject} />
      </div>
      {height === 'peek' ? null : <div className={styles.spacer} aria-hidden="true" />}
    </div>
  );
}
