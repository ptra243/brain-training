import type { Case } from '../engine/types.ts';
import { ClueCard } from './ClueCard.tsx';
import { Paw } from './games/Hints.tsx';
import { itemName, roomName, suspectName } from './names.ts';
import { SCENE_TEASER, mentions, sceneText, visibleClues, type Action, type Progress, type Subject } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  open: boolean;
  onToggle: () => void;
  /** Show only the clues about this person, room or weapon (picked from the grid's labels). */
  focus?: Subject | null;
  onClearFocus?: () => void;
  /** Ids of clues the cat's hint is pawing at. */
  pawed?: readonly string[];
}

const subjectName = (s: Subject, guests: readonly string[]) =>
  s.kind === 'suspect' ? suspectName(s.id, guests) : s.kind === 'room' ? `the ${roomName(s.id)}` : `the ${itemName(s.id)}`;

/** The clues she has found, in a drawer above the tab bar so she can read them while working the map or grid. */
export function ClueDrawer({ c, progress, dispatch, open, onToggle, focus, onClearFocus, pawed = [] }: Props) {
  // Includes what finished interrogations produced (evidence cards, true answers).
  const visible = visibleClues(c, progress);
  const shown = focus ? visible.filter((clue) => mentions(clue, focus)) : visible;
  const left = visible.filter((clue) => !progress.used.includes(clue.id)).length;
  const scene = sceneText(c, progress);

  return (
    <div className={`clue-drawer ${open ? 'open' : ''}`}>
      <button className="drawer-handle" aria-expanded={open} aria-controls="drawer-body" onClick={onToggle}>
        <span className="drawer-title">Clues</span>
        <span className="drawer-count">
          {focus
            ? `${shown.length} about ${subjectName(focus, c.guests)}`
            : visible.length
              ? `${left} of ${visible.length} still to use`
              : 'None found yet'}
        </span>
        <span className="drawer-chevron" aria-hidden="true">
          {open ? '▾' : '▴'}
        </span>
      </button>
      {open && (
        <div id="drawer-body" className="drawer-body">
          {focus ? (
            <p className="drawer-filter">
              <span>
                Showing clues about <strong>{subjectName(focus, c.guests)}</strong>
              </span>
              <button className="chip" onClick={onClearFocus}>
                Show all
              </button>
            </p>
          ) : (
            <p className="drawer-scene">{scene ?? SCENE_TEASER}</p>
          )}
          {shown.length ? (
            <ul className="clue-list">
              {shown.map((clue) => (
                <li key={clue.id} className={pawed.includes(clue.id) ? 'pawed' : undefined}>
                  {pawed.includes(clue.id) && <Paw />}
                  <ClueCard
                    clue={clue}
                    guests={c.guests}
                    compact
                    used={progress.used.includes(clue.id)}
                    onToggle={() => dispatch({ type: 'toggle-used', clue: clue.id })}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              {focus
                ? `No clue you've found so far names ${subjectName(focus, c.guests)}. Work it out from everything else.`
                : "Play tonight's puzzles on the Clues tab to find some."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
