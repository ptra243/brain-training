import { useEffect, useState, type ReactNode } from 'react';
import { nosingBonuses } from '../../content/nosing.ts';
import type { NosingPuzzle, NosingView } from '../../games/nosing.ts';
import { gridLines, type GridFill, type Hand, type OpRef, type Slot } from '../../games/numberGrid.ts';
import { NumberGrid } from './NumberGrid.tsx';
import { hasClearable } from './numberGridUi.ts';

const STEP_MS = 900;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The cat's way to the target, one row at a time (all at once with reduced motion). */
export function WayReveal({ hand, way, title }: { hand: Hand; way: GridFill; title: string }) {
  const lines = gridLines(hand, way);
  const [shown, setShown] = useState(() => (reducedMotion() ? lines.length : 1));
  useEffect(() => {
    if (shown >= lines.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [shown, lines.length]);
  return (
    <div className="way">
      <h3>{title}</h3>
      <ol>
        {lines.slice(0, shown).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    </div>
  );
}

interface Props {
  puzzle: NosingPuzzle;
  view: NosingView;
  open: boolean;
  onPlace: (slot: Slot, card: number | OpRef) => void;
  onClear: (slot: Slot) => void;
  onClearAll: () => void;
  onTry: () => void;
  /** The hint button and note, shown above the grid. */
  hints: ReactNode;
}

/** The last square: make the target on the number grid with + − × ÷. */
export function NosingLock({ puzzle, view, open, onPlace, onClear, onClearAll, onTry, hints }: Props) {
  const { lock, lockObject } = puzzle;
  const [lo, hi] = view.window;
  const { evaluation } = view;
  const canClear = hasClearable(view.grid, view.locked);

  return (
    <div className="lock">
      <div className="lock-title">
        <h2>The lock</h2>
        <p className="lock-target">
          Make <strong>{lock.target}</strong>
        </p>
      </div>
      {open && <p>At the end of the trail, the cat found {lockObject.description}.</p>}
      {lo !== hi && (
        <p className="muted small">
          {nosingBonuses.closeEnough.name}: anything from {lo} to {hi} works.
        </p>
      )}
      {!open && (
        <>
          {hints}
          <p className="muted small">
            Tap a card, then a place for it. Use at least two numbers. {view.triesLeft} {view.triesLeft === 1 ? 'try' : 'tries'} left.
          </p>
        </>
      )}
      <NumberGrid
        hand={view.hand}
        fill={view.grid}
        evaluation={evaluation}
        locked={view.locked}
        disabled={open}
        torchCard={view.torchCard}
        onPlace={onPlace}
        onClear={onClear}
      />
      {!open && view.torch !== null && <p className="muted">The torch shows the {view.torch} is one you will not need.</p>}
      {!open && (
        <>
          <div className="lock-actions">
            <button className="secondary" disabled={!canClear} onClick={onClearAll}>
              Clear
            </button>
            <button className="primary" disabled={!evaluation.submittable || view.triesLeft < 1} onClick={onTry}>
              Try this number{evaluation.submittable ? ` (${evaluation.answer})` : ''}
            </button>
          </div>
        </>
      )}
      {view.inspiration && <WayReveal hand={view.hand} way={view.inspiration} title="The cat has a bout of inspiration" />}
      {view.way && <WayReveal hand={view.hand} way={view.way} title="The cat shows the way" />}
    </div>
  );
}
