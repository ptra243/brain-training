// The case board's rules and saved play, as plain data. No React; the only content it reads is the
// list of guest ids (the default for `Rules.guests`). The screen (CaseBoard.tsx) turns the structured
// reasons here into words.
//
// A piece is "pinned" when it starts on the board and never moves: the body,
// the filler, and the pieces `board.pinned[level]` names. Everything else is
// loose and lives either in the tray or in `save.placed`.
//
// Two kinds of rule:
//  - a piece's own rules (rooms ruled out, rooms it is limited to, grey only
//    in Unknown) and rules against a pinned partner REFUSE a drop (`blocker`);
//  - rules between two loose pieces (touch, apart, same guest in one section)
//    never refuse. They show up as `clashes` and as touches not met yet.

import { content } from '../../content/index.ts';
import type { Board, BoardCell, BoardMarks, BoardPiece } from '../../engine/boardTypes.ts';
import { UNKNOWN, boardKey } from '../../engine/boardTypes.ts';
import type { Difficulty } from '../../engine/types.ts';

export interface PlacedPiece {
  section: string;
  /** The squares it covers on the board, in the same order as `shape`. */
  cells: BoardCell[];
  /** Its squares as turned, normalised to start at 0,0. Same order as the piece's own shape, so square i keeps its symbol. */
  shape: BoardCell[];
}

export interface BoardSave {
  placed: Record<string, PlacedPiece>;
  /** Quarter turns for pieces in the tray. */
  rot: Record<string, number>;
  /** Hint step per piece: 1 = which section, 2 = its outline. */
  hints: Record<string, number>;
  hintCount: number;
}

export const boardInitial = (): BoardSave => ({ placed: {}, rot: {}, hints: {}, hintCount: 0 });

// ---------- Shapes ----------

export function normCells(cells: readonly BoardCell[]): BoardCell[] {
  if (!cells.length) return [];
  const r0 = Math.min(...cells.map((x) => x[0]));
  const c0 = Math.min(...cells.map((x) => x[1]));
  return cells.map(([r, c]) => [r - r0, c - c0] as BoardCell);
}

/** A quarter turn clockwise. Keeps the order of squares. */
export const turnCells = (cells: readonly BoardCell[]): BoardCell[] => normCells(cells.map(([r, c]) => [c, -r] as BoardCell));

/** The same squares in any order give the same key, wherever they sit. */
export const cellsKey = (cells: readonly BoardCell[]): string =>
  normCells(cells).map(([r, c]) => boardKey(r, c)).sort().join(';');

/** A shape turned `rot` quarter turns. */
export function orient(shape: readonly BoardCell[], rot: number): BoardCell[] {
  let cells = normCells(shape);
  for (let i = 0; i < (((rot % 4) + 4) % 4); i++) cells = turnCells(cells);
  return cells;
}

/** Every different way of turning a shape. */
export function rotations(shape: readonly BoardCell[]): BoardCell[][] {
  const out: BoardCell[][] = [];
  let cur = normCells(shape);
  for (let i = 0; i < 4; i++) {
    if (!out.some((o) => cellsKey(o) === cellsKey(cur))) out.push(cur);
    cur = turnCells(cur);
  }
  return out;
}

export const sameCells = (a: readonly BoardCell[], b: readonly BoardCell[]) =>
  a.length === b.length && a.every(([r, c], i) => b[i][0] === r && b[i][1] === c);

// ---------- Rules for one board at one level ----------

export interface Pair {
  sym: string;
  a: string;
  b: string;
}

export interface Rules {
  /** The board as she sees it: marks of hidden pieces (and the symbols they share) are blanked until she finishes. */
  board: Board;
  level: Difficulty;
  piece: Record<string, BoardPiece>;
  touch: Pair[];
  anti: Pair[];
  pinned: Set<string>;
  /** Where each pinned piece sits. */
  pinnedPlace: Record<string, PlacedPiece>;
  /** "r,c" → pinned piece covering it. */
  pinnedOcc: Record<string, Occ>;
  /** The other pieces of the same guest. */
  siblings: Record<string, string[]>;
  /** Read-only: the board is done, hidden pieces show what they are. */
  finished: boolean;
  /** Everyone at dinner (`Case.guests`): decides whether a lone heir is "The Heir". Default: every guest in the content. */
  guests: readonly string[];
  /** Names the case gives some pieces: a house detail for each filler piece, the puzzle behind each hunch. */
  labels?: PieceLabels;
}

export interface PieceLabels {
  /** Filler piece id → something she noticed about the house. */
  noticed: Record<string, string>;
  /** Grey piece id → the puzzle she hasn't played that it stands for ("the sudoku"). */
  hunchFor: Record<string, string>;
}

export interface Occ {
  pid: string;
  /** Which square of the piece this is, in the piece's own order. */
  i: number;
}

const noMarks = (): BoardMarks => ({ not: [], only: null, sym: [], anti: [] });

/**
 * What she is allowed to know. While a piece is hidden (the puzzle's own
 * reward clue) its marks, and the symbols it shares with a partner, are blank.
 */
export function visibleBoard(board: Board, finished: boolean): Board {
  if (finished || !board.pieces.some((p) => p.hidden)) return board;
  const secret = new Set<string>();
  for (const p of board.pieces) if (p.hidden) [...p.marks.sym, ...p.marks.anti].forEach((s) => secret.add(s));
  return {
    ...board,
    pieces: board.pieces.map((p) =>
      p.hidden
        ? { ...p, marks: noMarks() }
        : { ...p, marks: { ...p.marks, sym: p.marks.sym.filter((s) => !secret.has(s)), anti: p.marks.anti.filter((s) => !secret.has(s)) } },
    ),
  };
}

function pairsOf(pieces: readonly BoardPiece[], which: 'sym' | 'anti'): Pair[] {
  const by: Record<string, string[]> = {};
  for (const p of pieces) for (const s of p.marks[which]) (by[s] ??= []).push(p.id);
  return Object.entries(by).filter(([, ids]) => ids.length === 2).map(([sym, ids]) => ({ sym, a: ids[0], b: ids[1] }));
}

/** The squares a piece covers on its true spot, turned the way its tray shape has to be to land there. */
export function truthPlacement(board: Board, pid: string): PlacedPiece {
  const piece = board.pieces.find((p) => p.id === pid);
  const t = board.truth[pid];
  if (!piece || !t) throw new Error(`no piece ${pid}`);
  const want = cellsKey(t.cells);
  let shape = normCells(piece.shape);
  for (let k = 0; k < 4 && cellsKey(shape) !== want; k++) shape = turnCells(shape);
  const r0 = Math.min(...t.cells.map((x) => x[0]));
  const c0 = Math.min(...t.cells.map((x) => x[1]));
  return { section: t.section, shape, cells: shape.map(([r, c]) => [r + r0, c + c0] as BoardCell) };
}

export function pinnedIds(board: Board, level: Difficulty): string[] {
  const always = board.pieces.filter((p) => p.kind === 'body' || p.kind === 'fog').map((p) => p.id);
  return [...new Set([...always, ...(board.pinned[level] ?? [])])];
}

export function makeRules(source: Board, level: Difficulty, finished = false, guests: readonly string[] = content.suspects.map((s) => s.id)): Rules {
  const board = visibleBoard(source, finished);
  const piece = Object.fromEntries(board.pieces.map((p) => [p.id, p]));
  const pinned = new Set(pinnedIds(board, level));
  const pinnedPlace: Record<string, PlacedPiece> = {};
  const pinnedOcc: Record<string, Occ> = {};
  for (const pid of pinned) {
    const place = truthPlacement(source, pid);
    pinnedPlace[pid] = place;
    place.cells.forEach(([r, c], i) => (pinnedOcc[boardKey(r, c)] = { pid, i }));
  }
  const siblings: Record<string, string[]> = {};
  for (const p of board.pieces) {
    siblings[p.id] = p.kind === 'guest' ? board.pieces.filter((q) => q.kind === 'guest' && q.who === p.who && q.id !== p.id).map((q) => q.id) : [];
  }
  return { board, level, piece, touch: pairsOf(board.pieces, 'sym'), anti: pairsOf(board.pieces, 'anti'), pinned, pinnedPlace, pinnedOcc, siblings, finished, guests };
}

/** The pieces a piece must touch. */
export const partnersOf = (r: Rules, pid: string) => r.touch.filter((t) => t.a === pid || t.b === pid).map((t) => (t.a === pid ? t.b : t.a));

/** Pieces she can move: not pinned. */
export const isLoose = (r: Rules, pid: string) => !r.pinned.has(pid);

/** All loose pieces that aren't on the board yet. */
export const trayIds = (r: Rules, save: BoardSave) => r.board.pieces.filter((p) => isLoose(r, p.id) && !save.placed[p.id]).map((p) => p.id);

/** "piece 2 of 3" numbers for a guest with several pieces (null for everything else). */
export function pieceNumber(r: Rules, pid: string): { n: number; of: number } | null {
  const p = r.piece[pid];
  if (p?.kind !== 'guest') return null;
  const all = r.board.pieces.filter((q) => q.kind === 'guest' && q.who === p.who);
  return all.length > 1 ? { n: all.findIndex((q) => q.id === pid) + 1, of: all.length } : null;
}

/** The tokens printed on a piece's squares: touch symbols (only ones with a partner), then apart symbols. */
export function tokensOf(r: Rules, pid: string): { cls: 'sym' | 'anti'; s: string }[] {
  const syms = r.touch.filter((t) => t.a === pid || t.b === pid).map((t) => ({ cls: 'sym' as const, s: t.sym }));
  const antis = r.anti.filter((t) => t.a === pid || t.b === pid).map((t) => ({ cls: 'anti' as const, s: t.sym }));
  return [...syms, ...antis];
}

// ---------- Where things are ----------

export function occupancy(r: Rules, save: BoardSave, skip?: string | null): Record<string, Occ> {
  const occ: Record<string, Occ> = { ...r.pinnedOcc };
  for (const [pid, p] of Object.entries(save.placed)) {
    if (pid === skip || r.pinned.has(pid)) continue;
    p.cells.forEach(([row, col], i) => (occ[boardKey(row, col)] = { pid, i }));
  }
  return occ;
}

export const placementOf = (r: Rules, save: BoardSave, pid: string): PlacedPiece | undefined =>
  r.pinned.has(pid) ? r.pinnedPlace[pid] : save.placed[pid];

export const sectionOf = (r: Rules, save: BoardSave, pid: string) => placementOf(r, save, pid)?.section;

export const sectionAt = (board: Board, row: number, col: number): string | undefined => board.cells[boardKey(row, col)];

const SIDES: readonly BoardCell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Does piece a share an edge with piece b? */
export function touching(r: Rules, save: BoardSave, a: string, b: string, occ: Record<string, Occ>): boolean {
  const A = placementOf(r, save, a);
  if (!A) return false;
  return A.cells.some(([row, col]) => SIDES.some(([dr, dc]) => occ[boardKey(row + dr, col + dc)]?.pid === b));
}

// ---------- Refusals ----------

export type BlockCode = 'grey' | 'not' | 'only' | 'apart-pinned' | 'touch-pinned' | 'same-pinned';

export interface Block {
  code: BlockCode;
  /** The clue behind the rule, when there is one. */
  clue: string | null;
  /** The pinned piece involved. */
  other?: string;
  sym?: string;
  /** Where that pinned piece sits. */
  otherSection?: string;
}

/** Why a piece can't go in this section, or null. Only a piece's own rules and pinned partners refuse. */
export function blocker(r: Rules, pid: string, section: string): Block | null {
  const p = r.piece[pid];
  if (!p) return null;
  if (p.kind === 'grey' && section !== UNKNOWN) return { code: 'grey', clue: null };
  if (p.marks.not.includes(section)) return { code: 'not', clue: p.clue };
  // Marks are about rooms: Unknown (the clues don't place it) is always allowed for guests and weapons.
  if (p.marks.only && section !== UNKNOWN && !p.marks.only.includes(section)) return { code: 'only', clue: p.clue };
  for (const t of r.anti) {
    const other = t.a === pid ? t.b : t.b === pid ? t.a : null;
    if (other && r.pinned.has(other) && section !== UNKNOWN && r.pinnedPlace[other].section === section) {
      return { code: 'apart-pinned', clue: p.clue ?? r.piece[other].clue, other, sym: t.sym, otherSection: section };
    }
  }
  for (const t of r.touch) {
    const other = t.a === pid ? t.b : t.b === pid ? t.a : null;
    if (other && r.pinned.has(other) && r.pinnedPlace[other].section !== section) {
      return { code: 'touch-pinned', clue: p.clue ?? r.piece[other].clue, other, sym: t.sym, otherSection: r.pinnedPlace[other].section };
    }
  }
  for (const q of r.siblings[pid] ?? []) {
    if (r.pinned.has(q) && r.pinnedPlace[q].section !== section) return { code: 'same-pinned', clue: null, other: q, otherSection: r.pinnedPlace[q].section };
  }
  return null;
}

// ---------- Rules between pieces: never refuse ----------

export interface Clash {
  kind: 'touch' | 'apart' | 'same';
  ids: string[];
  sym?: string;
  /** Sections the pieces are in (two for touch, the shared one for apart, all for same). */
  sections: string[];
}

export function clashes(r: Rules, save: BoardSave): Clash[] {
  const out: Clash[] = [];
  for (const t of r.touch) {
    const a = sectionOf(r, save, t.a);
    const b = sectionOf(r, save, t.b);
    if (a && b && a !== b) out.push({ kind: 'touch', ids: [t.a, t.b], sym: t.sym, sections: [a, b] });
  }
  for (const t of r.anti) {
    const a = sectionOf(r, save, t.a);
    if (a && a !== UNKNOWN && a === sectionOf(r, save, t.b)) out.push({ kind: 'apart', ids: [t.a, t.b], sym: t.sym, sections: [a] });
  }
  const guests = new Set(r.board.pieces.filter((p) => p.kind === 'guest').map((p) => p.who));
  for (const g of guests) {
    const ids = r.board.pieces.filter((p) => p.kind === 'guest' && p.who === g && sectionOf(r, save, p.id)).map((p) => p.id);
    const where = [...new Set(ids.map((id) => sectionOf(r, save, id) as string))];
    if (where.length > 1) out.push({ kind: 'same', ids, sections: where });
  }
  return out;
}

/** Touch pairs sitting in the same section but not yet edge to edge. */
export function unmetTouches(r: Rules, save: BoardSave, occ = occupancy(r, save)): Pair[] {
  return r.touch.filter((t) => {
    const a = sectionOf(r, save, t.a);
    const b = sectionOf(r, save, t.b);
    return a && b && a === b && !touching(r, save, t.a, t.b, occ);
  });
}

export const isFull = (r: Rules, save: BoardSave, occ = occupancy(r, save)) => Object.keys(r.board.cells).every((k) => occ[k]);

export function isComplete(r: Rules, save: BoardSave): boolean {
  const occ = occupancy(r, save);
  return isFull(r, save, occ) && !clashes(r, save).length && !unmetTouches(r, save, occ).length;
}

/** Is this board finished by the player's moves? Hidden pieces' own rules aren't part of the test. */
export function boardComplete(board: Board, level: Difficulty, save: BoardSave): boolean {
  return isComplete(makeRules(board, level, false), save);
}

/** Every loose piece on its true squares (for "Solve puzzle"). */
export function boardSolvedSave(board: Board, level: Difficulty): BoardSave {
  const pinned = new Set(pinnedIds(board, level));
  const save = boardInitial();
  for (const p of board.pieces) if (!pinned.has(p.id)) save.placed[p.id] = truthPlacement(board, p.id);
  return save;
}

// ---------- Dropping a piece ----------

export type DropResult = { ok: true; section: string } | { ok: false; why: 'wall' | 'nofit' };

/** Can a piece with these squares sit here? Off the board, over another piece, or across a wall all fail. */
export function dropCheck(r: Rules, save: BoardSave, pid: string, cells: readonly BoardCell[]): DropResult {
  const occ = occupancy(r, save, pid);
  const secs = cells.map(([row, col]) => sectionAt(r.board, row, col));
  const known = secs.filter((s): s is string => !!s);
  const distinct = new Set(known);
  if (known.length === cells.length && distinct.size === 1 && !cells.some(([row, col]) => occ[boardKey(row, col)])) return { ok: true, section: known[0] };
  return { ok: false, why: known.length === cells.length && distinct.size > 1 ? 'wall' : 'nofit' };
}

/** Is there any free spot, in any turn, in a section this piece is allowed in? */
export function fitsAnywhere(r: Rules, save: BoardSave, pid: string): boolean {
  const occ = occupancy(r, save, pid);
  const base = r.piece[pid].shape;
  for (const rot of rotations(base)) {
    const first = [...rot].sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    for (const key of Object.keys(r.board.cells)) {
      if (occ[key]) continue;
      const [row, col] = key.split(',').map(Number);
      const cells = rot.map(([x, y]) => [x - first[0] + row, y - first[1] + col] as BoardCell);
      const res = dropCheck(r, save, pid, cells);
      if (res.ok && !blocker(r, pid, res.section)) return true;
    }
  }
  return false;
}

// ---------- Changing a save (always a new object) ----------

export const withPlaced = (save: BoardSave, pid: string, placed: PlacedPiece): BoardSave => ({ ...save, placed: { ...save.placed, [pid]: placed } });

export function withoutPlaced(save: BoardSave, pid: string): BoardSave {
  const placed = { ...save.placed };
  delete placed[pid];
  return { ...save, placed };
}

export const clearPlaced = (save: BoardSave): BoardSave => ({ ...save, placed: {} });

export const withTurn = (save: BoardSave, pid: string, by = 1): BoardSave => ({ ...save, rot: { ...save.rot, [pid]: (((save.rot[pid] || 0) + by) % 4 + 4) % 4 } });

/** Ask the cat about a piece: step 1 (its section), then step 2 (its outline). Asking again at step 2 costs nothing. */
export function withHint(save: BoardSave, pid: string): { save: BoardSave; step: 1 | 2 } {
  const had = save.hints[pid] || 0;
  const step = Math.min(had + 1, 2) as 1 | 2;
  if (step <= had) return { save, step };
  return { save: { ...save, hints: { ...save.hints, [pid]: step }, hintCount: save.hintCount + 1 }, step };
}

// ---------- Check ----------

/** `boardSolvable` from the engine, or a stand-in in tests. */
export type Solvable = (board: Board, fixed: Record<string, readonly BoardCell[]>, at?: Record<string, string>) => boolean;

export type CheckResult =
  | { kind: 'empty' }
  | { kind: 'ok' }
  /** Some pieces sit in a section the clues rule out once everything has to fit. `flagged` may be empty (only the mix is wrong). */
  | { kind: 'sections'; flagged: string[] }
  /** Sections are fine but these pieces' exact squares leave gaps. `flagged` may be empty. */
  | { kind: 'gaps'; flagged: string[]; sections: string[] };

/** Check my board: exact placements first, then sections, then which piece's position leaves a gap. */
export function checkBoard(r: Rules, save: BoardSave, solvable: Solvable): CheckResult {
  const loose = Object.entries(save.placed).filter(([pid]) => !r.pinned.has(pid));
  if (!loose.length) return { kind: 'empty' };
  const pins: Record<string, readonly BoardCell[]> = Object.fromEntries([...r.pinned].map((pid) => [pid, r.pinnedPlace[pid].cells]));
  const exact: Record<string, readonly BoardCell[]> = { ...pins, ...Object.fromEntries(loose.map(([pid, p]) => [pid, p.cells])) };
  const at: Record<string, string> = Object.fromEntries(loose.map(([pid, p]) => [pid, p.section]));
  if (solvable(r.board, exact)) return { kind: 'ok' };
  if (!solvable(r.board, pins, at)) {
    const flagged = loose.filter(([pid, p]) => !solvable(r.board, pins, { [pid]: p.section })).map(([pid]) => pid);
    return { kind: 'sections', flagged };
  }
  const flagged = loose.filter(([pid, p]) => !solvable(r.board, { ...pins, [pid]: p.cells }, at)).map(([pid]) => pid);
  return { kind: 'gaps', flagged, sections: [...new Set(flagged.map((pid) => at[pid]))] };
}
