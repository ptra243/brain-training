// Hints come from the house cat helping on this case. Every game uses these
// two pieces: a button to ask, and a note card with what the cat did.

function Paw() {
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

export function HintButton({ helper, onAsk }: { helper: string; onAsk: () => void }) {
  return (
    <button
      className="hint-button"
      aria-label={`Ask ${helper} for a hint`}
      // Sits beside a focused board: keep the keyboard up.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onAsk}
    >
      <Paw />
      Hint
    </button>
  );
}

export function HintNote({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="hint-note" role="status">
      <Paw />
      <p>{text}</p>
      <button className="hint-note-close" aria-label="Close the hint" onPointerDown={(e) => e.preventDefault()} onClick={onClose}>
        ×
      </button>
    </div>
  );
}
