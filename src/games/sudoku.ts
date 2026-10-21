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

const shapes = new Map<number, Shape>();

function shape(size: number): Shape {
  const known = shapes.get(size);
  if (known) return known;
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
  const out = { size, boxRows, boxCols, peers, units };
  shapes.set(size, out);
  return out;
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

/** The two squares for one map statement: their solved digits are the row and column. */
export interface LocationSquares {
  row: number;
  col: number;
}

/**
 * For each statement's target map square [r, c] (0-based), pick two empty
 * squares whose solved digits are r+1 and c+1. Squares are never shared.
 */
export function locationSquares(
  p: SudokuPuzzle,
  targets: readonly { id: string; target: readonly [number, number] }[],
  rng: Rng,
): Record<string, LocationSquares> {
  const used = new Set<number>();
  const pick = (digit: number) => {
    const options = p.solution.map((_, i) => i).filter((i) => p.solution[i] === digit && !p.givens[i] && !used.has(i));
    if (!options.length) return -1;
    const i = rng.pick(options);
    used.add(i);
    return i;
  };
  const out: Record<string, LocationSquares> = {};
  for (const { id, target } of targets) {
    const row = pick(target[0] + 1);
    const col = pick(target[1] + 1);
    if (row >= 0 && col >= 0) out[id] = { row, col };
  }
  return out;
}

/** Statements whose two squares now hold the right digits. */
export function foundLocations(p: SudokuPuzzle, squares: Record<string, LocationSquares>, grid: readonly number[]): string[] {
  return Object.entries(squares)
    .filter(([, s]) => grid[s.row] === p.solution[s.row] && grid[s.col] === p.solution[s.col])
    .map(([id]) => id);
}

// ---------- Hints ----------
// Each ask gives the next step, gentlest first: point out wrong numbers, then
// sit on a square that can be worked out, then say why, then fill it in.

/** Why a square can be worked out: every other number is ruled out, or the number has nowhere else to go in a row, column or box. */
export type SudokuReason = { kind: 'only-number' } | { kind: 'only-place'; unit: 'row' | 'column' | 'box'; cells: number[] };

export type SudokuHint =
  /** Her numbers that are wrong, keyed by square index. */
  | { kind: 'wrong'; squares: Record<number, number> }
  /** A square that can be worked out now. */
  | { kind: 'nudge'; cell: number }
  /** Why that square can be worked out. */
  | { kind: 'why'; cell: number; digit: number; reason: SudokuReason }
  /** Its number, filled in. */
  | { kind: 'fill'; cell: number; digit: number };

export interface SudokuHintState {
  /** Wrong numbers already pointed out, by square. Not pointed out again while unchanged. */
  flagged?: Readonly<Record<number, number>>;
  /** The square she was last nudged towards. */
  nudged?: number;
  /** The square whose reason she was last given. */
  explained?: number;
}

/** Her numbers that are wrong and haven't been pointed out yet (or have changed since). */
export function sudokuWrong(p: SudokuPuzzle, grid: readonly number[], flagged: Readonly<Record<number, number>> = {}): Record<number, number> {
  const out: Record<number, number> = {};
  grid.forEach((d, i) => {
    if (d && d !== p.solution[i] && flagged[i] !== d) out[i] = d;
  });
  return out;
}

const UNIT_KINDS = ['row', 'column', 'box'] as const;

/** Why square `i` can be worked out from the right numbers in `grid`, or null if it can't yet. */
function singleReason(s: Shape, grid: number[], i: number, digit: number): SudokuReason | null {
  // A number with only one place in a box, row or column is the easiest to spot.
  for (const k of [2, 0, 1]) {
    const unit = s.units.filter((u) => u.includes(i))[k];
    if (unit.some((j) => grid[j] === digit)) continue;
    const spots = unit.filter((j) => !grid[j] && candidates(s, grid, j).includes(digit));
    if (spots.length === 1) return { kind: 'only-place', unit: UNIT_KINDS[k], cells: unit };
  }
  const cands = candidates(s, grid, i);
  return cands.length === 1 ? { kind: 'only-number' } : null;
}

/**
 * Why square `i` can be worked out now, or null if it can't (or is already right).
 * Reasons only from the numbers that are right; wrong ones have been crossed out.
 */
export function sudokuReason(p: SudokuPuzzle, grid: readonly number[], i: number, known = grid.map((d, j) => (d === p.solution[j] ? d : 0))): SudokuReason | null {
  return known[i] ? null : singleReason(shape(p.size), known, i, p.solution[i]);
}

/** The next hint, or null once the grid is solved. */
export function sudokuHint(p: SudokuPuzzle, grid: readonly number[], state: SudokuHintState = {}): SudokuHint | null {
  const wrong = sudokuWrong(p, grid, state.flagged);
  if (Object.keys(wrong).length) return { kind: 'wrong', squares: wrong };
  if (sudokuSolved(p, grid)) return null;

  const known = grid.map((d, i) => (d === p.solution[i] ? d : 0));
  const reasonFor = (i: number) => sudokuReason(p, grid, i, known);

  const nudged = state.nudged;
  const reason = nudged !== undefined ? reasonFor(nudged) : null;
  if (nudged === undefined || !reason) {
    // Squares in reading order; one always qualifies, since singles alone solve the puzzle from its givens.
    const cell = known.findIndex((_, i) => reasonFor(i)?.kind === 'only-place');
    const next = cell >= 0 ? cell : known.findIndex((_, i) => reasonFor(i) !== null);
    return { kind: 'nudge', cell: next };
  }
  const digit = p.solution[nudged];
  if (state.explained !== nudged) return { kind: 'why', cell: nudged, digit, reason };
  return { kind: 'fill', cell: nudged, digit };
}

// ---------- Pencil marks ----------
// Her notes per square (sorted digits). With "show possible numbers" on, a square
// she has never edited shows the candidates; once edited, her notes within them.

export type SudokuNotes = Record<number, number[]>;

/** Digits not already in square `i`'s row, column or box in her grid; empty for a filled square. */
export function sudokuCandidates(p: SudokuPuzzle, grid: readonly number[], i: number): number[] {
  if (grid[i]) return [];
  return candidates(shape(p.size), grid as number[], i);
}

/** What an empty square shows as notes: her notes (or the candidates if never edited and the checkbox is on), within the candidates. */
export function visibleNotes(p: SudokuPuzzle, grid: readonly number[], notes: SudokuNotes, show: boolean, i: number): number[] {
  if (grid[i]) return [];
  const cands = sudokuCandidates(p, grid, i);
  const mine = notes[i] ?? (show ? cands : []);
  return mine.filter((d) => cands.includes(d));
}

/** Toggle one note in square `i`, starting from what it shows. Filled squares are left alone. */
export function toggleNote(p: SudokuPuzzle, grid: readonly number[], notes: SudokuNotes, show: boolean, i: number, digit: number): SudokuNotes {
  if (grid[i] || p.givens[i]) return notes;
  const now = visibleNotes(p, grid, notes, show, i);
  const next = now.includes(digit) ? now.filter((d) => d !== digit) : [...now, digit].sort((x, y) => x - y);
  return { ...notes, [i]: next };
}

/** Clear square `i`'s notes: its key goes, so it shows the candidates (checkbox on) or nothing (off). */
export function clearNotes(notes: SudokuNotes, i: number): SudokuNotes {
  const out = { ...notes };
  delete out[i];
  return out;
}
