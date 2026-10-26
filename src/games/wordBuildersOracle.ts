// Today's builders, kept only to prove the fast ones build the same puzzles. Never change.
// Copies of generateCrossword (crossword.ts) at commit 29e90e3 and of the word-first generateWordSearch (wordsearch.ts, piece G),
// with their private helpers (the word search keeps the plain slow findPlacement and has no layout counter); only the exported names differ.

import type { Rng } from '../engine/rng.ts';
import type { ClueWordLike, CrosswordEntry, CrosswordPuzzle, Direction } from './crossword.ts';
import type { PlacedWord, Pos, WordSearchPuzzle } from './wordsearch.ts';

// ---------- Crossword ----------

const CROSSWORD_SIZE = 7;
/** How many words a grid of this size holds, fewest to most. */
const wordRange = (size: number): [number, number] => (size <= 7 ? [6, 10] : size <= 9 ? [8, 13] : [11, 17]);
const ATTEMPTS = 400;

const cellKey = (r: number, c: number) => `${r},${c}`;

/** The squares an entry covers, in order. */
function entryCells(e: Pick<CrosswordEntry, 'word' | 'dir' | 'row' | 'col'>): [number, number][] {
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

  const [min, max] = wordRange(size);
  const probes = size <= 7 ? 800 : 2000;
  const target = min + rng.int(max - min + 1);
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
    // Random probes are much cheaper than trying every word at every square, and plenty for these grids.
    for (let probe = 0; probe < probes && options.length < 12; probe++) {
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
export function oracleCrossword(
  answer: string,
  words: readonly ClueWordLike[],
  exclude: ReadonlySet<string>,
  rng: Rng,
  size = CROSSWORD_SIZE,
): CrosswordPuzzle {
  const pool = words.filter((w) => w.word.length >= 3 && w.word.length <= size && !exclude.has(w.word) && w.word !== answer);
  const byLetter = indexLetters(pool);
  const enough = Math.min(4, answer.length);
  // Bigger grids rarely fill up in one go: keep the fullest of a few good boards.
  const keep = size <= 7 ? 1 : 4;
  let good = 0;
  let best: { board: Board; shaded: [number, number][]; spread: number } | null = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const board = buildBoard(pool, byLetter, size, answer, rng);
    if (board.words.length < wordRange(size)[0]) continue;
    const shaded = pickShaded(board, answer, rng);
    if (!shaded) continue;
    // Prefer shading spread over several words, so one answer doesn't give it all away.
    const spread = new Set(shaded.map(([r, c]) => board.words.findIndex((w) => entryCells(w).some(([wr, wc]) => wr === r && wc === c)))).size;
    const better =
      !best ||
      (spread >= enough) > (best.spread >= enough) ||
      ((spread >= enough) === (best.spread >= enough) && (best.spread < enough ? spread > best.spread : board.letters.size > best.board.letters.size));
    if (better) best = { board, shaded, spread };
    if (spread >= enough && ++good >= keep) break;
  }
  if (!best) throw new Error(`No crossword can spell ${answer}`);
  return { answer, width: size, height: size, entries: numbered(best.board), shaded: best.shaded };
}

// ---------- Word search ----------

/** Steps for each reading direction. Forward ones first. */
const FORWARD: readonly Pos[] = [
  [0, 1], // right
  [1, 0], // down
  [1, 1], // down-right
  [-1, 1], // up-right
];
const BACKWARD: readonly Pos[] = FORWARD.map(([dr, dc]) => [-dr, -dc] as const);

/** Directions by level: 1 = right and down, 2 = plus diagonals, 3 = also backwards. */
function directionsFor(level: 1 | 2 | 3): readonly Pos[] {
  if (level === 1) return FORWARD.slice(0, 2);
  if (level === 2) return FORWARD;
  return [...FORWARD, ...BACKWARD];
}

const WORDSEARCH_SIZE = 7;
const MAX_WORDS = 14;
/** At most this many hidden letters side by side in one row, so the word doesn't show as a run. */
const MAX_SIDE_BY_SIDE = 3;
const WORDSEARCH_ATTEMPTS = 300;

const key = ([r, c]: Pos) => r * 100 + c;

/** The longest run of hidden letters side by side in one row (each directly right of the one before). */
function longestSideBySide(secret: readonly Pos[]): number {
  let best = secret.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < secret.length; i++) {
    run = secret[i][0] === secret[i - 1][0] && secret[i][1] === secret[i - 1][1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Build a puzzle. Fills the grid with listed words until exactly
 * `answer.length` squares are open, then writes the answer into those squares
 * in reading order, so no square is blank. Retries layouts until every listed
 * word appears exactly once (in any direction) and no more than
 * MAX_SIDE_BY_SIDE hidden letters sit side by side.
 */
export function oracleWordSearch(
  answer: string,
  words: readonly string[],
  exclude: ReadonlySet<string>,
  level: 1 | 2 | 3,
  rng: Rng,
  size = WORDSEARCH_SIZE,
): WordSearchPuzzle {
  const dirs = directionsFor(level);
  const target = answer.length;
  const pool = [...new Set(words)].filter(
    (w) => w.length >= 3 && w.length <= size && !exclude.has(w) && w !== answer && !isPalindrome(w),
  );
  const all: Pos[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) all.push([r, c]);
  for (let attempt = 0; attempt < WORDSEARCH_ATTEMPTS; attempt++) {
    const letters: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
    const placed: PlacedWord[] = [];
    const usedWords = new Set<string>();
    const dead = new Set<number>();
    let open = size * size;
    while (placed.length < MAX_WORDS && open > target) {
      const live: Pos[] = [];
      for (const p of all) if (letters[p[0]][p[1]] === null && !dead.has(key(p))) live.push(p);
      if (!live.length) break;
      const at = rng.pick(live);
      const fit = findPlacement(at, pool, usedWords, dirs, letters, new Set<number>(), size, rng);
      if (!fit) {
        dead.add(key(at));
        continue;
      }
      const fresh = fit.cells.filter(([r, c]) => letters[r][c] === null).length;
      if (open - fresh < target) {
        dead.add(key(at));
        continue;
      }
      fit.cells.forEach(([r, c], i) => (letters[r][c] = fit.word[i]));
      placed.push(fit);
      usedWords.add(fit.word);
      open -= fresh;
    }
    if (placed.length < 4 || open !== target) continue;
    const secret: Pos[] = all.filter(([r, c]) => letters[r][c] === null);
    if (longestSideBySide(secret) > MAX_SIDE_BY_SIDE) continue;
    secret.forEach(([r, c], i) => (letters[r][c] = answer[i]));
    const puzzle: WordSearchPuzzle = {
      size,
      grid: letters.map((row) => row.map((l) => l ?? '.').join('')),
      words: placed.slice().sort((a, b) => a.word.localeCompare(b.word)),
      answer,
      secret,
    };
    if (everyWordOnce(puzzle)) return puzzle;
  }
  throw new Error(`No word search layout for ${answer}`);
}

/** A word through `target` that fits what's already in the grid and fills at least two new squares. */
function findPlacement(
  target: Pos,
  pool: readonly string[],
  usedWords: ReadonlySet<string>,
  dirs: readonly Pos[],
  letters: (string | null)[][],
  secretSet: ReadonlySet<number>,
  size: number,
  rng: Rng,
): PlacedWord | null {
  // A sample of the pool is plenty, and keeps generation quick on a phone.
  for (const word of rng.shuffle(pool).slice(0, 120)) {
    if (usedWords.has(word)) continue;
    for (const [dr, dc] of rng.shuffle(dirs)) {
      for (const j of rng.shuffle([...word].map((_, i) => i))) {
        const r0 = target[0] - j * dr;
        const c0 = target[1] - j * dc;
        const cells: Pos[] = [];
        let fresh = 0;
        let ok = true;
        for (let i = 0; i < word.length && ok; i++) {
          const r = r0 + i * dr;
          const c = c0 + i * dc;
          if (r < 0 || c < 0 || r >= size || c >= size || secretSet.has(r * 100 + c)) ok = false;
          else if (letters[r][c] === null) fresh++;
          else if (letters[r][c] !== word[i]) ok = false;
          cells.push([r, c]);
        }
        if (ok && fresh >= 2) return { word, cells };
      }
    }
  }
  return null;
}

const isPalindrome = (w: string) => w === [...w].reverse().join('');

/** Every listed word appears exactly once, counting all eight directions. */
function everyWordOnce(p: WordSearchPuzzle): boolean {
  const all8 = directionsFor(3);
  for (const { word } of p.words) {
    let count = 0;
    for (let r = 0; r < p.size; r++)
      for (let c = 0; c < p.size; c++)
        for (const [dr, dc] of all8) {
          let i = 0;
          while (i < word.length) {
            const rr = r + i * dr;
            const cc = c + i * dc;
            if (rr < 0 || cc < 0 || rr >= p.size || cc >= p.size || p.grid[rr][cc] !== word[i]) break;
            i++;
          }
          if (i === word.length) count++;
        }
    if (count !== 1) return false;
  }
  return true;
}
