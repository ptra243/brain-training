// The lock: a numbers puzzle. Six numbers, + - x /, make the target. Only whole
// positive results count (/ only when exact, - only when above 0). Every lock is
// built forwards from a real way, then checked with an exhaustive solver, so it
// is always exact with no bonuses. Pure and seeded; the UI keeps only her moves.

import { Rng, hashSeed } from '../engine/rng.ts';
import type { Level } from './mentalMaths.ts';

export type Op = '+' | '-' | '*' | '/';

export interface Step {
  a: number;
  b: number;
  op: Op;
  result: number;
}

export interface Lock {
  numbers: number[];
  target: number;
  /** A shortest exact way: 2 to 5 numbers. */
  way: Step[];
}

export const LARGE_NUMBERS: readonly number[] = [25, 50, 75, 100];

/** The steps that can join two values (larger first, so - and / read naturally). */
function joins(x: number, y: number): Step[] {
  const a = Math.max(x, y);
  const b = Math.min(x, y);
  const out: Step[] = [
    { a, b, op: '+', result: a + b },
    { a, b, op: '*', result: a * b },
  ];
  if (a > b) out.push({ a, b, op: '-', result: a - b });
  if (a % b === 0) out.push({ a, b, op: '/', result: a / b });
  return out;
}

/** The step for exactly `a op b` in that order, or null when it isn't allowed. */
function exactStep(a: number, b: number, op: Op): Step | null {
  if (op === '+') return { a, b, op, result: a + b };
  if (op === '*') return { a, b, op, result: a * b };
  if (op === '-') return a > b ? { a, b, op, result: a - b } : null;
  return a % b === 0 ? { a, b, op, result: a / b } : null;
}

/**
 * A shortest exact way from `numbers` to `target`, or null. Whole positive
 * intermediates only. The way uses at least two numbers; `maxSteps` caps its
 * length (default: every number).
 */
export function solveLock(numbers: readonly number[], target: number, maxSteps = numbers.length - 1): Step[] | null {
  for (let steps = 1; steps <= Math.min(maxSteps, numbers.length - 1); steps++) {
    const seen = new Set<string>();
    const found = search(numbers.slice(), target, steps, [], seen);
    if (found) return found;
  }
  return null;
}

function search(tiles: number[], target: number, left: number, path: Step[], seen: Set<string>): Step[] | null {
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      for (const step of joins(tiles[i], tiles[j])) {
        if (left === 1) {
          if (step.result === target) return [...path, step];
          continue;
        }
        const next = tiles.filter((_, k) => k !== i && k !== j);
        next.push(step.result);
        const key = next.slice().sort((x, y) => x - y).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        const found = search(next, target, left - 1, [...path, step], seen);
        if (found) return found;
      }
    }
  }
  return null;
}

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

/** Combine `k` of the numbers at random, forwards, and return the result. */
function forward(rng: Rng, numbers: number[], k: number, preferLarge: boolean): number {
  const order = rng.shuffle(numbers.map((_, i) => i));
  if (preferLarge) {
    const at = order.findIndex((i) => numbers[i] > 10);
    if (at > 0) [order[0], order[at]] = [order[at], order[0]];
  }
  let tiles = order.slice(0, k).map((i) => numbers[i]);
  while (tiles.length > 1) {
    const options: { i: number; j: number; step: Step }[] = [];
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        for (const step of joins(tiles[i], tiles[j])) options.push({ i, j, step });
      }
    }
    const { i, j, step } = rng.pick(options);
    tiles = tiles.filter((_, x) => x !== i && x !== j);
    tiles.push(step.result);
  }
  return tiles[0];
}

/** Build the lock for a seed. Retries with derived draws until the tier rules hold. */
export function buildLock(seed: string, level: Level): Lock {
  const tier = TIERS[level];
  const rng = new Rng(hashSeed(`${seed}-lock-${level}`));
  for (let attempt = 0; attempt < 5000; attempt++) {
    const numbers = [
      ...Array.from({ length: tier.small }, () => 1 + rng.int(10)),
      ...rng.shuffle(LARGE_NUMBERS).slice(0, tier.large),
    ];
    const shuffled = rng.shuffle(numbers);
    const k = level === 'easy' ? 2 + rng.int(2) : level === 'medium' ? 3 + rng.int(2) : 4;
    const target = forward(rng, shuffled, k, level !== 'easy');
    if (target < tier.lo || target > tier.hi || shuffled.includes(target)) continue;
    // Hard: the shortest exact way must need 4 numbers or more.
    if (level === 'hard' && solveLock(shuffled, target, 2)) continue;
    const way = solveLock(shuffled, target, k - 1);
    if (!way) continue;
    return { numbers: shuffled, target, way };
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

// --- Her tiles ---

/** A tile she holds: its value and how many of the starting numbers went into it. */
export interface LockTile {
  value: number;
  uses: number;
}

/** Combine tile `a` with tile `b` (value a op value b), by index. */
export interface LockMove {
  a: number;
  b: number;
  op: Op;
}

export function lockStart(numbers: readonly number[]): LockTile[] {
  return numbers.map((value) => ({ value, uses: 1 }));
}

/** Apply a move: the two tiles are spent and the result joins the end. Null when it isn't allowed. */
export function lockMove(tiles: readonly LockTile[], move: LockMove): { tiles: LockTile[]; step: Step } | null {
  const { a, b, op } = move;
  if (a === b || !tiles[a] || !tiles[b]) return null;
  const step = exactStep(tiles[a].value, tiles[b].value, op);
  if (!step) return null;
  const next = tiles.filter((_, i) => i !== a && i !== b);
  next.push({ value: step.result, uses: tiles[a].uses + tiles[b].uses });
  return { tiles: next, step };
}

/** Replay her moves from the starting numbers. Moves that are not allowed are skipped. */
export function lockTiles(numbers: readonly number[], moves: readonly LockMove[]): LockTile[] {
  let tiles = lockStart(numbers);
  for (const move of moves) tiles = lockMove(tiles, move)?.tiles ?? tiles;
  return tiles;
}

export function undoMove(moves: readonly LockMove[]): LockMove[] {
  return moves.slice(0, -1);
}

/** The tile she may submit: the newest one, if it is built from at least two numbers. */
export function lockSubmittable(tiles: readonly LockTile[]): LockTile | null {
  const last = tiles[tiles.length - 1];
  return last && last.uses >= 2 ? last : null;
}

// --- Hints ---

export type LockHint =
  /** Step 0: the two tiles to combine next (indexes into her tiles). */
  | { kind: 'tiles'; a: number; b: number }
  /** Step 1: that step as a move. */
  | { kind: 'move'; move: LockMove; step: Step }
  /** Step 2: the whole remaining way. */
  | { kind: 'way'; steps: Step[] }
  /** She holds a tile that is the target. */
  | { kind: 'submit' }
  /** No way from her tiles: take a step back. */
  | { kind: 'undo' };

export function lockHint(lock: Lock, tiles: readonly LockTile[], step: number): LockHint {
  if (tiles.some((t) => t.uses >= 2 && t.value === lock.target)) return { kind: 'submit' };
  const fresh = tiles.length === lock.numbers.length && tiles.every((t) => t.uses === 1);
  const way = fresh ? lock.way : solveLock(tiles.map((t) => t.value), lock.target, Math.min(tiles.length - 1, 4));
  if (!way || way.length === 0) return { kind: 'undo' };
  if (step >= 2) return { kind: 'way', steps: way };
  const first = way[0];
  const a = tiles.findIndex((t) => t.value === first.a);
  const b = tiles.findIndex((t, i) => i !== a && t.value === first.b);
  if (step <= 0) return { kind: 'tiles', a, b };
  return { kind: 'move', move: { a, b, op: first.op }, step: first };
}
