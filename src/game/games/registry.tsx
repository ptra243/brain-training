// Every minigame the casebook can open: its name, how its puzzle is built
// from the case, and its screen. Adding a game means a kind and spec in
// `src/engine/` (see `gameKinds.ts`) and an entry here; `GAMES` must cover
// every kind, so the compiler points at anything missing.

import type { ReactNode } from 'react';
import { content } from '../../content/index.ts';
import { caseFacts, interrogationEvidence } from '../../engine/caseFacts.ts';
import { disproves } from '../../engine/interrogation.ts';
import { Rng } from '../../engine/rng.ts';
import type { Case, CatsSpec, GameKind, GameSpec, Interrogation, InterrogationSpec, SceneGameSpec, SudokuSpec } from '../../engine/types.ts';
import { generateCats, type CatPuzzle } from '../../games/cats.ts';
import type { CrosswordPuzzle } from '../../games/crossword.ts';
import { foundLocations, generateSudoku, locationSquares, type LocationSquares, type SudokuPuzzle } from '../../games/sudoku.ts';
import type { WordSearchPuzzle } from '../../games/wordsearch.ts';
import { sceneCrossword, sceneWordSearch } from '../sceneGames.ts';
import type { Action, InterrogationData, Progress } from '../state.ts';
import { CatsGame, catsInitial, catsSolvedData, type CatsData } from './CatsGame.tsx';
import { CrosswordGame, crosswordInitial, crosswordSolved, type CrosswordData } from './CrosswordGame.tsx';
import { InterrogationGame, interrogationInitial } from './InterrogationGame.tsx';
import { SudokuGame, sudokuInitial, sudokuSolvedData, type SudokuData } from './SudokuGame.tsx';
import { WordleGame, wordleInitial, wordleSolved, type WordleData, type WordlePuzzle } from './WordleGame.tsx';
import { WordSearchGame, wordSearchInitial, wordSearchSolved, type WordSearchData } from './WordSearchGame.tsx';

/** What the game screen hands a game. */
export interface PlayArgs {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  /** Her saved moves, if any, in the game's own shape. */
  saved: unknown;
  finished: 'won' | 'revealed' | null;
  /** The cat who gives hints on this case. */
  helper: string;
  onChange: (data: unknown) => void;
  onFinish: (status: 'won' | 'revealed', data: unknown) => void;
}

export interface Played {
  view: ReactNode;
  /** Her moves with the answer filled in, for the Solve button. */
  solved: () => unknown;
}

/** A game with its own spec and puzzle types. */
interface Game<S extends GameSpec, P> {
  name: string;
  /** One line under its name in the word game chooser. */
  blurb?: string;
  /** Heading over the unlocked clues once it's won or solved for her. */
  titles?: { won: string; revealed: string };
  /** Builds the puzzle from the spec's seed. Called once per game screen. */
  build(c: Case, spec: S): P;
  play(puzzle: P, a: PlayArgs): Played;
}

/** Any game. `GAMES` is looked up by the spec's kind, so each entry only ever gets its own spec and puzzle. */
export type GameEntry = Game<GameSpec, unknown>;
const game = <S extends GameSpec, P>(g: Game<S, P>): GameEntry => g;

/** The props every game component takes besides its puzzle and data. */
const common = ({ finished, helper, onChange, onFinish }: PlayArgs) => ({ finished, helper, onChange, onFinish });

const DEFAULT_TITLES = { won: 'Clues unlocked', revealed: 'Puzzle solved for you. Clues unlocked' };
export const titlesOf = (entry: GameEntry) => entry.titles ?? DEFAULT_TITLES;

const questioning = (name: string) =>
  game<InterrogationSpec, Interrogation>({
    name,
    titles: { won: 'The confession', revealed: 'They told you anyway' },
    build: (_c, spec) => spec.interrogation,
    play(puzzle, a) {
      const data = (a.saved as InterrogationData | undefined) ?? interrogationInitial();
      const cf = caseFacts(content.house, a.c);
      return {
        solved: () => ({ ...data, caught: false }),
        view: (
          <InterrogationGame
            puzzle={puzzle}
            data={data}
            evidence={interrogationEvidence(a.c, puzzle)}
            disproves={(cards, answer) => disproves(cf, cards.map((x) => x.fact), answer.answer.fact)}
            finished={a.finished}
            helper={a.helper}
            onChange={a.onChange}
            onFinish={a.onFinish}
          />
        ),
      };
    },
  });

export const GAMES: Record<GameKind, GameEntry> = {
  wordle: game<SceneGameSpec, WordlePuzzle>({
    name: 'Wordle',
    blurb: 'Guess a five-letter word in six tries.',
    build: (c) => ({ answer: c.sceneClue.wordle.answer, teaser: c.sceneClue.wordle.teaser }),
    play: (puzzle, a) => ({
      solved: () => wordleSolved(puzzle),
      view: <WordleGame puzzle={puzzle} data={(a.saved as WordleData | undefined) ?? wordleInitial()} {...common(a)} />,
    }),
  }),
  crossword: game<SceneGameSpec, CrosswordPuzzle>({
    name: 'Mini crossword',
    blurb: 'Answer clues until the shaded squares spell the word.',
    build: (_c, spec) => sceneCrossword(spec),
    play: (puzzle, a) => ({
      solved: () => crosswordSolved(puzzle),
      view: <CrosswordGame puzzle={puzzle} data={(a.saved as CrosswordData | undefined) ?? crosswordInitial()} {...common(a)} />,
    }),
  }),
  wordsearch: game<SceneGameSpec, WordSearchPuzzle>({
    name: 'Word search',
    blurb: 'Find the words; the leftover letters spell it.',
    build: (c, spec) => sceneWordSearch(c, spec),
    play: (puzzle, a) => ({
      solved: () => wordSearchSolved(puzzle),
      view: <WordSearchGame puzzle={puzzle} data={(a.saved as WordSearchData | undefined) ?? wordSearchInitial()} {...common(a)} />,
    }),
  }),
  cats: game<CatsSpec, CatPuzzle>({
    name: 'Cat puzzle',
    build: (_c, spec) => generateCats(spec.size, new Rng(spec.seed), spec.easy),
    play: (puzzle, a) => ({
      solved: () => catsSolvedData(puzzle),
      view: <CatsGame puzzle={puzzle} data={(a.saved as CatsData | undefined) ?? catsInitial()} {...common(a)} />,
    }),
  }),
  sudoku: game<SudokuSpec, { puzzle: SudokuPuzzle; squares: Record<string, LocationSquares> }>({
    name: 'Sudoku',
    build(c, spec) {
      const puzzle = generateSudoku(spec.size, spec.givens, new Rng(spec.seed));
      const targets = c.clues.filter((cl) => cl.location && spec.located.includes(cl.id)).map((cl) => ({ id: cl.id, target: cl.location!.target }));
      return { puzzle, squares: locationSquares(puzzle, targets, new Rng(spec.seed ^ 0x5eed)) };
    },
    play({ puzzle, squares }, a) {
      const data = (a.saved as SudokuData | undefined) ?? sudokuInitial(puzzle);
      // A statement unlocks the moment both its squares are right, even mid-game.
      const check = (d: SudokuData) => {
        const ids = foundLocations(puzzle, squares, d.grid);
        if (ids.length) a.dispatch({ type: 'found', clues: ids });
      };
      const statements = Object.entries(squares).map(([id, sq], i) => ({
        label: String.fromCharCode(65 + i),
        clue: a.c.clues.find((cl) => cl.id === id)!,
        squares: sq,
        found: a.progress.found.includes(id) || a.finished !== null,
      }));
      return {
        solved: () => sudokuSolvedData(puzzle),
        view: (
          <SudokuGame
            puzzle={puzzle}
            data={data}
            statements={statements}
            finished={a.finished}
            helper={a.helper}
            onChange={(d: SudokuData) => {
              check(d);
              a.onChange(d);
            }}
            onFinish={(status, d: SudokuData) => {
              check(d);
              a.onFinish(status, d);
            }}
          />
        ),
      };
    },
  }),
  interrogation: questioning('Questioning'),
  finale: questioning('Final questioning'),
};
