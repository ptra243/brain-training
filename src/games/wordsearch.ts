// Word search with a hidden message: every letter in the grid belongs to a
// listed word except a few, and those leftovers, read left to right and top
// to bottom, spell the hidden word. A few squares may be left blank when no
// word fits through them; they hold no letter at all.

import type { Rng } from '../engine/rng.ts';

export type Pos = readonly [row: number, col: number];

export interface PlacedWord {
  word: string;
  cells: readonly Pos[];
}

export interface WordSearchPuzzle {
  size: number;
  /** One string per row; '.' is a blank square. */
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
const MAX_BLANKS = 4;
const MAX_WORDS = 14;

const key = ([r, c]: Pos) => r * 100 + c;

/**
 * Build a puzzle. Tries layouts until one has few blanks and every listed
 * word appears exactly once in the grid (in any direction), so whichever
 * copy she finds is the right one.
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
  const pool = [...new Set(words)].filter(
    (w) => w.length >= 3 && w.length <= size && !exclude.has(w) && w !== answer && !isPalindrome(w),
  );
  let best: WordSearchPuzzle | null = null;
  let bestBlanks = Infinity;
  // A couple of blanks is fine to look at; stop there rather than hunt for
  // perfect. Right-and-down-only grids are harder to fill, so allow one more.
  const goodEnough = level === 1 ? 3 : 2;
  for (let attempt = 0; attempt < 300 && bestBlanks > goodEnough; attempt++) {
    const built = tryLayout(answer, pool, dirs, size, rng);
    if (!built) continue;
    const blanks = built.grid.join('').split('.').length - 1;
    if (blanks < bestBlanks && everyWordOnce(built)) {
      best = built;
      bestBlanks = blanks;
    }
  }
  if (!best || bestBlanks > MAX_BLANKS) throw new Error(`No word search layout for ${answer}`);
  return best;
}

function tryLayout(answer: string, pool: readonly string[], dirs: readonly Pos[], size: number, rng: Rng): WordSearchPuzzle | null {
  const letters: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const all: Pos[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) all.push([r, c]);

  // Secret squares: any five, kept in reading order.
  const secret = rng
    .shuffle(all)
    .slice(0, answer.length)
    .sort((a, b) => key(a) - key(b));
  const secretSet = new Set(secret.map(key));
  secret.forEach(([r, c], i) => (letters[r][c] = answer[i]));

  const placed: PlacedWord[] = [];
  const usedWords = new Set<string>();
  const dead = new Set<number>();
  const uncovered = () => all.filter((p) => letters[p[0]][p[1]] === null && !dead.has(key(p)));

  while (placed.length < MAX_WORDS) {
    const open = uncovered();
    if (!open.length) break;
    const target = rng.pick(open);
    const fit = findPlacement(target, pool, usedWords, dirs, letters, secretSet, size, rng);
    if (!fit) {
      dead.add(key(target));
      continue;
    }
    fit.cells.forEach(([r, c], i) => (letters[r][c] = fit.word[i]));
    placed.push(fit);
    usedWords.add(fit.word);
  }
  if (placed.length < 4) return null;
  return {
    size,
    grid: letters.map((row) => row.map((l) => l ?? '.').join('')),
    words: placed.slice().sort((a, b) => a.word.localeCompare(b.word)),
    answer,
    secret,
  };
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
