import { useState } from 'react';
import type { Case, GameKind, GameSpec } from '../engine/types.ts';
import { DIFFICULTY_LABEL } from './Casebook.tsx';
import { Dialog } from './Dialog.tsx';
import { GAMES } from './games/registry.tsx';
import { allGamesDone, cluesToFind, finaleOpen, gameDone, puzzlesDone, unfinishedGames, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  readOnly?: boolean;
  onPlay: (kind: GameKind) => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function LevelChip({ spec }: { spec: GameSpec }) {
  return spec.level ? <span className="level-chip">{DIFFICULTY_LABEL[spec.level]}</span> : null;
}

/** Play cases: the "Get a clue" button, the case's games, and the sheet that picks the next one. */
export function GetClue({ c, progress, readOnly, onPlay }: Props) {
  const [picking, setPicking] = useState(false);
  const { done, total } = puzzlesDone(c, progress);
  const everything = allGamesDone(c, progress);
  const left = unfinishedGames(c, progress);

  return (
    <>
      <article className="card puzzles">
        <button className="primary" disabled={everything || readOnly} onClick={() => setPicking(true)}>
          {everything ? 'No more clues' : 'Get a clue'}
        </button>
        <p className="muted small get-clue-note">
          {everything
            ? 'You have every clue. Finish on the grid or the jigsaw.'
            : `${done} of ${total} games played · ${plural(cluesToFind(c, progress), 'clue')} to find`}
        </p>
        <ul className="game-list">
          {c.games.map((g) => {
            const finished = gameDone(progress, g.kind);
            const inner = (
              <>
                <span>{GAMES[g.kind].name}</span>
                <LevelChip spec={g} />
                {finished && (
                  <span className="tick" aria-label="Played">
                    ✓
                  </span>
                )}
              </>
            );
            return (
              <li key={g.kind}>
                {finished ? (
                  <button className="game-open" onClick={() => onPlay(g.kind)}>
                    {inner}
                  </button>
                ) : (
                  <span className="game-open muted">{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
      </article>

      {picking && (
        <Dialog labelId="pick-game-title" onClose={() => setPicking(false)}>
          <h2 id="pick-game-title">Pick a game</h2>
          <ul className="scene-choices">
            {left.map((g) => {
              const locked = g.kind === 'finale' && !finaleOpen(c, progress);
              const playing = progress.games[g.kind]?.status === 'playing';
              return (
                <li key={g.kind}>
                  <button
                    className={`puzzle-row ${locked ? 'locked' : ''}`}
                    disabled={locked}
                    onClick={() => {
                      setPicking(false);
                      onPlay(g.kind);
                    }}
                  >
                    <span className="puzzle-name">
                      {GAMES[g.kind].name} <LevelChip spec={g} />
                    </span>
                    <span className="puzzle-reward">
                      {GAMES[g.kind].blurb}{' '}
                      {locked ? 'Opens when the other games are done.' : `Unlocks ${plural(g.clues.length, 'clue')}.`}
                    </span>
                    <span className="puzzle-action" aria-hidden="true">
                      {locked ? 'Later' : playing ? 'Continue' : 'Play'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog>
      )}
    </>
  );
}
