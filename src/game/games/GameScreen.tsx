import { useMemo, useState, type ReactNode } from 'react';
import { Rng } from '../../engine/rng.ts';
import type { Case, GameKind, GameSpec } from '../../engine/types.ts';
import { generateCats, type CatPuzzle } from '../../games/cats.ts';
import { generateSudoku, type SudokuPuzzle } from '../../games/sudoku.ts';
import { Dialog } from '../Dialog.tsx';
import type { Action, Progress } from '../state.ts';
import { CatsGame, catsInitial, catsSolvedData, type CatsData } from './CatsGame.tsx';
import { SudokuGame, sudokuInitial, sudokuSolvedData, type SudokuData } from './SudokuGame.tsx';
import { WordleGame, wordleInitial, wordleSolved, type WordleData, type WordlePuzzle } from './WordleGame.tsx';

type Built =
  | { kind: 'wordle'; puzzle: WordlePuzzle }
  | { kind: 'cats'; puzzle: CatPuzzle }
  | { kind: 'sudoku'; puzzle: SudokuPuzzle };

function buildPuzzle(c: Case, spec: GameSpec): Built {
  const rng = new Rng(spec.seed);
  switch (spec.kind) {
    case 'wordle':
      return { kind: 'wordle', puzzle: { answer: c.sceneClue.wordle.answer, teaser: c.sceneClue.wordle.teaser } };
    case 'cats':
      return { kind: 'cats', puzzle: generateCats(spec.size, rng) };
    case 'sudoku':
      return { kind: 'sudoku', puzzle: generateSudoku(spec.size === 9 ? 9 : 6, spec.givens ?? 0, rng) };
  }
}

export const GAME_NAMES: Record<GameKind, string> = { wordle: 'Wordle', cats: 'Cat puzzle', sudoku: 'Sudoku' };

interface Props {
  c: Case;
  spec: GameSpec;
  progress: Progress;
  dispatch: (a: Action) => void;
  onBack: () => void;
}

export function GameScreen({ c, spec, progress, dispatch, onBack }: Props) {
  const [confirming, setConfirming] = useState(false);
  const record = progress.games[spec.kind];
  const finished = record && record.status !== 'playing' ? record.status : null;

  const save = (data: unknown) => dispatch({ type: 'game-save', kind: spec.kind, data });
  const finish = (status: 'won' | 'revealed', data: unknown) => {
    dispatch({ type: 'game-finish', kind: spec.kind, status, data });
    window.scrollTo({ top: 0 });
  };

  // The puzzle is rebuilt from the seed once per game; only her moves are saved.
  const built = useMemo(() => buildPuzzle(c, spec), [c, spec]);
  const props = { finished, onChange: save, onFinish: finish };
  let view: ReactNode = null;
  let solved: () => unknown = () => null;
  switch (built.kind) {
    case 'wordle':
      solved = () => wordleSolved(built.puzzle);
      view = <WordleGame puzzle={built.puzzle} data={(record?.data as WordleData) ?? wordleInitial()} {...props} />;
      break;
    case 'cats':
      solved = () => catsSolvedData(built.puzzle);
      view = <CatsGame puzzle={built.puzzle} data={(record?.data as CatsData) ?? catsInitial()} {...props} />;
      break;
    case 'sudoku':
      solved = () => sudokuSolvedData(built.puzzle);
      view = (
        <SudokuGame puzzle={built.puzzle} data={(record?.data as SudokuData) ?? sudokuInitial(built.puzzle)} {...props} />
      );
      break;
  }

  const unlocked = [
    ...(spec.unlocksScene ? [{ id: 'scene', text: c.sceneClue.text }] : []),
    ...c.clues.filter((cl) => spec.clues.includes(cl.id)),
  ];

  return (
    <div className="game-screen">
      <header className="game-header">
        <button className="step" aria-label="Back to the casebook" onClick={onBack}>
          ‹
        </button>
        <h1>{GAME_NAMES[spec.kind]}</h1>
        {!finished ? (
          <button className="solve-link" onClick={() => setConfirming(true)}>
            Solve
          </button>
        ) : (
          <span />
        )}
      </header>

      {finished && (
        <section className="unlocked card" aria-live="polite">
          <h2>{finished === 'won' ? 'Clues unlocked' : 'Puzzle solved for you. Clues unlocked'}</h2>
          <ul>
            {unlocked.map((u, i) => (
              <li key={u.id} style={{ animationDelay: `${120 + i * 140}ms` }}>
                {u.text}
              </li>
            ))}
          </ul>
          <button className="primary" onClick={onBack}>
            Back to the casebook
          </button>
        </section>
      )}

      <div className="game-body">{view}</div>

      {confirming && (
        <Dialog placement="center" labelId="solve-title" onClose={() => setConfirming(false)}>
          <h2 id="solve-title">Solve this puzzle?</h2>
          <p className="dialog-text">Are you sure? This can't be undone. You'll see the answer and still get the clues.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep playing
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                finish('revealed', solved());
              }}
            >
              Solve it
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
