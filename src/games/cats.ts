// The cat puzzle: an n×n grid split into n coloured zones. Place one cat in
// every row, every column and every zone, and no two cats may touch, not
// even diagonally. Generated puzzles have exactly one solution.

import type { Rng } from '../engine/rng.ts';

export interface CatPuzzle {
  size: number;
  /** zones[r][c] = zone index 0..size-1 */
  zones: number[][];
  /** solution[r] = column of the cat in row r */
  solution: number[];
}

/** A random placement of one cat per row and column with no two touching. */
function randomPlacement(n: number, rng: Rng): number[] | null {
  const cols: number[] = [];
  const used = new Set<number>();
  const place = (r: number): boolean => {
    if (r === n) return true;
    for (const c of rng.shuffle(Array.from({ length: n }, (_, i) => i))) {
      if (used.has(c) || (r > 0 && Math.abs(cols[r - 1] - c) <= 1)) continue;
      cols[r] = c;
      used.add(c);
      if (place(r + 1)) return true;
      used.delete(c);
    }
    return false;
  };
  return place(0) ? cols.slice() : null;
}

/**
 * Grow one zone from each cat until the grid is full. Small zones are grown
 * first most of the time, so zones end up roughly even rather than one
 * sprawling zone next to several one-square ones.
 */
function growZones(n: number, cats: number[], rng: Rng): number[][] {
  const zones = Array.from({ length: n }, () => Array<number>(n).fill(-1));
  const sizes = new Array<number>(n).fill(1);
  cats.forEach((c, r) => (zones[r][c] = r));
  const open = (r: number, c: number) => r >= 0 && r < n && c >= 0 && c < n && zones[r][c] === -1;
  const frontierOf = (z: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (zones[r][c] !== z) continue;
        for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) if (open(nr, nc)) out.push([nr, nc]);
      }
    }
    return out;
  };
  let left = n * n - n;
  while (left > 0) {
    const growable = Array.from({ length: n }, (_, z) => z).filter((z) => frontierOf(z).length > 0);
    const smallest = Math.min(...growable.map((z) => sizes[z]));
    const pool = rng.next() < 0.75 ? growable.filter((z) => sizes[z] === smallest) : growable;
    const z = rng.pick(pool);
    const [r, c] = rng.pick(frontierOf(z));
    zones[r][c] = z;
    sizes[z]++;
    left--;
  }
  return zones;
}

/** Zones within a sensible size range: no single squares, no zone hogging the grid. */
function balanced(zones: number[][]): boolean {
  const n = zones.length;
  const sizes = new Array<number>(n).fill(0);
  for (const row of zones) for (const z of row) sizes[z]++;
  return Math.min(...sizes) >= 2 && Math.max(...sizes) <= Math.ceil(n * 2.2);
}

/** Number of solutions, stopping once it passes `limit`. */
export function countCatSolutions(zones: number[][], limit = 2): number {
  const n = zones.length;
  const colUsed = new Array<boolean>(n).fill(false);
  const zoneUsed = new Array<boolean>(n).fill(false);
  let count = 0;
  const solve = (r: number, prev: number) => {
    if (count > limit) return;
    if (r === n) {
      count++;
      return;
    }
    for (let c = 0; c < n; c++) {
      const z = zones[r][c];
      if (colUsed[c] || zoneUsed[z] || (r > 0 && Math.abs(prev - c) <= 1)) continue;
      colUsed[c] = zoneUsed[z] = true;
      solve(r + 1, c);
      colUsed[c] = zoneUsed[z] = false;
    }
  };
  solve(0, -10);
  return count;
}

function contiguous(zones: number[][], z: number): boolean {
  const n = zones.length;
  const cells: [number, number][] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (zones[r][c] === z) cells.push([r, c]);
  if (!cells.length) return false;
  const seen = new Set<string>([`${cells[0][0]},${cells[0][1]}`]);
  const stack = [cells[0]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      const k = `${nr},${nc}`;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && zones[nr][nc] === z && !seen.has(k)) {
        seen.add(k);
        stack.push([nr, nc]);
      }
    }
  }
  return seen.size === cells.length;
}

/**
 * Nudge squares between neighbouring zones until only one answer is left.
 * Cat squares never move, so the intended answer always stays valid; a move
 * is kept when it doesn't add answers, which lets the layout drift towards
 * a unique one.
 */
function makeUnique(zones: number[][], cats: number[], rng: Rng, steps: number): boolean {
  const n = zones.length;
  const maxSize = Math.ceil(n * 2.2);
  let count = countCatSolutions(zones, 60);
  for (let step = 0; step < steps && count > 1; step++) {
    const r = rng.int(n);
    const c = rng.int(n);
    if (cats[r] === c) continue;
    const from = zones[r][c];
    const neighbours = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]
      .filter(([nr, nc]) => nr >= 0 && nr < n && nc >= 0 && nc < n && zones[nr][nc] !== from)
      .map(([nr, nc]) => zones[nr][nc]);
    if (!neighbours.length) continue;
    const to = rng.pick(neighbours);
    const sizeOf = (z: number) => zones.flat().filter((x) => x === z).length;
    if (sizeOf(from) <= 2 || sizeOf(to) >= maxSize) continue;
    zones[r][c] = to;
    if (!contiguous(zones, from)) {
      zones[r][c] = from;
      continue;
    }
    const next = countCatSolutions(zones, 60);
    if (next <= count) count = next;
    else zones[r][c] = from;
  }
  return count === 1;
}

export function generateCats(size: number, rng: Rng): CatPuzzle {
  for (let attempt = 0; attempt < 200; attempt++) {
    const cats = randomPlacement(size, rng);
    if (!cats) continue;
    const zones = growZones(size, cats, rng);
    if (makeUnique(zones, cats, rng, size * size * 12) && balanced(zones)) return { size, zones, solution: cats };
  }
  throw new Error(`Could not generate a ${size}×${size} cat puzzle`);
}

export type CatMark = 'cat' | 'dot';

/** Cells breaking a rule, for highlighting: shared row, column or zone, or touching. */
export function catConflicts(p: CatPuzzle, cats: readonly [number, number][]): Set<string> {
  const bad = new Set<string>();
  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      const [r1, c1] = cats[i];
      const [r2, c2] = cats[j];
      const clash =
        r1 === r2 ||
        c1 === c2 ||
        p.zones[r1][c1] === p.zones[r2][c2] ||
        (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1);
      if (clash) {
        bad.add(`${r1},${c1}`);
        bad.add(`${r2},${c2}`);
      }
    }
  }
  return bad;
}

/**
 * Cells a placed cat rules out: the rest of its row, column and zone, and the
 * squares touching it. Worked out from the cats, never stored, so removing a
 * cat takes its dots away again and her own dots are left alone.
 */
export function autoDots(p: CatPuzzle, cats: readonly [number, number][]): Set<string> {
  const out = new Set<string>();
  for (const [cr, cc] of cats) {
    for (let r = 0; r < p.size; r++) {
      for (let c = 0; c < p.size; c++) {
        if (r === cr && c === cc) continue;
        const near = Math.abs(r - cr) <= 1 && Math.abs(c - cc) <= 1;
        if (r === cr || c === cc || near || p.zones[r][c] === p.zones[cr][cc]) out.add(`${r},${c}`);
      }
    }
  }
  return out;
}

export function catsSolved(p: CatPuzzle, cats: readonly [number, number][]): boolean {
  return cats.length === p.size && cats.every(([r, c]) => p.solution[r] === c);
}
