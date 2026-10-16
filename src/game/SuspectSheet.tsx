import type { CSSProperties } from 'react';
import type { Case } from '../engine/types.ts';
import { itemName, roomName, suspectColour, suspectInitials, suspectName } from './names.ts';
import { ClueCard } from './ClueCard.tsx';
import { Dialog } from './Dialog.tsx';
import { heldItem, mentionsSuspect, placedRoom, visibleClues, type Action, type Progress } from './state.ts';

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
  const clues = visibleClues(c, progress).filter((clue) => mentionsSuspect(clue, suspect));
  const room = placedRoom(c, progress, suspect);
  const item = heldItem(c, progress, suspect);

  const placedLine = [room && `You've placed them in the ${roomName(room)}`, item && `with the ${itemName(item)}`]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog onClose={onClose} labelId="sheet-title">
        <header className="sheet-head">
          <span className="counter static" style={{ '--counter': suspectColour(suspect) } as CSSProperties} aria-hidden="true">
            {suspectInitials(suspect)}
          </span>
          <div>
            <h2 id="sheet-title">{suspectName(suspect)}</h2>
            <p className="muted">{placedLine ? `${placedLine}.` : 'Not placed yet.'}</p>
          </div>
          <button data-autofocus className="sheet-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>

        {clues.length ? (
          <ul className="clue-list">
            {clues.map((clue) => (
              <li key={clue.id}>
                <ClueCard
                  clue={clue}
                  used={progress.used.includes(clue.id)}
                  onToggle={() => dispatch({ type: 'toggle-used', clue: clue.id })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No clue you've found so far names {suspectName(suspect)}. Play the games to unlock more, or work them out from everyone else.</p>
        )}

        <button className="secondary" onClick={onMove}>
          {room ? 'Move to another room' : 'Place in a room'}
        </button>
    </Dialog>
  );
}
