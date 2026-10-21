import { useMemo, type CSSProperties } from 'react';
import { talk } from '../content/talk.ts';
import type { Case, GameKind } from '../engine/types.ts';
import { greeting, questioningOf, readyBeats, setsFor } from './talk.ts';
import { itemName, roomName, suspectColour, suspectInitials, suspectName } from './names.ts';
import { ClueCard } from './ClueCard.tsx';
import { Dialog } from './Dialog.tsx';
import { gameDone, heldItem, mentionsSuspect, placedRoom, visibleClues, type Action, type Progress } from './state.ts';

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
  const set = useMemo(() => setsFor(c)[suspect], [c, suspect]);
  const heard = progress.talk?.[suspect] ?? 0;
  const ready = readyBeats(c, progress, suspect, set.thread.length);
  const questioning = questioningOf(c, suspect);
  const question = questioning && !gameDone(progress, questioning.kind) && onQuestion ? questioning : undefined;
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

        <section className="talk" aria-labelledby="talk-title">
          <h3 id="talk-title">Talk</h3>
          <p className="talk-greeting">“{greeting(set, heard, talk.greetings)}”</p>
          <div className="talk-pips" role="img" aria-label={`${heard} of ${set.thread.length} heard`}>
            {set.thread.map((_, i) => (
              <span key={i} className={`pip ${i < heard ? 'filled' : ''}`} />
            ))}
          </div>
          {heard > 0 && (
            <ol className="talk-log">
              {set.thread.slice(0, heard).map((beat) => (
                <li key={beat}>{beat}</li>
              ))}
            </ol>
          )}
          {heard < set.thread.length &&
            (ready > heard ? (
              <button className="secondary" onClick={() => dispatch({ type: 'talk-hear', suspect })}>
                Anything else?
              </button>
            ) : (
              <p className="muted">Nothing more to say yet.</p>
            ))}
          {question && (
            <button className="secondary" onClick={() => onQuestion?.(question.kind)}>
              Question them
            </button>
          )}
        </section>

        <button className="secondary" onClick={onMove}>
          {room ? 'Move to another room' : 'Place in a room'}
        </button>
    </Dialog>
  );
}
