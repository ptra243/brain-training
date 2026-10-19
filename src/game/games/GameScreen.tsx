import { useMemo, useState, type ReactNode } from 'react';
import { Rng } from '../../engine/rng.ts';
import { cats, content } from '../../content/index.ts';
import { caseFacts, interrogationEvidence } from '../../engine/caseFacts.ts';
import { disproves } from '../../engine/interrogation.ts';
import type { Case, GameKind, GameSpec, Interrogation } from '../../engine/types.ts';
import { generateCats, type CatPuzzle } from '../../games/cats.ts';
import type { CrosswordPuzzle } from '../../games/crossword.ts';
import type { WordSearchPuzzle } from '../../games/wordsearch.ts';
import { sceneCrossword, sceneWordSearch } from '../sceneGames.ts';
import { foundLocations, generateSudoku, locationSquares, type LocationSquares, type SudokuPuzzle } from '../../games/sudoku.ts';
import { ClueCard } from '../ClueCard.tsx';
import { Dialog } from '../Dialog.tsx';
import type { Action, InterrogationData, Progress } from '../state.ts';
import { InterrogationGame, interrogationInitial } from './InterrogationGame.tsx';
import { CatsGame, catsInitial, catsSolvedData, type CatsData } from './CatsGame.tsx';
import { SudokuGame, sudokuInitial, sudokuSolvedData, type SudokuData } from './SudokuGame.tsx';
import { WordleGame, wordleInitial, wordleSolved, type WordleData, type WordlePuzzle } from './WordleGame.tsx';
import { CrosswordGame, crosswordInitial, crosswordSolved, type CrosswordData } from './CrosswordGame.tsx';
import { WordSearchGame, wordSearchInitial, wordSearchSolved, type WordSearchData } from './WordSearchGame.tsx';

type Built =
  | { kind: 'interrogation'; puzzle: Interrogation }
  | { kind: 'wordle'; puzzle: WordlePuzzle }
  | { kind: 'crossword'; puzzle: CrosswordPuzzle }
  | { kind: 'wordsearch'; puzzle: WordSearchPuzzle }
  | { kind: 'cats'; puzzle: CatPuzzle }
  | { kind: 'sudoku'; puzzle: SudokuPuzzle; squares: Record<string, LocationSquares> };

function buildPuzzle(c: Case, spec: GameSpec): Built {
  const rng = new Rng(spec.seed);
  switch (spec.kind) {
    case 'interrogation':
    case 'finale':
      return { kind: 'interrogation', puzzle: spec.interrogation! };
    case 'wordle':
      return { kind: 'wordle', puzzle: { answer: c.sceneClue.wordle.answer, teaser: c.sceneClue.wordle.teaser } };
    case 'crossword':
      return { kind: 'crossword', puzzle: sceneCrossword(spec) };
    case 'wordsearch':
      return { kind: 'wordsearch', puzzle: sceneWordSearch(c, spec) };
    case 'cats':
      return { kind: 'cats', puzzle: generateCats(spec.size, rng, spec.easy) };
    case 'sudoku': {
      const puzzle = generateSudoku(spec.size === 9 ? 9 : 6, spec.givens ?? 0, rng);
      const targets = c.clues.filter((cl) => cl.location && spec.located?.includes(cl.id)).map((cl) => ({ id: cl.id, target: cl.location!.target }));
      return { kind: 'sudoku', puzzle, squares: locationSquares(puzzle, targets, new Rng(spec.seed ^ 0x5eed)) };
    }
  }
}

export const GAME_NAMES: Record<GameKind, string> = {
  wordle: 'Wordle',
  crossword: 'Mini crossword',
  wordsearch: 'Word search',
  cats: 'Cat puzzle',
  sudoku: 'Sudoku',
  interrogation: 'Questioning',
  finale: 'Final questioning',
};

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
  const props = { finished, helper: cats[c.number % cats.length], onChange: save, onFinish: finish };
  let view: ReactNode = null;
  let solved: () => unknown = () => null;
  switch (built.kind) {
    case 'interrogation': {
      const puzzle = built.puzzle;
      const data = (record?.data as InterrogationData) ?? interrogationInitial();
      const evidence = interrogationEvidence(c, puzzle);
      const cf = caseFacts(content.house, c);
      solved = () => ({ ...data, caught: false });
      view = (
        <InterrogationGame
          puzzle={puzzle}
          data={data}
          evidence={evidence}
          disproves={(cards, answer) => disproves(cf, cards.map((x) => x.fact), answer.answer.fact)}
          {...props}
        />
      );
      break;
    }
    case 'wordle':
      solved = () => wordleSolved(built.puzzle);
      view = <WordleGame puzzle={built.puzzle} data={(record?.data as WordleData) ?? wordleInitial()} {...props} />;
      break;
    case 'crossword':
      solved = () => crosswordSolved(built.puzzle);
      view = <CrosswordGame puzzle={built.puzzle} data={(record?.data as CrosswordData) ?? crosswordInitial()} {...props} />;
      break;
    case 'wordsearch':
      solved = () => wordSearchSolved(built.puzzle);
      view = <WordSearchGame puzzle={built.puzzle} data={(record?.data as WordSearchData) ?? wordSearchInitial()} {...props} />;
      break;
    case 'cats':
      solved = () => catsSolvedData(built.puzzle);
      view = <CatsGame puzzle={built.puzzle} data={(record?.data as CatsData) ?? catsInitial()} {...props} />;
      break;
    case 'sudoku': {
      solved = () => sudokuSolvedData(built.puzzle);
      const { puzzle, squares } = built;
      const data = (record?.data as SudokuData) ?? sudokuInitial(puzzle);
      // A statement unlocks the moment both its squares are right, even mid-game.
      const check = (d: SudokuData) => {
        const ids = foundLocations(puzzle, squares, d.grid);
        if (ids.length) dispatch({ type: 'found', clues: ids });
      };
      const statements = Object.entries(squares).map(([id, sq], i) => ({
        label: String.fromCharCode(65 + i),
        clue: c.clues.find((cl) => cl.id === id)!,
        squares: sq,
        found: progress.found.includes(id) || finished !== null,
      }));
      view = (
        <SudokuGame
          puzzle={puzzle}
          data={data}
          statements={statements}
          finished={finished}
          helper={props.helper}
          onChange={(d: SudokuData) => {
            check(d);
            save(d);
          }}
          onFinish={(status, d: SudokuData) => {
            check(d);
            finish(status, d);
          }}
        />
      );
      break;
    }
  }

  const unlocked = c.clues.filter((cl) => spec.clues.includes(cl.id));

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
          <h2>
            {finished === 'won'
              ? spec.interrogation
                ? 'The confession'
                : 'Clues unlocked'
              : spec.interrogation
                ? 'They told you anyway'
                : 'Puzzle solved for you. Clues unlocked'}
          </h2>
          <ul>
            {spec.unlocksScene && (
              <li className="scene-line" style={{ animationDelay: '120ms' }}>
                {spec.scene?.text ?? c.sceneClue.text}
              </li>
            )}
            {unlocked.map((u, i) => (
              <li key={u.id} style={{ animationDelay: `${120 + (i + 1) * 140}ms` }}>
                <ClueCard clue={u} compact />
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
