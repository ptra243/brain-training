// Small pure helpers for the Nosing around screen: board geometry, the cat's
// walk, the number pad, dice faces and the lock's wording. No React.

import type { House } from '../../engine/types.ts';
import type { NosingBoard } from '../../games/nosingBoard.ts';
import type { Op, Step } from '../../games/lock.ts';

export interface Point {
  x: number;
  y: number;
}

/** The centre of path index `i`, in squares (the SVG's units). */
export function squareCentre(board: NosingBoard, i: number): Point {
  const s = board.path[i];
  return { x: (s % board.width) + 0.5, y: Math.floor(s / board.width) + 0.5 };
}

export interface RoomSquare {
  x: number;
  y: number;
  /** Room id, or null outside the house. */
  room: string | null;
}

/** Every square of the board with the room it sits in (path or not). */
export function roomSquares(house: House, board: NosingBoard): RoomSquare[] {
  const owner = new Map<string, string>();
  for (const r of house.rooms) for (const [y, x] of r.cells) owner.set(`${y},${x}`, r.id);
  const out: RoomSquare[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      out.push({ x, y, room: owner.get(`${Math.floor(y / board.n)},${Math.floor(x / board.n)}`) ?? null });
    }
  }
  return out;
}

export interface WallLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The wall segments: every edge between two different rooms, or a room and outside. */
export function wallLines(squares: readonly RoomSquare[], width: number, height: number): WallLine[] {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? null : squares[y * width + x].room);
  const out: WallLine[] = [];
  for (const s of squares) {
    if (!s.room) continue;
    if (at(s.x + 1, s.y) !== s.room) out.push({ x1: s.x + 1, y1: s.y, x2: s.x + 1, y2: s.y + 1 });
    if (at(s.x - 1, s.y) !== s.room) out.push({ x1: s.x, y1: s.y, x2: s.x, y2: s.y + 1 });
    if (at(s.x, s.y + 1) !== s.room) out.push({ x1: s.x, y1: s.y + 1, x2: s.x + 1, y2: s.y + 1 });
    if (at(s.x, s.y - 1) !== s.room) out.push({ x1: s.x, y1: s.y, x2: s.x + 1, y2: s.y });
  }
  return out;
}

export interface Paw {
  x: number;
  y: number;
  /** Degrees; 0 points up. */
  angle: number;
}

/** Paw prints from `a` to `b`, alternating left and right of the line. */
export function pawTrail(a: Point, b: Point, spacing: number): Paw[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [];
  const count = Math.max(2, Math.round(len / spacing));
  const nx = -dy / len;
  const ny = dx / len;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  const out: Paw[] = [];
  for (let k = 0; k < count; k++) {
    const t = (k + 0.5) / count;
    const side = k % 2 === 0 ? 1 : -1;
    out.push({ x: a.x + dx * t + nx * side * spacing * 0.18, y: a.y + dy * t + ny * side * spacing * 0.18, angle });
  }
  return out;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A loose strand from `a` to `b`: one S-bend, a little off the straight line. */
export function woolPath(a: Point, b: Point): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * len * 0.22;
  const ny = (dx / len) * len * 0.22;
  const c1 = { x: a.x + dx / 3 + nx, y: a.y + dy / 3 + ny };
  const c2 = { x: a.x + (2 * dx) / 3 - nx, y: a.y + (2 * dy) / 3 - ny };
  return `M${r2(a.x)} ${r2(a.y)} C${r2(c1.x)} ${r2(c1.y)} ${r2(c2.x)} ${r2(c2.y)} ${r2(b.x)} ${r2(b.y)}`;
}

/** Longest forward move the cat walks square by square; anything longer is a jump. */
export const WALK_LIMIT = 14;

/**
 * The path indexes the cat shows on, from the trail of where it landed. A roll
 * walks every square on the way; a ladder, a slide or a long move jumps.
 */
export function walkSteps(
  trail: readonly number[],
  jumps: ReadonlyMap<number, number>,
): number[] {
  const out: number[] = trail.length ? [trail[0]] : [0];
  for (let k = 1; k < trail.length; k++) {
    const a = trail[k - 1];
    const b = trail[k];
    const jump = jumps.get(a) === b || b <= a || b - a > WALK_LIMIT;
    if (jump) out.push(b);
    else for (let s = a + 1; s <= b; s++) out.push(s);
  }
  return out;
}

// --- Number pad ---

export const MAX_DIGITS = 4;

/** One press on the pad: a digit, 'back' or 'clear'. Returns the new text. */
export function padPress(text: string, key: string): string {
  if (key === 'back') return text.slice(0, -1);
  if (key === 'clear') return '';
  if (!/^[0-9]$/.test(key)) return text;
  if (text.length >= MAX_DIGITS) return text;
  if (text === '0') return key; // no leading zeros
  return text + key;
}

/** The number typed, or null when nothing is typed. */
export const padValue = (text: string): number | null => (text === '' ? null : Number(text));

// --- Dice ---

/** Pip positions on a 3x3 face, as [column, row]. */
export const PIPS: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

/** The faces for a roll: one die, or the roll split into two dice that add up to it. */
export function diceFaces(dice: number, total: number): number[] {
  if (dice <= 1) return [Math.min(6, Math.max(1, total))];
  const a = Math.min(6, Math.ceil(total / 2));
  const b = Math.min(6, Math.max(1, total - a));
  return [a, b];
}

// --- Wording ---

export const OP_SIGN: Readonly<Record<Op, string>> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
export const OPS: readonly Op[] = ['+', '-', '*', '/'];
export const OP_NAME: Readonly<Record<Op, string>> = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by' };

export const stepText = (s: Step): string => `${s.a} ${OP_SIGN[s.op]} ${s.b} = ${s.result}`;

/** "square 7": squares count from 1 for her. */
export const squareName = (pathIndex: number): string => `square ${pathIndex + 1}`;
