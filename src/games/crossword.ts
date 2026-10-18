// Mini crossword: clued across and down words that cross each other in a
// small grid. Some squares are shaded and numbered 1, 2, 3...; in that
// order their letters spell the hidden word. She wins the moment every shaded
// square is right, so she can stop early once she's guessed the word.

import type { Rng } from '../engine/rng.ts';

export interface ClueWordLike {
  word: string;
  clue: string;
}

export type Direction = 'across' | 'down';

export interface CrosswordEntry {
  word: string;
  clue: string;
  dir: Direction;
  /** Square of the first letter. */
  row: number;
  col: number;
  /** Crossword number, shared by an across and a down that start in the same square. */
  number: number;
}

export interface CrosswordPuzzle {
  answer: string;
  width: number;
  height: number;
  /** Across entries first, then down, each in number order. */
  entries: readonly CrosswordEntry[];
  /** Shaded squares, one per letter of `answer`, in answer order. */
  shaded: readonly (readonly [number, number])[];
}

/** Fits 7 squares across a 360px phone at 44px each, and leaves room for the keyboard below. */
export const CROSSWORD_SIZE = 7;
const MIN_WORDS = 6;
const MAX_WORDS = 10;
const ATTEMPTS = 400;

export const cellKey = (r: number, c: number) => `${r},${c}`;

/** The squares an entry covers, in order. */
export function entryCells(e: Pick<CrosswordEntry, 'word' | 'dir' | 'row' | 'col'>): [number, number][] {
  return [...e.word].map((_, i) => (e.dir === 'across' ? [e.row, e.col + i] : [e.row + i, e.col]));
}

interface Placed extends ClueWordLike {
  dir: Direction;
  row: number;
  col: number;
}

class Board {
  letters = new Map<string, string>();
  across = new Set<string>();
  down = new Set<string>();
  words: Placed[] = [];
  readonly size: number;
  constructor(size: number) {
    this.size = size;
  }

  at(r: number, c: number) {
    return this.letters.get(cellKey(r, c));
  }

  /** Squares where `word` would cross what's there, or -1 if it can't go here. */
  crossings(word: string, dir: Direction, row: number, col: number): number {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    const endR = row + dr * (word.length - 1);
    const endC = col + dc * (word.length - 1);
    if (row < 0 || col < 0 || endR >= this.size || endC >= this.size) return -1;
    // Nothing directly before or after, or the word would run on.
    if (this.at(row - dr, col - dc) || this.at(endR + dr, endC + dc)) return -1;
    const same = dir === 'across' ? this.across : this.down;
    let crossed = 0;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const here = this.at(r, c);
      if (here) {
        if (here !== word[i] || same.has(cellKey(r, c))) return -1;
        crossed++;
      } else if (this.at(r - dc, c - dr) || this.at(r + dc, c + dr)) {
        // A new square beside another letter would make a stray two-letter word.
        return -1;
      }
    }
    return crossed;
  }

  place(w: ClueWordLike, dir: Direction, row: number, col: number) {
    const same = dir === 'across' ? this.across : this.down;
    for (const [r, c] of entryCells({ word: w.word, dir, row, col })) {
      this.letters.set(cellKey(r, c), w.word[r - row + c - col]);
      same.add(cellKey(r, c));
    }
    this.words.push({ ...w, dir, row, col });
  }
}

/** Every (word, position) holding each letter. */
type LetterIndex = Map<string, { w: ClueWordLike; i: number }[]>;

function indexLetters(pool: readonly ClueWordLike[]): LetterIndex {
  const out: LetterIndex = new Map();
  for (const w of pool) {
    [...w.word].forEach((letter, i) => {
      const list = out.get(letter) ?? [];
      list.push({ w, i });
      out.set(letter, list);
    });
  }
  return out;
}

/** One attempt at an interlocking grid: start with a long word and keep crossing it. */
function buildBoard(pool: readonly ClueWordLike[], byLetter: LetterIndex, size: number, answer: string, rng: Rng): Board {
  const board = new Board(size);
  const starters = pool.filter((w) => w.word.length >= 5);
  const first = rng.pick(starters);
  const dir: Direction = rng.int(2) ? 'across' : 'down';
  const along = rng.int(size - first.word.length + 1);
  const across = rng.int(size);
  board.place(first, dir, dir === 'across' ? across : along, dir === 'across' ? along : across);

  const target = MIN_WORDS + rng.int(MAX_WORDS - MIN_WORDS + 1);
  while (board.words.length < target) {
    const used = new Set(board.words.map((w) => w.word));
    // Letters the hidden word still needs: favour words that bring them.
    const missing = [...answer];
    for (const l of board.letters.values()) {
      const k = missing.indexOf(l);
      if (k >= 0) missing.splice(k, 1);
    }
    const filled = [...board.letters];
    const options: { w: ClueWordLike; dir: Direction; row: number; col: number; score: number }[] = [];
    // Random probes are much cheaper than trying every word at every square, and plenty for a 7×7 grid.
    for (let probe = 0; probe < 800 && options.length < 12; probe++) {
      const [key, letter] = filled[rng.int(filled.length)];
      const fits = byLetter.get(letter);
      if (!fits) continue;
      const { w, i } = fits[rng.int(fits.length)];
      if (used.has(w.word)) continue;
      const [r, c] = key.split(',').map(Number);
      const d: Direction = rng.int(2) ? 'across' : 'down';
      const row = d === 'down' ? r - i : r;
      const col = d === 'across' ? c - i : c;
      const crossed = board.crossings(w.word, d, row, col);
      if (crossed <= 0) continue;
      const need = missing.slice();
      let brings = 0;
      for (const l of w.word) {
        const k = need.indexOf(l);
        if (k >= 0) {
          need.splice(k, 1);
          brings++;
        }
      }
      options.push({ w, dir: d, row, col, score: crossed * 3 + w.word.length + brings * 4 + rng.next() * 2 });
    }
    if (!options.length) break;
    const best = options.reduce((a, b) => (b.score > a.score ? b : a));
    board.place(best.w, best.dir, best.row, best.col);
  }
  return board;
}

/**
 * One shaded square per letter of `answer`, in answer order. Spread over as
 * many different words as possible so no single answer gives it away. Null
 * if the grid hasn't got the letters.
 */
function pickShaded(board: Board, answer: string, rng: Rng): [number, number][] | null {
  const free = rng.shuffle([...board.letters.keys()]);
  const wordsAt = (key: string) => board.words.filter((w) => entryCells(w).some(([r, c]) => cellKey(r, c) === key));
  const usedWords = new Set<Placed>();
  const out: [number, number][] = [];
  for (const letter of answer) {
    const options = free.filter((k) => board.letters.get(k) === letter);
    if (!options.length) return null;
    const fresh = options.find((k) => wordsAt(k).every((w) => !usedWords.has(w))) ?? options[0];
    free.splice(free.indexOf(fresh), 1);
    for (const w of wordsAt(fresh)) usedWords.add(w);
    out.push(fresh.split(',').map(Number) as [number, number]);
  }
  return out;
}

/** Number squares where an across or down word starts, in reading order. */
function numbered(board: Board): CrosswordEntry[] {
  const starts = [...new Set(board.words.map((w) => cellKey(w.row, w.col)))].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    return ar - br || ac - bc;
  });
  const entries = board.words.map((w) => ({ ...w, number: starts.indexOf(cellKey(w.row, w.col)) + 1 }));
  return entries.sort((a, b) => (a.dir === b.dir ? a.number - b.number : a.dir === 'across' ? -1 : 1));
}

/**
 * An interlocking crossword whose shaded squares spell `answer`.
 * `exclude` holds words that must not appear (theme names, the answer).
 */
export function generateCrossword(
  answer: string,
  words: readonly ClueWordLike[],
  exclude: ReadonlySet<string>,
  rng: Rng,
  size = CROSSWORD_SIZE,
): CrosswordPuzzle {
  const pool = words.filter((w) => w.word.length >= 3 && w.word.length <= size && !exclude.has(w.word) && w.word !== answer);
  const byLetter = indexLetters(pool);
  let best: { board: Board; shaded: [number, number][]; spread: number } | null = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const board = buildBoard(pool, byLetter, size, answer, rng);
    if (board.words.length < MIN_WORDS) continue;
    const shaded = pickShaded(board, answer, rng);
    if (!shaded) continue;
    // Prefer shading spread over several words, so one answer doesn't give it all away.
    const spread = new Set(shaded.map(([r, c]) => board.words.findIndex((w) => entryCells(w).some(([wr, wc]) => wr === r && wc === c)))).size;
    if (!best || spread > best.spread) best = { board, shaded, spread };
    if (spread >= Math.min(4, answer.length)) break;
  }
  if (!best) throw new Error(`No crossword can spell ${answer}`);
  return { answer, width: size, height: size, entries: numbered(best.board), shaded: best.shaded };
}

/** Her letters, keyed "r,c". */
export type CrosswordLetters = Readonly<Record<string, string>>;

export const letterAt = (letters: CrosswordLetters, r: number, c: number) => letters[cellKey(r, c)] ?? '';

/** The puzzle's letter in a square, or undefined for a black square. */
export function solutionAt(p: CrosswordPuzzle, r: number, c: number): string | undefined {
  for (const e of p.entries) {
    const i = e.dir === 'across' ? (r === e.row ? c - e.col : -1) : c === e.col ? r - e.row : -1;
    if (i >= 0 && i < e.word.length) return e.word[i];
  }
  return undefined;
}

export const entrySolved = (e: CrosswordEntry, letters: CrosswordLetters) =>
  entryCells(e).every(([r, c], i) => letterAt(letters, r, c) === e.word[i]);

/** Won when every shaded square holds the right letter. */
export const crosswordWon = (p: CrosswordPuzzle, letters: CrosswordLetters) =>
  p.shaded.every(([r, c], k) => letterAt(letters, r, c) === p.answer[k]);

// ---------- Hints ----------
// Each ask gives the next most useful thing, gentlest first: point out wrong
// letters, then name a word to try, then fill that word in a letter at a time.

export const entryLabel = (e: Pick<CrosswordEntry, 'number' | 'dir'>) => `${e.number} ${e.dir}`;

export type CrosswordHint =
  /** Her letters that are wrong, keyed "r,c" with the wrong letter. */
  | { kind: 'wrong'; squares: Record<string, string> }
  /** A word worth trying next. */
  | { kind: 'nudge'; entry: CrosswordEntry; shadedSquares: number }
  /** One right letter, in the word she was nudged towards. */
  | { kind: 'letter'; entry: CrosswordEntry; index: number; square: [number, number]; letter: string };

export interface CrosswordHintState {
  /** Wrong letters already pointed out, keyed "r,c". Not pointed out again while unchanged. */
  flagged?: Readonly<Record<string, string>>;
  /** `entryLabel` of the word she was last nudged towards. */
  nudged?: string;
}

/** Her letters that are wrong and haven't been pointed out yet (or have changed since). */
export function newlyWrong(p: CrosswordPuzzle, letters: CrosswordLetters, flagged: Readonly<Record<string, string>> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, letter] of Object.entries(letters)) {
    const [r, c] = key.split(',').map(Number);
    if (letter && letter !== solutionAt(p, r, c) && flagged[key] !== letter) out[key] = letter;
  }
  return out;
}

/** The word most worth trying: it reaches an unsolved shaded square, she has most of it, and it crosses others. */
function bestEntry(p: CrosswordPuzzle, letters: CrosswordLetters): CrosswordEntry {
  const shadedKeys = new Set(p.shaded.filter(([r, c], k) => letterAt(letters, r, c) !== p.answer[k]).map(([r, c]) => cellKey(r, c)));
  const crossCount = new Map<string, number>();
  for (const e of p.entries) for (const [r, c] of entryCells(e)) crossCount.set(cellKey(r, c), (crossCount.get(cellKey(r, c)) ?? 0) + 1);
  const score = (e: CrosswordEntry) => {
    const cells = entryCells(e);
    const right = cells.filter(([r, c], i) => letterAt(letters, r, c) === e.word[i]).length;
    const shaded = cells.filter(([r, c]) => shadedKeys.has(cellKey(r, c))).length;
    const crosses = cells.filter(([r, c]) => crossCount.get(cellKey(r, c))! > 1).length;
    return (shaded ? 100 : 0) + (right / cells.length) * 10 + crosses;
  };
  const open = p.entries.filter((e) => !entrySolved(e, letters));
  return open.reduce((a, b) => (score(b) > score(a) ? b : a));
}

/** The next hint, or null once every square is right. */
export function crosswordHint(p: CrosswordPuzzle, letters: CrosswordLetters, state: CrosswordHintState = {}): CrosswordHint | null {
  const wrong = newlyWrong(p, letters, state.flagged);
  if (Object.keys(wrong).length) return { kind: 'wrong', squares: wrong };
  if (p.entries.every((e) => entrySolved(e, letters))) return null;

  const nudged = p.entries.find((e) => entryLabel(e) === state.nudged && !entrySolved(e, letters));
  if (!nudged) {
    const entry = bestEntry(p, letters);
    const shadedSquares = entryCells(entry).filter(([r, c]) => p.shaded.some(([sr, sc]) => sr === r && sc === c)).length;
    return { kind: 'nudge', entry, shadedSquares };
  }
  // Fill a square shared with another word first: it helps both.
  const cells = entryCells(nudged);
  const open = cells.map((sq, i) => ({ sq, i })).filter(({ sq: [r, c], i }) => letterAt(letters, r, c) !== nudged.word[i]);
  const shared = open.find(({ sq: [r, c] }) => p.entries.some((e) => e !== nudged && entryCells(e).some(([er, ec]) => er === r && ec === c)));
  const { sq, i } = shared ?? open[0];
  return { kind: 'letter', entry: nudged, index: i, square: sq, letter: nudged.word[i] };
}

/** Every square filled in correctly, for "Solve puzzle". */
export function fullLetters(p: CrosswordPuzzle): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of p.entries) entryCells(e).forEach(([r, c], i) => (out[cellKey(r, c)] = e.word[i]));
  return out;
}
