// Hints come from the house cat helping on this case. Every game uses these
// two pieces: a button to ask, and a note card with what the cat did. Both show
// that cat's circular counter; the paw stays for marking a square or clue.

import { Portrait } from '../Portrait.tsx';
import { coatForCat } from '../portrait.ts';

export function Paw() {
  return (
    <svg className="paw" viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="16" rx="5.2" ry="4.4" />
      <ellipse cx="5.2" cy="10.4" rx="2.1" ry="2.7" />
      <ellipse cx="9.2" cy="6.2" rx="2.1" ry="2.8" />
      <ellipse cx="14.8" cy="6.2" rx="2.1" ry="2.8" />
      <ellipse cx="18.8" cy="10.4" rx="2.1" ry="2.7" />
    </svg>
  );
}

/** The helper cat's circular counter: its portrait head in the brass ring. Decorative; the name is in the label or sentence. */
export function CatCounter({ helper }: { helper: string }) {
  return (
    <span className="counter static has-portrait" aria-hidden="true">
      <Portrait coat={coatForCat(helper)} view="counter" />
    </span>
  );
}

export function HintButton({ helper, onAsk }: { helper: string; onAsk: () => void }) {
  return (
    <button
      className="hint-button"
      aria-label={`Ask ${helper} for a hint`}
      // Sits beside a focused board: keep the keyboard up.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onAsk}
    >
      <CatCounter helper={helper} />
      Hint
    </button>
  );
}

export function HintNote({ helper, text, onClose }: { helper: string; text: string; onClose: () => void }) {
  return (
    <div className="hint-note" role="status">
      <CatCounter helper={helper} />
      <p>{text}</p>
      <button className="hint-note-close" aria-label="Close the hint" onPointerDown={(e) => e.preventDefault()} onClick={onClose}>
        ×
      </button>
    </div>
  );
}
