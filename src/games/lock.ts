// The lock: a numbers puzzle. Six numbers, + - x /, make the target on the
// number grid (`numberGrid.ts`). Only whole positive results count. Every lock
// is built forwards by filling a random valid grid, then the grid solver finds
// the stored shortest way, so it is always exact with no bonuses. Pure and
// seeded; the UI keeps only her moves.

import { Rng, hashSeed } from '../engine/rng.ts';
import type { Level } from './mentalMaths.ts';
import { PALETTE, emptyFill, evaluateGrid, place, solveGrid, type GridFill, type Hand, type RowIndex } from './numberGrid.ts';

export type Op = '+' | '-' | '*' | '/';

export interface Lock {
  numbers: number[];
  target: number;
  /** A shortest exact way on the grid: 2 to 4 numbers. */
  way: GridFill;
}

export const LARGE_NUMBERS: readonly number[] = [25, 50, 75, 100];

/** The hand the lock gives her: its six numbers and every operator, unlimited. */
export const lockHand = (lock: { numbers: readonly number[] }): Hand => ({ numbers: lock.numbers, ops: 'palette' });

// --- Building ---

interface Tier {
  small: number;
  large: number;
  lo: number;
  hi: number;
}

const TIERS: Record<Level, Tier> = {
  easy: { small: 6, large: 0, lo: 20, hi: 99 },
  medium: { small: 5, large: 1, lo: 100, hi: 299 },
  hard: { small: 4, large: 2, lo: 300, hi: 699 },
};

/** How k numbers split over the rows of the grid (1 to 3 per row, at most 3 rows). */
const SHAPES: Record<number, number[][]> = {
  2: [[2], [1, 1]],
  3: [[3], [1, 2], [2, 1], [1, 1, 1]],
  4: [[1, 3], [2, 2], [3, 1], [1, 1, 2], [1, 2, 1], [2, 1, 1]],
};

/** A random grid using `k` of the numbers (by index). Its sums may break the whole-positive rule: check it with `evaluateGrid`. */
function randomGrid(rng: Rng, numbers: readonly number[], k: number, preferLarge: boolean): GridFill {
  const order = rng.shuffle(numbers.map((_, i) => i));
  if (preferLarge) {
    const at = order.findIndex((i) => numbers[i] > 10);
    if (at > 0) [order[0], order[at]] = [order[at], order[0]];
  }
  const picked = rng.shuffle(order.slice(0, k));
  let fill = emptyFill();
  let used = 0;
  rng.pick(SHAPES[k]).forEach((size, r) => {
    const row = r as RowIndex;
    if (row > 0) fill = place(fill, { row, kind: 'rowOp' }, rng.pick(PALETTE));
    for (let i = 0; i < size; i++) {
      fill = place(fill, { row, kind: 'num', i: i as 0 | 1 | 2 }, picked[used++]);
      if (i < size - 1) fill = place(fill, { row, kind: 'op', i: i as 0 | 1 }, rng.pick(PALETTE));
    }
  });
  return fill;
}

/** Build the lock for a seed. Retries with derived draws until the tier rules hold. */
export function buildLock(seed: string, level: Level): Lock {
  const tier = TIERS[level];
  const rng = new Rng(hashSeed(`${seed}-lock-${level}`));
  for (let attempt = 0; attempt < 5000; attempt++) {
    const numbers = rng.shuffle([
      ...Array.from({ length: tier.small }, () => 1 + rng.int(10)),
      ...rng.shuffle(LARGE_NUMBERS).slice(0, tier.large),
    ]);
    const hand = lockHand({ numbers });
    const k = level === 'easy' ? 2 + rng.int(2) : level === 'medium' ? 3 + rng.int(2) : 4;
    // Forwards: a random grid that works makes a target the grid can always reach.
    const target = evaluateGrid(hand, randomGrid(rng, numbers, k, level !== 'easy')).answer;
    if (target === null || target < tier.lo || target > tier.hi || numbers.includes(target)) continue;
    // Hard: the shortest exact way must need 4 numbers or more.
    if (level === 'hard' && solveGrid(hand, target, 3)) continue;
    const way = solveGrid(hand, target, k);
    if (!way) continue;
    return { numbers, target, way: way.fill };
  }
  throw new Error(`no lock found for ${seed} (${level})`);
}

// --- Close enough ---

/** The target widened by 10% for each close-enough bonus (at most 3), rounded inward. */
export function lockWindow(target: number, closeEnoughCount: number): [number, number] {
  const n = Math.max(0, Math.min(closeEnoughCount, 3));
  return [Math.ceil((target * (100 - 10 * n)) / 100), Math.floor((target * (100 + 10 * n)) / 100)];
}

export function lockAccepts(lock: Lock, value: number, closeEnoughCount: number): boolean {
  const [lo, hi] = lockWindow(lock.target, closeEnoughCount);
  return value >= lo && value <= hi;
}

// --- Prefixes of the stored way (notes and hints) ---

const rowSize = (row: GridFill[number]) => row.nums.filter((n) => n !== null).length;

/** How many numbers of the way a note or each hint step fills in: [start, most, all]. */
export function wayCounts(way: GridFill): [number, number, number] {
  const sizes = way.map(rowSize).filter((s) => s > 0);
  const all = sizes.reduce((a, b) => a + b, 0);
  const rows = sizes.length;
  // The first row; for a one-row way its first two numbers (never the whole way).
  const start = rows >= 2 ? sizes[0] : Math.min(2, all - 1);
  // All but the last row; for one or two rows, one more number than the start where possible.
  const most = rows >= 3 ? all - sizes[rows - 1] : Math.max(start, Math.min(start + 1, all - 1));
  return [start, most, all];
}

/** The way's first `count` numbers in reading order, each with the operator before it. */
export function wayPrefix(way: GridFill, count: number): GridFill {
  let left = count;
  return way.map((row) => {
    const nums: (number | null)[] = [null, null, null];
    const ops: (GridFill[number]['ops'][number])[] = [null, null];
    let rowOp: GridFill[number]['rowOp'] = null;
    for (let i = 0; i < 3 && left > 0 && row.nums[i] !== null; i++, left--) {
      nums[i] = row.nums[i];
      if (i > 0) ops[i - 1] = row.ops[i - 1];
      else rowOp = row.rowOp;
    }
    return { rowOp, nums, ops } as unknown as GridFill[number];
  });
}

/** What the cat's note fills in at the start: the way's first row (see `wayCounts`). */
export const lockNote = (lock: Lock): GridFill => wayPrefix(lock.way, wayCounts(lock.way)[0]);

// --- Hints ---

export type LockHint =
  /** Her grid is the target already: try it. */
  | { kind: 'submit' }
  /** Step 0 the start of the way, step 1 most of it, step 2 all of it; it replaces her grid. */
  | { kind: 'fill'; step: 0 | 1 | 2; fill: GridFill };

export function lockHint(lock: Lock, fill: GridFill, step: number): LockHint {
  const ev = evaluateGrid(lockHand(lock), fill);
  if (ev.submittable && ev.answer === lock.target) return { kind: 'submit' };
  const s = Math.max(0, Math.min(step, 2)) as 0 | 1 | 2;
  return { kind: 'fill', step: s, fill: wayPrefix(lock.way, wayCounts(lock.way)[s]) };
}
