import type { Case, GameKind } from '../engine/types.ts';
import { ClueCard } from './ClueCard.tsx';
import { GAME_NAMES } from './games/GameScreen.tsx';
import { gameDone, sceneUnlocked, unlockedClueIds, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  onPlay: (kind: GameKind) => void;
}

export function CluesPanel({ c, progress, dispatch, onPlay }: Props) {
  const unlocked = unlockedClueIds(c, progress);
  const visible = c.clues.filter((clue) => unlocked.has(clue.id));
  // Sudoku statements she hasn't pinned to the map yet: shown with blanks.
  const sudokuDone = gameDone(progress, 'sudoku');
  const waiting = sudokuDone ? [] : c.clues.filter((clue) => clue.location && !unlocked.has(clue.id));
  const hidden = c.clues.length - visible.length - waiting.length;
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

      {visible.length > 0 && <p className="hint">Every statement here is true. Tap one to cross it off once you've used it.</p>}
      <ul className="clue-list">
        {visible.map((clue) => (
          <li key={clue.id}>
            <ClueCard
              clue={clue}
              used={progress.used.includes(clue.id)}
              onToggle={() => dispatch({ type: 'toggle-used', clue: clue.id })}
            />
          </li>
        ))}
      </ul>
      {waiting.length > 0 && (
        <>
          <p className="hint">Half-heard. Fill their lettered squares in the sudoku to find out which room they mean.</p>
          <ul className="clue-list">
            {waiting.map((clue) => (
              <li key={clue.id}>
                <ClueCard clue={clue} coords={{ row: null, col: null, found: false }} />
              </li>
            ))}
          </ul>
        </>
      )}
      {hidden > 0 && (
        <p className="locked-note">
          {hidden} more clue{hidden === 1 ? ' is' : 's are'} hidden in the puzzles.
        </p>
      )}
    </section>
  );
}
