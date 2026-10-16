// Sudoku in 6×6 (2×3 boxes) or 9×9 (3×3 boxes). Generated puzzles have one
// solution and can be finished with singles alone (a digit that fits only one
// cell, or a cell that fits only one digit), so she never has to guess.

import type { Rng } from '../engine/rng.ts';

export interface SudokuPuzzle {
  size: number;
  boxRows: number;
  boxCols: number;
  /** Row-major, 0 = empty. */
  givens: number[];
  solution: number[];
}

const BOXES: Record<number, [number, number]> = { 6: [2, 3], 9: [3, 3] };

interface Shape {
  size: number;
  boxRows: number;
  boxCols: number;
  /** For each cell, the indices of the cells it must differ from. */
  peers: number[][];
  /** Every row, column and box as a list of cell indices. */
  units: number[][];
}

function shape(size: number): Shape {
  const [boxRows, boxCols] = BOXES[size];
  const units: number[][] = [];
  for (let r = 0; r < size; r++) units.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) units.push(Array.from({ length: size }, (_, r) => r * size + c));
  for (let br = 0; br < size; br += boxRows) {
    for (let bc = 0; bc < size; bc += boxCols) {
      const box: number[] = [];
      for (let r = br; r < br + boxRows; r++) for (let c = bc; c < bc + boxCols; c++) box.push(r * size + c);
      units.push(box);
    }
  }
  const peers = Array.from({ length: size * size }, (_, i) => {
    const set = new Set<number>();
    for (const u of units) if (u.includes(i)) for (const j of u) if (j !== i) set.add(j);
    return [...set];
  });
  return { size, boxRows, boxCols, peers, units };
}

function candidates(s: Shape, grid: number[], i: number): number[] {
  const seen = new Set(s.peers[i].map((j) => grid[j]));
  const out: number[] = [];
  for (let d = 1; d <= s.size; d++) if (!seen.has(d)) out.push(d);
  return out;
}

/** Count solutions up to `limit`, picking the most constrained cell first. */
function countSolutions(s: Shape, grid: number[], limit: number): number {
  let best = -1;
  let bestCands: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i]) continue;
    const cands = candidates(s, grid, i);
    if (cands.length === 0) return 0;
    if (best === -1 || cands.length < bestCands.length) {
      best = i;
      bestCands = cands;
    }
  }
  if (best === -1) return 1;
  let count = 0;
  for (const d of bestCands) {
    grid[best] = d;
    count += countSolutions(s, grid, limit - count);
    grid[best] = 0;
    if (count >= limit) break;
  }
  return count;
}

function fill(s: Shape, grid: number[], rng: Rng): boolean {
  const i = grid.indexOf(0);
  if (i === -1) return true;
  for (const d of rng.shuffle(candidates(s, grid, i))) {
    grid[i] = d;
    if (fill(s, grid, rng)) return true;
  }
  grid[i] = 0;
  return false;
}

/** Whether singles alone finish the grid. */
export function solvableBySingles(s: Shape, start: number[]): boolean {
  const grid = start.slice();
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) continue;
      const cands = candidates(s, grid, i);
      if (cands.length === 1) {
        grid[i] = cands[0];
        progress = true;
      }
    }
    for (const unit of s.units) {
      for (let d = 1; d <= s.size; d++) {
        if (unit.some((i) => grid[i] === d)) continue;
        const spots = unit.filter((i) => !grid[i] && candidates(s, grid, i).includes(d));
        if (spots.length === 1) {
          grid[spots[0]] = d;
          progress = true;
        }
      }
    }
  }
  return !grid.includes(0);
}

/** `targetGivens`: stop removing once this few digits remain (more givens = easier). */
export function generateSudoku(size: 6 | 9, targetGivens: number, rng: Rng): SudokuPuzzle {
  const s = shape(size);
  const solution = Array<number>(size * size).fill(0);
  fill(s, solution, rng);
  const givens = solution.slice();
  let count = givens.length;
  for (const i of rng.shuffle(Array.from({ length: givens.length }, (_, k) => k))) {
    if (count <= targetGivens) break;
    const keep = givens[i];
    givens[i] = 0;
    if (countSolutions(s, givens.slice(), 2) === 1 && solvableBySingles(s, givens)) count--;
    else givens[i] = keep;
  }
  return { size, boxRows: s.boxRows, boxCols: s.boxCols, givens, solution };
}

/** Indices of filled cells that clash with another filled cell in a row, column or box. */
export function sudokuConflicts(p: SudokuPuzzle, grid: readonly number[]): Set<number> {
  const s = shape(p.size);
  const bad = new Set<number>();
  grid.forEach((d, i) => {
    if (d && s.peers[i].some((j) => grid[j] === d)) bad.add(i);
  });
  return bad;
}

export const sudokuSolved = (p: SudokuPuzzle, grid: readonly number[]) => grid.every((d, i) => d === p.solution[i]);

export const sudokuShape = shape;
