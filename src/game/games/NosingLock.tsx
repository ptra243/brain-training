import { useEffect, useState, type ReactNode } from 'react';
import { nosingBonuses } from '../../content/nosing.ts';
import type { NosingPuzzle, NosingView } from '../../games/nosing.ts';
import { lockMove, type Op, type Step } from '../../games/lock.ts';
import { OPS, OP_NAME, OP_SIGN, stepText } from './nosingUi.ts';

const STEP_MS = 900;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The cat's way to the target, one step at a time (all at once with reduced motion). */
export function WayReveal({ steps, title }: { steps: readonly Step[]; title: string }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? steps.length : 1));
  useEffect(() => {
    if (shown >= steps.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [shown, steps.length]);
  return (
    <div className="way">
      <h3>{title}</h3>
      <ol>
        {steps.slice(0, shown).map((s, i) => (
          <li key={i}>{stepText(s)}</li>
        ))}
      </ol>
    </div>
  );
}

interface Props {
  puzzle: NosingPuzzle;
  view: NosingView;
  open: boolean;
  canUndo: boolean;
  /** Tiles the cat's hint is pointing at. */
  pointed: readonly number[];
  pointUndo: boolean;
  onCombine: (a: number, b: number, op: Op) => void;
  onUndo: () => void;
  onTry: () => void;
  /** The hint button and note, shown above the tiles. */
  hints: ReactNode;
}

/** The last square: make the target from the tiles with + − × ÷. */
export function NosingLock({ puzzle, view, open, canUndo, pointed, pointUndo, onCombine, onUndo, onTry, hints }: Props) {
  const [picked, setPicked] = useState<number[]>([]);
  const { lock, lockObject } = puzzle;
  const [lo, hi] = view.window;
  const torchAt = view.torch === null ? -1 : view.tiles.findIndex((t) => t.value === view.torch && t.uses === 1);
  // A tile list that changes size (a step was made or undone) clears the picks.
  const [seenCount, setSeenCount] = useState(view.tiles.length);
  if (seenCount !== view.tiles.length) {
    setSeenCount(view.tiles.length);
    setPicked([]);
  }

  const tap = (i: number) => {
    if (open) return;
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length >= 2 ? [p[1], i] : [...p, i]));
  };
  const canOp = (op: Op) => picked.length === 2 && lockMove(view.tiles, { a: picked[0], b: picked[1], op }) !== null;

  return (
    <div className="lock">
      <h2>The lock</h2>
      <p>At the end of the trail, the cat found {lockObject.description}.</p>
      <p className="lock-target">
        Make <strong>{lock.target}</strong>
      </p>
      {lo !== hi && (
        <p className="muted">
          {nosingBonuses.closeEnough.name}: the lock will take anything from {lo} to {hi}.
        </p>
      )}
      {!open && (
        <>
          {hints}
          <p className="muted">Tap two numbers, then choose how to join them. Use at least two numbers in your answer.</p>
        </>
      )}
      <div className="lock-tiles" role="group" aria-label="Your numbers">
        {view.tiles.map((t, i) => (
          <button
            key={i}
            className={`lock-tile ${picked.includes(i) ? 'picked' : ''} ${pointed.includes(i) ? 'pointed' : ''} ${i === torchAt ? 'torch' : ''}`}
            aria-pressed={picked.includes(i)}
            aria-label={i === torchAt ? `${t.value}, you will not need this one` : String(t.value)}
            disabled={open}
            onClick={() => tap(i)}
          >
            {t.value}
          </button>
        ))}
      </div>
      {!open && torchAt >= 0 && <p className="muted">The torch shows the {view.torch} is one you will not need.</p>}
      {!open && (
        <>
          <div className="lock-ops" role="group" aria-label="How to join them">
            {OPS.map((op) => (
              <button
                key={op}
                className="lock-op"
                aria-label={OP_NAME[op]}
                disabled={!canOp(op)}
                onClick={() => {
                  onCombine(picked[0], picked[1], op);
                  setPicked([]);
                }}
              >
                {OP_SIGN[op]}
              </button>
            ))}
          </div>
          <div className="lock-actions">
            <button className={`secondary ${pointUndo ? 'pointed' : ''}`} disabled={!canUndo} onClick={onUndo}>
              Undo
            </button>
            <button className="primary" disabled={!view.submittable || view.triesLeft < 1} onClick={onTry}>
              Try this number{view.submittable ? ` (${view.submittable.value})` : ''}
            </button>
          </div>
          <p className="muted">
            {view.triesLeft} {view.triesLeft === 1 ? 'try' : 'tries'} left.
          </p>
        </>
      )}
      {view.inspiration && <WayReveal steps={view.inspiration} title="The cat has a bout of inspiration" />}
      {view.way && <WayReveal steps={view.way} title="The cat shows the way" />}
    </div>
  );
}
