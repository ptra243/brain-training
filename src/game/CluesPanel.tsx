import type { Case } from '../engine/types.ts';
import type { Action, Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
}

export function CluesPanel({ c, progress, dispatch }: Props) {
  return (
    <section className="panel">
      <p className="hint">Every clue is shown until the minigames are built. Tap a clue to cross it off once you've used it.</p>
      <article className="card scene-card">
        <h2>The scene</h2>
        <p>{c.sceneClue.text}</p>
      </article>
      <ul className="clue-list">
        {c.clues.map((clue) => {
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
    </section>
  );
}
