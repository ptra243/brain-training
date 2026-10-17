// The cat puzzle: an n×n grid split into n coloured zones. Place one cat in
// every row, every column and every zone, and no two cats may touch, not
// even diagonally. Generated puzzles have exactly one solution. Easy ones
// also have a one-square zone to start from and need no looking ahead.

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
 * sprawling zone next to several one-square ones. Zone `single`, if given,
 * stays one square.
 */
function growZones(n: number, cats: number[], rng: Rng, single = -1): number[][] {
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
    const growable = Array.from({ length: n }, (_, z) => z).filter((z) => z !== single && frontierOf(z).length > 0);
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

/**
 * Zones within a sensible size range: exactly `singles` one-square zones,
 * every other zone at least two, and no zone hogging the grid.
 */
function balanced(zones: number[][], singles: number): boolean {
  const n = zones.length;
  const sizes = new Array<number>(n).fill(0);
  for (const row of zones) for (const z of row) sizes[z]++;
  return sizes.filter((k) => k === 1).length === singles && Math.max(...sizes) <= Math.ceil(n * 2.2);
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
function makeUnique(zones: number[][], cats: number[], rng: Rng, steps: number, single = -1): boolean {
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
    if (sizeOf(from) <= 2 || sizeOf(to) >= maxSize || to === single) continue;
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

/**
 * Whether the puzzle comes out by simple steps alone, never looking further
 * ahead than one cat: put a cat where a row, column or zone has only one
 * square left, and rule out any square whose cat would leave some other row,
 * column or zone with no squares at all.
 */
export function solvableBySimpleSteps(zones: number[][]): boolean {
  const n = zones.length;
  const open = zones.map((row) => row.map(() => true));
  const units: [number, number][][] = [];
  for (let i = 0; i < n; i++) {
    units.push(Array.from({ length: n }, (_, c): [number, number] => [i, c]));
    units.push(Array.from({ length: n }, (_, r): [number, number] => [r, i]));
  }
  for (let z = 0; z < n; z++) {
    const cells: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (zones[r][c] === z) cells.push([r, c]);
    units.push(cells);
  }
  const done = units.map(() => false);
  const holds = (cells: [number, number][], r: number, c: number) => cells.some(([rr, cc]) => rr === r && cc === c);
  /** Would a cat at (r, c) rule out (rr, cc)? Its row, column, zone and neighbours. */
  const rules = (r: number, c: number, rr: number, cc: number) =>
    rr === r || cc === c || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1) || zones[rr][cc] === zones[r][c];
  let placed = 0;
  while (placed < n) {
    // A row, column or zone with one square left: the cat goes there.
    const u = units.findIndex((cells, u) => !done[u] && cells.filter(([r, c]) => open[r][c]).length <= 1);
    if (u >= 0) {
      const left = units[u].filter(([r, c]) => open[r][c]);
      if (!left.length) return false;
      const [r, c] = left[0];
      for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) if (rules(r, c, rr, cc)) open[rr][cc] = false;
      units.forEach((cells, v) => holds(cells, r, c) && (done[v] = true));
      placed++;
      continue;
    }
    // Otherwise rule out squares whose cat would leave another row, column or zone empty.
    let progress = false;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!open[r][c]) continue;
        const empties = units.some(
          (cells, v) => !done[v] && !holds(cells, r, c) && cells.every(([rr, cc]) => !open[rr][cc] || rules(r, c, rr, cc)),
        );
        if (empties) {
          open[r][c] = false;
          progress = true;
        }
      }
    }
    if (!progress) return false;
  }
  return true;
}

/**
 * `easy`: one zone is a single square, so her first cat is forced, and the
 * rest comes out by simple steps (`solvableBySimpleSteps`).
 */
export function generateCats(size: number, rng: Rng, easy = false): CatPuzzle {
  for (let attempt = 0; attempt < (easy ? 400 : 200); attempt++) {
    const cats = randomPlacement(size, rng);
    if (!cats) continue;
    const single = easy ? rng.int(size) : -1;
    const zones = growZones(size, cats, rng, single);
    if (!makeUnique(zones, cats, rng, size * size * 12, single) || !balanced(zones, easy ? 1 : 0)) continue;
    if (easy && !solvableBySimpleSteps(zones)) continue;
    return { size, zones, solution: cats };
  }
  throw new Error(`Could not generate ${easy ? 'an easy' : 'a'} ${size}×${size} cat puzzle`);
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
