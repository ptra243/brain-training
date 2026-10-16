import { useEffect, useRef, type CSSProperties } from 'react';
import type { Case } from '../engine/types.ts';
import { itemName, roomName, suspectColour, suspectInitials, suspectName } from './names.ts';
import { cluesAbout, heldItem, placedRoom, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  suspect: string;
  onClose: () => void;
  /** Start "tap a room to place" for this suspect. */
  onMove: () => void;
}

/** Card that slides up over the map with the clues naming one suspect. */
export function SuspectSheet({ c, progress, dispatch, suspect, onClose, onMove }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const downOnBackdrop = useRef(false);
  const clues = cluesAbout(c, suspect);
  const room = placedRoom(c, progress, suspect);
  const item = heldItem(c, progress, suspect);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const placedLine = [room && `You've placed them in the ${roomName(room)}`, item && `with the ${itemName(item)}`]
    .filter(Boolean)
    .join(' ');

  return (
    // Close only on taps that start on the backdrop: on touchscreens the tap
    // that opened the sheet sends a late click that would otherwise land here.
    <div
      className="sheet-backdrop"
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) onClose();
        downOnBackdrop.current = false;
      }}
    >
      <div
        className="sheet card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <header className="sheet-head">
          <span className="counter static" style={{ '--counter': suspectColour(suspect) } as CSSProperties} aria-hidden="true">
            {suspectInitials(suspect)}
          </span>
          <div>
            <h2 id="sheet-title">{suspectName(suspect)}</h2>
            <p className="muted">{placedLine ? `${placedLine}.` : 'Not placed yet.'}</p>
          </div>
          <button ref={closeRef} className="sheet-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>

        {clues.length ? (
          <ul className="clue-list">
            {clues.map((clue) => {
              const used = progress.used.includes(clue.id);
              return (
                <li key={clue.id}>
                  <button
                    className={`card clue ${used ? 'used' : ''}`}
                    aria-pressed={used}
                    onClick={() => dispatch({ type: 'toggle-used', clue: clue.id })}
                  >
                    {clue.text}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">No clue names {suspectName(suspect)} directly. Work them out from everyone else.</p>
        )}

        <button className="secondary" onClick={onMove}>
          {room ? 'Move to another room' : 'Place in a room'}
        </button>
      </div>
    </div>
  );
}
