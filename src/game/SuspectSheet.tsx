import type { CSSProperties } from 'react';
import type { Case, GameKind } from '../engine/types.ts';
import { itemName, roomName, suspectColour, suspectName, faceClass } from './names.ts';
import { SuspectCounterFace } from './SuspectCounterFace.tsx';
import { ClueCard } from './ClueCard.tsx';
import { Dialog } from './Dialog.tsx';
import { TalkSection } from './TalkSection.tsx';
import { heldItem, mentionsSuspect, placedRoom, visibleClues, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  suspect: string;
  onClose: () => void;
  /** Start "tap a room to place" for this suspect. */
  onMove: () => void;
  /** Open their questioning game (left out where games can't be opened). */
  onQuestion?: (kind: GameKind) => void;
}

/** Card that slides up over the map with the clues naming one suspect. */
export function SuspectSheet({ c, progress, dispatch, suspect, onClose, onMove, onQuestion }: Props) {
  const clues = visibleClues(c, progress).filter((clue) => mentionsSuspect(clue, suspect));
  const room = placedRoom(c, progress, suspect);
  const item = heldItem(c, progress, suspect);

  const placedLine = [room && `You've placed them in the ${roomName(room)}`, item && `with the ${itemName(item)}`]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog onClose={onClose} labelId="sheet-title">
        <header className="sheet-head">
          <span className={`counter static${faceClass(suspect)}`} style={{ '--counter': suspectColour(suspect) } as CSSProperties} aria-hidden="true">
            <SuspectCounterFace id={suspect} guests={c.guests} />
          </span>
          <div>
            <h2 id="sheet-title">{suspectName(suspect, c.guests)}</h2>
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
                  guests={c.guests}
                  used={progress.used.includes(clue.id)}
                  onToggle={() => dispatch({ type: 'toggle-used', clue: clue.id })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No clue you've found so far names {suspectName(suspect, c.guests)}. Play the games to unlock more, or work them out from everyone else.</p>
        )}

        <TalkSection c={c} progress={progress} dispatch={dispatch} suspect={suspect} onQuestion={onQuestion} />

        <button className="secondary" onClick={onMove}>
          {room ? 'Move to another room' : 'Place in a room'}
        </button>
    </Dialog>
  );
}
