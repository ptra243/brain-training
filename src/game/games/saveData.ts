import type { CatMark, CatPuzzle } from '../../games/cats.ts';
import { fullLetters, type CrosswordPuzzle } from '../../games/crossword.ts';
import type { SudokuPuzzle } from '../../games/sudoku.ts';
import type { WordSearchPuzzle } from '../../games/wordsearch.ts';
import type { InterrogationData } from '../state.ts';
import type { WordlePuzzle } from './WordleGame.tsx';

export interface CatsData {
  /** Key "r,c". Tap cycles blank -> dot -> cat -> blank. */
  marks: Record<string, CatMark>;
  /** Wrong marks a hint has crossed in red, keyed "r,c". Shown while the mark is unchanged. */
  flagged?: Record<string, CatMark>;
  /** `catMoveId` of the move the last hint pointed at. */
  nudged?: string;
  /** `catMoveId` of the move whose reason a hint gave. */
  explained?: string;
  /** How many hints she asked for. */
  hints?: number;
}

export const catsInitial = (): CatsData => ({ marks: {} });
export const catsSolvedData = (p: CatPuzzle): CatsData => ({
  marks: Object.fromEntries(p.solution.map((c, r) => [`${r},${c}`, 'cat' as const])),
});

export interface CrosswordData {
  /** Her letters, keyed "r,c". */
  letters: Record<string, string>;
  /** Wrong letters a hint has crossed in red, keyed "r,c". Shown while the letter is unchanged. */
  flagged?: Record<string, string>;
  /** The word the last hint pointed at ("3 down"). */
  nudged?: string;
  /** How many hints she asked for. */
  hints?: number;
  /** Grid size the letters were typed on. Saves from before grids grew have none (7). */
  size?: number;
}

export const crosswordInitial = (): CrosswordData => ({ letters: {} });
export const crosswordSolved = (p: CrosswordPuzzle): CrosswordData => ({ letters: fullLetters(p), size: p.width });

export interface SudokuData {
  /** Row-major digits, 0 = empty. Givens are included. */
  grid: number[];
  /** Wrong numbers a hint has crossed in red, by square. Shown while the number is unchanged. */
  flagged?: Record<number, number>;
  /** The square the last hint sat on. */
  nudged?: number;
  /** The square whose reason a hint gave. */
  explained?: number;
  /** How many hints she asked for. */
  hints?: number;
  /** Her pencil marks per square (sorted digits). Absent key = never edited. */
  notes?: Record<number, number[]>;
  /** Show the possible numbers in squares she hasn't marked herself. */
  showCandidates?: boolean;
}

export const sudokuInitial = (p: SudokuPuzzle): SudokuData => ({ grid: p.givens.slice() });
export const sudokuSolvedData = (p: SudokuPuzzle): SudokuData => ({ grid: p.solution.slice() });

export interface WordSearchData {
  /** Listed words she has found. */
  found: string[];
}

export const wordSearchInitial = (): WordSearchData => ({ found: [] });
export const wordSearchSolved = (p: WordSearchPuzzle): WordSearchData => ({ found: p.words.map((w) => w.word) });

export interface WordleData {
  guesses: string[];
}

export const wordleInitial = (): WordleData => ({ guesses: [] });
export const wordleSolved = (p: WordlePuzzle): WordleData => ({ guesses: [p.answer] });

export const interrogationInitial = (): InterrogationData => ({ asked: [], strikes: 0, caught: false });
