import { useMemo, useState } from 'react';
import { caseOpenings } from '../content/index.ts';
import { Rng, hashSeed } from '../engine/rng.ts';
import type { Case, GameKind, GameSpec } from '../engine/types.ts';
import { DIFFICULTY_LABEL } from './labels.ts';
import { Dialog } from './Dialog.tsx';
import { victimLine } from './names.ts';
import { GAMES } from './games/registry.tsx';
import { allGamesDone, cluesToFind, finaleOpen, gameDone, puzzlesDone, unfinishedGames, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  readOnly?: boolean;
  onPlay: (kind: GameKind) => void;
}

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** Fills `{count}` with the guests in words, capitalised where it starts a sentence. */
function fillOpening(text: string, guests: number): string {
  const word = COUNT_WORDS[guests] ?? String(guests);
  return text.replace(/\{count\}/g, (_m, at: number) => {
    const starts = at === 0 || text.slice(at - 2, at) === '. ';
    return starts ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function LevelChip({ spec }: { spec: GameSpec }) {
  return spec.level ? <span className="level-chip">{DIFFICULTY_LABEL[spec.level]}</span> : null;
}

/** Play cases: the opening, the "Get a clue" button, and the sheet that picks a game. */
export function GetClue({ c, progress, readOnly, onPlay }: Props) {
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<GameKind | null>(null);
  const { done, total } = puzzlesDone(c, progress);
  const everything = allGamesDone(c, progress);
  const left = unfinishedGames(c, progress);
  const played = c.games.filter((g) => gameDone(progress, g.kind));
  const opening = useMemo(
    () => fillOpening(new Rng(hashSeed(`${c.seed}-opening`)).pick(caseOpenings), c.suspects.length),
    [c.seed, c.suspects.length],
  );

  return (
    <>
      <article className="card puzzles">
        <p className="case-victim">{victimLine(c)}</p>
        <p className="case-opening">{opening}</p>
        <p className="muted small get-clue-help">
          {everything
            ? 'You have every clue. Finish on the grid or the jigsaw.'
            : "Play a game to find a clue. You don't need to play them all: stop once you can name who did it."}
        </p>
        <button className="primary" disabled={everything || readOnly} onClick={() => setPicking(true)}>
          {everything ? 'No more clues' : 'Get a clue'}
        </button>
        <p className="muted small get-clue-note">
          {done} of {total} games played · {plural(cluesToFind(c, progress), 'clue')} to find
        </p>
        {everything && !readOnly && (
          <button className="link-button" onClick={() => setPicking(true)}>
            Look at a played game
          </button>
        )}
      </article>

      {picking && (
        <Dialog labelId="pick-game-title" onClose={() => setPicking(false)}>
          <h2 id="pick-game-title">Pick a game</h2>
          <ul className="scene-choices pick-game-list">
            {left.map((g) => {
              const locked = g.kind === 'finale' && !finaleOpen(c, progress);
              const playing = progress.games[g.kind]?.status === 'playing';
              const selected = chosen === g.kind && !locked;
              return (
                <li key={g.kind}>
                  <button
                    className={`puzzle-row ${locked ? 'locked' : ''} ${selected ? 'selected' : ''}`}
                    disabled={locked}
                    aria-pressed={selected}
                    onClick={() => setChosen(selected ? null : g.kind)}
                  >
                    <span className="puzzle-name">
                      {GAMES[g.kind].name} <LevelChip spec={g} />
                    </span>
                    <span className="puzzle-reward">
                      {GAMES[g.kind].blurb}{' '}
                      {locked ? 'Opens when the other games are done.' : `Unlocks ${plural(g.clues.length, 'clue')}.`}
                    </span>
                    <span className="puzzle-action" aria-hidden="true">
                      {locked ? 'Later' : selected ? 'Chosen' : 'Choose'}
                    </span>
                  </button>
                  {selected && (
                    <div className="puzzle-help">
                      <p>{GAMES[g.kind].help}</p>
                      <button
                        className="primary"
                        onClick={() => {
                          setPicking(false);
                          onPlay(g.kind);
                        }}
                      >
                        {playing ? 'Continue' : 'Play'} {GAMES[g.kind].name}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
            {played.map((g) => (
              <li key={g.kind}>
                <button
                  className="puzzle-row done"
                  onClick={() => {
                    setPicking(false);
                    onPlay(g.kind);
                  }}
                >
                  <span className="puzzle-name">
                    {GAMES[g.kind].name} <LevelChip spec={g} />
                  </span>
                  <span className="puzzle-reward">{progress.games[g.kind]?.status === 'revealed' ? 'Solved for you' : 'Solved'}</span>
                  <span className="puzzle-action" aria-hidden="true">
                    ✓
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </>
  );
}
