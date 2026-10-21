// Every minigame the casebook can open: its name, how its puzzle is built
// from the case, and its screen. Adding a game means a kind and spec in
// `src/engine/` (see `gameKinds.ts`) and an entry here; `GAMES` must cover
// every kind, so the compiler points at anything missing.

import type { ReactNode } from 'react';
import { content } from '../../content/index.ts';
import type { Board } from '../../engine/boardTypes.ts';
import { boardPuzzle } from '../../engine/caseBoard.ts';
import { caseFacts, interrogationEvidence } from '../../engine/caseFacts.ts';
import { disproves } from '../../engine/interrogation.ts';
import { Rng } from '../../engine/rng.ts';
import type { BoardSpec, Case, CatsSpec, GameKind, GameSpec, Interrogation, InterrogationSpec, NosingSpec, SceneGameSpec, SudokuSpec, TarotSpec } from '../../engine/types.ts';
import { tarotClueCards } from '../../engine/tarotCards.ts';
import { generateCats, type CatPuzzle } from '../../games/cats.ts';
import { nosingLadders, nosingSnakes } from '../../content/nosing.ts';
import { buildNosing, nosingInitial, nosingSeed, nosingSolve, type NosingPuzzle, type NosingState } from '../../games/nosing.ts';
import { buildTarot, tarotInitial, tarotRevealAll, type TarotState } from '../../games/tarot.ts';
import type { CrosswordPuzzle } from '../../games/crossword.ts';
import { foundLocations, generateSudoku, locationSquares, type LocationSquares, type SudokuPuzzle } from '../../games/sudoku.ts';
import type { WordSearchPuzzle } from '../../games/wordsearch.ts';
import { CaseBoard, type BoardSave } from '../board/CaseBoard.tsx';
import { boardInitial, boardSolvedSave } from '../board/boardSave.ts';
import { sceneCrossword, sceneWordSearch } from '../sceneGames.ts';
import type { Action, InterrogationData, Progress } from '../state.ts';
import { CatsGame } from './CatsGame.tsx';
import { CrosswordGame } from './CrosswordGame.tsx';
import { InterrogationGame } from './InterrogationGame.tsx';
import { SudokuGame } from './SudokuGame.tsx';
import { NosingGame } from './NosingGame.tsx';
import { TarotGame, type TarotPuzzle } from './TarotGame.tsx';
import { WordleGame } from './WordleGame.tsx';
import { WordSearchGame } from './WordSearchGame.tsx';
import {
  catsInitial,
  catsSolvedData,
  crosswordInitial,
  crosswordSolved,
  interrogationInitial,
  sudokuInitial,
  sudokuSolvedData,
  wordSearchInitial,
  wordSearchSolved,
  wordleInitial,
  wordleSolved,
  type CatsData,
  type CrosswordData,
  type SudokuData,
  type WordSearchData,
  type WordleData,
} from './saveData.ts';
import type { WordlePuzzle } from './WordleGame.tsx';

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
  /** One line under its name in the game pickers. */
  blurb: string;
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

const questioning = (name: string, blurb: string) =>
  game<InterrogationSpec, Interrogation>({
    name,
    blurb,
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
    // Play cases hide the game's own word and show its half-heard clue above the board instead of a teaser.
    build: (c, spec) =>
      c.sceneGiven ? { answer: spec.scene.answer } : { answer: c.sceneClue.wordle.answer, teaser: c.sceneClue.wordle.teaser },
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
    blurb: 'Place the cats where the clues allow.',
    build: (_c, spec) => generateCats(spec.size, new Rng(spec.seed), spec.easy),
    play: (puzzle, a) => ({
      solved: () => catsSolvedData(puzzle),
      view: <CatsGame puzzle={puzzle} data={(a.saved as CatsData | undefined) ?? catsInitial()} {...common(a)} />,
    }),
  }),
  sudoku: game<SudokuSpec, { puzzle: SudokuPuzzle; squares: Record<string, LocationSquares>; finish: string[] }>({
    name: 'Sudoku',
    blurb: 'Fill the grid; some squares point to rooms.',
    build(c, spec) {
      const puzzle = generateSudoku(spec.size, spec.givens, new Rng(spec.seed));
      const targets = c.clues.filter((cl) => cl.location && spec.located.includes(cl.id)).map((cl) => ({ id: cl.id, target: cl.location!.target }));
      const squares = locationSquares(puzzle, targets, new Rng(spec.seed ^ 0x5eed));
      // Clues for finishing the grid: everything this game gives that has no squares.
      return { puzzle, squares, finish: spec.clues.filter((id) => !(id in squares)) };
    },
    play({ puzzle, squares, finish }, a) {
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
            finishClues={finish.map((id) => a.c.clues.find((cl) => cl.id === id)).filter((cl) => cl !== undefined)}
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
  interrogation: questioning('Questioning', 'Question a guest and catch the lie.'),
  finale: questioning('Final questioning', 'One last round of questions.'),
  board: game<BoardSpec, Board>({
    name: 'Case board',
    blurb: 'Fit the clues together as a jigsaw.',
    titles: { won: 'What the pieces proved', revealed: 'Solved for you. What the pieces proved' },
    build(c, spec) {
      const board = boardPuzzle(content, c, spec);
      // The generator only hands a case this game when its board builds.
      if (!board) throw new Error(`Case ${c.code}: no case board for these clues`);
      return board;
    },
    play: (board, a) => {
      // Play cases roll a level for this game; every other case uses its minigame level.
      const level = a.c.games.find((g) => g.kind === 'board')?.level ?? a.c.levels.minigames;
      return {
        solved: () => boardSolvedSave(board, level),
        view: (
          <CaseBoard
            board={board}
            level={level}
            c={a.c}
            save={(a.saved as BoardSave | undefined) ?? boardInitial()}
            onChange={a.onChange}
            finished={a.finished !== null}
            helper={a.helper}
            intro={
              <p className="muted">
                Your free clues and this puzzle's own clues, as pieces. Its own pieces stay blank until you finish: the only way
                everything fits proves what they say.
              </p>
            }
            onComplete={(s) => a.onFinish('won', s)}
          />
        ),
      };
    },
  }),
  // The board is dealt once from the spec's seed; the screen is built in the next piece.
  tarot: game<TarotSpec, TarotPuzzle>({
    name: 'Tarot match',
    blurb: 'Turn the cards over and find the pairs.',
    build(c, spec) {
      const mine = c.clues.filter((cl) => spec.clues.includes(cl.id)).map((cl) => cl.fact);
      const others = c.clues.filter((cl) => !spec.clues.includes(cl.id)).map((cl) => cl.fact);
      const { deck, reward, other } = tarotClueCards(c, mine, others);
      return { board: buildTarot(deck, { reward, other }, spec.pairs, new Rng(spec.seed)), seed: spec.seed };
    },
    play: (puzzle, a) => {
      const data = (a.saved as TarotState | undefined) ?? tarotInitial();
      return {
        solved: () => tarotRevealAll(puzzle.board, data),
        view: <TarotGame puzzle={puzzle} data={data} {...common(a)} />,
      };
    },
  }),
  nosing: game<NosingSpec, NosingPuzzle>({
    name: 'Nosing around',
    blurb: 'Follow the cat round the house, with sums on the way.',
    build: (c, spec) =>
      buildNosing({
        house: content.house,
        seed: nosingSeed(spec.seed),
        level: spec.level!,
        sceneRoom: c.sceneRoom,
        clues: spec.clues.slice(),
        ladders: nosingLadders,
        snakes: nosingSnakes,
      }),
    play(puzzle, a) {
      const data = (a.saved as NosingState | undefined) ?? nosingInitial();
      return {
        solved: () => nosingSolve(puzzle, data),
        view: (
          <NosingGame
            puzzle={puzzle}
            data={data}
            // Search clues unlock the moment they are found, like sudoku's statements.
            onFound={(clues) => {
              if (clues.length) a.dispatch({ type: 'found', clues });
            }}
            {...common(a)}
          />
        ),
      };
    },
  }),
};
