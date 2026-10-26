// Word search with a hidden message: every square holds a letter. The grid is
// filled with listed words until exactly as many squares are open as the hidden
// word has letters; those leftovers, read left to right and top to bottom,
// spell the hidden word.

import type { Rng } from '../engine/rng.ts';

export type Pos = readonly [row: number, col: number];

export interface PlacedWord {
  word: string;
  cells: readonly Pos[];
}

export interface WordSearchPuzzle {
  size: number;
  /** One string per row. ('.' would be a blank square; the builder leaves none.) */
  grid: readonly string[];
  /** Listed words, in the order shown to her (alphabetical). */
  words: readonly PlacedWord[];
  answer: string;
  /** The squares that spell the answer, in reading order. */
  secret: readonly Pos[];
}

/** Steps for each reading direction. Forward ones first. */
const FORWARD: readonly Pos[] = [
  [0, 1], // right
  [1, 0], // down
  [1, 1], // down-right
  [-1, 1], // up-right
];
const BACKWARD: readonly Pos[] = FORWARD.map(([dr, dc]) => [-dr, -dc] as const);

/** Directions by level: 1 = right and down, 2 = plus diagonals, 3 = also backwards. */
export function directionsFor(level: 1 | 2 | 3): readonly Pos[] {
  if (level === 1) return FORWARD.slice(0, 2);
  if (level === 2) return FORWARD;
  return [...FORWARD, ...BACKWARD];
}

export const WORDSEARCH_SIZE = 7;
const MAX_WORDS = 14;
/** At most this many hidden letters side by side in one row, so the word doesn't show as a run. */
export const MAX_SIDE_BY_SIDE = 3;
const ATTEMPTS = 300;

const key = ([r, c]: Pos) => r * 100 + c;

/** Layouts tried so far; a counter for the sweep, it never touches the Rng. */
export const wordSearchStats = { layouts: 0 };

/** The longest run of hidden letters side by side in one row (each directly right of the one before). */
export function longestSideBySide(secret: readonly Pos[]): number {
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
export function generateWordSearch(
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
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    wordSearchStats.layouts++;
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
      const fit = findPlacement(at, pool, usedWords, dirs, letters, size, rng);
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
  size: number,
  rng: Rng,
): PlacedWord | null {
  // A sample of the pool is plenty, and keeps generation quick on a phone.
  // The shuffle is Rng.shuffle's Fisher-Yates, run in one reused buffer
  // (every draw still happens); only the first 120 are tried.
  const n = pool.length;
  const buf = shuffleBuf;
  buf.length = n;
  for (let i = 0; i < n; i++) buf[i] = pool[i];
  for (let i = n - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const t = buf[i];
    buf[i] = buf[j];
    buf[j] = t;
  }
  const tries = Math.min(n, 120);
  for (let w = 0; w < tries; w++) {
    const word = buf[w];
    if (usedWords.has(word)) continue;
    const len = word.length;
    const idx = indexesOf(len);
    for (const [dr, dc] of rng.shuffle(dirs)) {
      for (const j of rng.shuffle(idx)) {
        const r0 = target[0] - j * dr;
        const c0 = target[1] - j * dc;
        let fresh = 0;
        let ok = true;
        for (let i = 0; i < len; i++) {
          const r = r0 + i * dr;
          const c = c0 + i * dc;
          if (r < 0 || c < 0 || r >= size || c >= size) {
            ok = false;
            break;
          }
          const l = letters[r][c];
          if (l === null) fresh++;
          else if (l !== word[i]) {
            ok = false;
            break;
          }
        }
        if (ok && fresh >= 2) {
          const cells: Pos[] = [];
          for (let i = 0; i < len; i++) cells.push([r0 + i * dr, c0 + i * dc]);
          return { word, cells };
        }
      }
    }
  }
  return null;
}

const shuffleBuf: string[] = [];
const indexCache: number[][] = [];
function indexesOf(len: number): readonly number[] {
  return (indexCache[len] ??= Array.from({ length: len }, (_, i) => i));
}

const isPalindrome = (w: string) => w === [...w].reverse().join('');

/** Letters along a straight line from `a` to `b`, or null if they don't line up. */
export function lineBetween(a: Pos, b: Pos): Pos[] | null {
  const dr = Math.sign(b[0] - a[0]);
  const dc = Math.sign(b[1] - a[1]);
  const len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  if (Math.abs(b[0] - a[0]) !== len * Math.abs(dr) || Math.abs(b[1] - a[1]) !== len * Math.abs(dc)) return null;
  return Array.from({ length: len + 1 }, (_, i) => [a[0] + i * dr, a[1] + i * dc] as const);
}

/** The listed word a selection spells, read either way, if any. */
export function wordAt(p: WordSearchPuzzle, cells: readonly Pos[]): PlacedWord | null {
  const text = cells.map(([r, c]) => p.grid[r][c]).join('');
  const back = [...text].reverse().join('');
  return p.words.find((w) => w.word === text || w.word === back) ?? null;
}

/** Every listed word appears exactly once, counting all eight directions. */
export function everyWordOnce(p: WordSearchPuzzle): boolean {
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

/** Squares not in any listed word (and not blank), in reading order. */
export function leftovers(p: WordSearchPuzzle): Pos[] {
  const covered = new Set(p.words.flatMap((w) => w.cells.map(key)));
  const out: Pos[] = [];
  for (let r = 0; r < p.size; r++) for (let c = 0; c < p.size; c++) if (p.grid[r][c] !== '.' && !covered.has(r * 100 + c)) out.push([r, c]);
  return out;
}
