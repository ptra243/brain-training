import type { Case } from '../engine/types.ts';
import { ClueCard } from './ClueCard.tsx';
import { sceneUnlocked, visibleClues, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  open: boolean;
  onToggle: () => void;
}

/** The clues she has found, in a drawer above the tab bar so she can read them while working the map or grid. */
export function ClueDrawer({ c, progress, dispatch, open, onToggle }: Props) {
  // Includes what finished interrogations produced (evidence cards, true answers).
  const visible = visibleClues(c, progress);
  const left = visible.filter((clue) => !progress.used.includes(clue.id)).length;
  const scene = sceneUnlocked(c, progress);

  return (
    <div className={`clue-drawer ${open ? 'open' : ''}`}>
      <button className="drawer-handle" aria-expanded={open} aria-controls="drawer-body" onClick={onToggle}>
        <span className="drawer-title">Clues</span>
        <span className="drawer-count">
          {visible.length ? `${left} of ${visible.length} still to use` : 'None found yet'}
        </span>
        <span className="drawer-chevron" aria-hidden="true">
          {open ? '▾' : '▴'}
        </span>
      </button>
      {open && (
        <div id="drawer-body" className="drawer-body">
          <p className="drawer-scene">{scene ? c.sceneClue.text : c.sceneClue.wordle.teaser}</p>
          {visible.length ? (
            <ul className="clue-list">
              {visible.map((clue) => (
                <li key={clue.id}>
                  <ClueCard
                    clue={clue}
                    compact
                    used={progress.used.includes(clue.id)}
                    onToggle={() => dispatch({ type: 'toggle-used', clue: clue.id })}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Play tonight's puzzles on the Clues tab to find some.</p>
          )}
        </div>
      )}
    </div>
  );
}
