import type { Case, GameKind } from '../engine/types.ts';
import { GAME_NAMES } from './games/GameScreen.tsx';
import { sceneUnlocked, unlockedClueIds, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  onPlay: (kind: GameKind) => void;
}

export function CluesPanel({ c, progress, dispatch, onPlay }: Props) {
  const unlocked = unlockedClueIds(c, progress);
  const visible = c.clues.filter((clue) => unlocked.has(clue.id));
  const hidden = c.clues.length - visible.length;
  const scene = sceneUnlocked(c, progress);

  return (
    <section className="panel">
      <article className="card puzzles">
        <h2>Tonight's puzzles</h2>
        <ul>
          {c.games.map((g) => {
            const status = progress.games[g.kind]?.status;
            const done = status === 'won' || status === 'revealed';
            const reward = g.unlocksScene
              ? 'Shows where the body was found'
              : `Unlocks ${g.clues.length} clue${g.clues.length === 1 ? '' : 's'}`;
            return (
              <li key={g.kind}>
                <button className={`puzzle-row ${done ? 'done' : ''}`} onClick={() => onPlay(g.kind)}>
                  <span className="puzzle-name">{GAME_NAMES[g.kind]}</span>
                  <span className="puzzle-reward">{done ? (status === 'won' ? 'Solved' : 'Solved for you') : reward}</span>
                  <span className="puzzle-action" aria-hidden="true">
                    {done ? '✓' : status === 'playing' ? 'Continue' : 'Play'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </article>

      <article className="card scene-card">
        <h2>The scene</h2>
        {scene ? (
          <p>{c.sceneClue.text}</p>
        ) : (
          <>
            <p>{c.sceneClue.wordle.teaser}</p>
            <p className="muted small">Solve the Wordle to fill in the blank.</p>
          </>
        )}
      </article>

      {visible.length > 0 && <p className="hint">Tap a clue to cross it off once you've used it.</p>}
      <ul className="clue-list">
        {visible.map((clue) => {
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
      {hidden > 0 && (
        <p className="locked-note">
          {hidden} more clue{hidden === 1 ? ' is' : 's are'} hidden in the puzzles.
        </p>
      )}
    </section>
  );
}
