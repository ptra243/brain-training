// Hints for the map and grid, from the house cat. Each ask goes one step
// further: cross out wrong marks in red pencil, then point at the next square
// her clues settle, then show why (the clue, or her own marks), then mark it.
// Only clues she has found count, so a hint never jumps ahead of her casebook.

import { content } from '../content/index.ts';
import { compileClue, type ClueContext } from '../engine/clues.ts';
import { roomAdjacency } from '../engine/house.ts';
import { anyMatching, type Space } from '../engine/search.ts';
import type { Case, Clue, ClueFact } from '../engine/types.ts';
import { axes, cellState, markKey, sharedRooms, type Action, type GridKind, type Mark, type Progress } from './state.ts';

export interface GridCell {
  kind: GridKind;
  row: string;
  col: string;
}

/** Why a square is settled: these clues (with her marks), or her marks alone. */
export type GridReason = { type: 'clues'; clues: string[] } | { type: 'marks' };

export type GridHint =
  /** Her marks that are wrong, keyed by `markKey`. */
  | { kind: 'wrong'; marks: Record<string, Mark> }
  /** Look here: this square is settled. */
  | { kind: 'nudge'; cell: GridCell; value: Mark; reason: GridReason }
  /** What settles it. `again` when she asked again but the cat won't fill it in yet. */
  | { kind: 'why'; cell: GridCell; value: Mark; reason: GridReason; again?: boolean }
  /** Mark it. */
  | { kind: 'fill'; cell: GridCell; value: Mark }
  /** Her clues settle nothing more: she needs another puzzle's clues. */
  | { kind: 'more-clues' }
  /** Every square is marked and right. */
  | { kind: 'done' };

export interface GridHintState {
  /** Wrong marks already pointed out, by `markKey`. Not pointed out again while unchanged. */
  flagged?: Record<string, Mark>;
  /** `markKey` of the square the last hint was about. */
  target?: string;
  /** How far the hint on `target` has got. */
  step?: 'nudge' | 'why';
  /** How many hints she asked for. */
  count?: number;
}

const KINDS: readonly GridKind[] = ['suspect-room', 'suspect-item', 'item-room'];

/** A square as a fact: ticked (`o`) or crossed out (`x`). */
export function cellFact({ kind, row, col }: GridCell, value: Mark): ClueFact {
  const yes = value === 'o';
  switch (kind) {
    case 'suspect-room':
      return { type: yes ? 'suspect-room' : 'suspect-not-room', suspect: row, room: col };
    case 'suspect-item':
      return { type: yes ? 'suspect-item' : 'suspect-not-item', suspect: row, item: col };
    case 'item-room':
      return { type: yes ? 'item-room' : 'item-not-room', item: row, room: col };
  }
}

const flip = (m: Mark): Mark => (m === 'o' ? 'x' : 'o');

const caseContext = (c: Case): ClueContext => ({ suspects: c.suspects, adjacency: roomAdjacency(content.house) });
const caseSpace = (c: Case): Space => ({ suspects: c.suspects, rooms: c.rooms, items: c.items, shared: sharedRooms(c) });

export function allCells(c: Case): GridCell[] {
  return KINDS.flatMap((kind) => {
    const { rows, cols } = axes(c, kind);
    return rows.flatMap((row) => cols.map((col) => ({ kind, row, col })));
  });
}

/** What a square really is. */
export function truth(c: Case, cell: GridCell, ctx = caseContext(c)): Mark {
  return compileClue(cellFact(cell, 'o'), ctx)(c.solution) ? 'o' : 'x';
}

/** Her marks that are wrong and haven't been pointed out yet (or have changed since). */
export function newlyWrong(c: Case, p: Progress, flagged: Record<string, Mark> = {}): Record<string, Mark> {
  const ctx = caseContext(c);
  const out: Record<string, Mark> = {};
  for (const cell of allCells(c)) {
    const key = markKey(cell.kind, cell.row, cell.col);
    const mark = p.marks[key];
    if (mark && mark !== truth(c, cell, ctx) && flagged[key] !== mark) out[key] = mark;
  }
  return out;
}

/** Whether a flagged mark is still there to show in red. */
export const showsWrong = (p: Progress, state: GridHintState | undefined, key: string) => !!p.marks[key] && state?.flagged?.[key] === p.marks[key];

interface Settled {
  cell: GridCell;
  value: Mark;
  reason: GridReason;
}

/** What she knows: her right marks as facts, and a test for whether facts can all be true. */
function knowledge(c: Case, p: Progress) {
  const ctx = caseContext(c);
  const space = caseSpace(c);
  const markFacts = allCells(c).flatMap((cell) => {
    const m = p.marks[markKey(cell.kind, cell.row, cell.col)];
    return m && m === truth(c, cell, ctx) ? [cellFact(cell, m)] : [];
  });
  return { markFacts, possible: (facts: ClueFact[]) => anyMatching(space, facts, ctx) };
}

/** Why a settled square is settled, and how hard that is to see (lower is easier). */
function explain(k: ReturnType<typeof knowledge>, clues: readonly Clue[], cell: GridCell, value: Mark): { reason: GridReason; rank: number } {
  const { markFacts, possible } = k;
  const against = cellFact(cell, flip(value));
  const single = clues.find((cl) => !possible([...markFacts, cl.fact, against]));
  if (single) return { reason: { type: 'clues', clues: [single.id] }, rank: 0 };
  if (!possible([...markFacts, against])) return { reason: { type: 'marks' }, rank: 1 };
  // Drop clues it doesn't need, leaving a small set that still settles it.
  let need = clues.slice();
  for (const cl of clues) {
    const without = need.filter((x) => x !== cl);
    if (!possible([...markFacts, ...without.map((x) => x.fact), against])) need = without;
  }
  return { reason: { type: 'clues', clues: need.map((x) => x.id) }, rank: 1 + need.length };
}

/**
 * The squares her clues and right marks settle that she hasn't marked yet,
 * easiest first: one clue on its own, then her marks alone, then clues
 * together; ticks before crosses. `firstOnly` stops at the first easiest one.
 */
export function settledSquares(c: Case, p: Progress, clues: readonly Clue[], firstOnly = false): Settled[] {
  const k = knowledge(c, p);
  const known = [...k.markFacts, ...clues.map((cl) => cl.fact)];
  const out: (Settled & { rank: number })[] = [];
  for (const cell of allCells(c)) {
    // Faint crosses from a tick in the same line count as marked.
    if (cellState(c, p, cell.kind, cell.row, cell.col)) continue;
    let value: Mark | null = null;
    if (!k.possible([...known, cellFact(cell, 'o')])) value = 'x';
    else if (!k.possible([...known, cellFact(cell, 'x')])) value = 'o';
    if (!value) continue;
    const { reason, rank } = explain(k, clues, cell, value);
    // A tick moves her on further than a cross.
    out.push({ cell, value, reason, rank: rank * 2 + (value === 'o' ? 0 : 1) });
    if (firstOnly && rank === 0 && value === 'o') break;
  }
  return out.sort((a, b) => a.rank - b.rank).map(({ cell, value, reason }) => ({ cell, value, reason }));
}

const keyOf = (cell: GridCell) => markKey(cell.kind, cell.row, cell.col);

export function cellOf(key: string): GridCell {
  const [kind, row, col] = key.split('|');
  return { kind: kind as GridKind, row, col };
}

/**
 * The next hint. `clues` are the clues she can read. The cat only points the
 * way (where, then why); it fills a square in only when `canFill`, meaning
 * she has every clue there is and no puzzle is left to help her.
 */
export function gridHint(c: Case, p: Progress, clues: readonly Clue[], state: GridHintState = {}, canFill = true): GridHint {
  const wrong = newlyWrong(c, p, state.flagged);
  if (Object.keys(wrong).length) return { kind: 'wrong', marks: wrong };

  // Carry on with the square she was pointed at, while it's still blank.
  const cell = state.target ? cellOf(state.target) : null;
  if (cell && !cellState(c, p, cell.kind, cell.row, cell.col)) {
    const value = truth(c, cell);
    if (state.step === 'why' && canFill) return { kind: 'fill', cell, value };
    return { kind: 'why', cell, value, reason: explain(knowledge(c, p), clues, cell, value).reason, again: state.step === 'why' };
  }

  const [next] = settledSquares(c, p, clues, true);
  if (next) return { kind: 'nudge', ...next };
  const blank = allCells(c).some((cell) => !cellState(c, p, cell.kind, cell.row, cell.col));
  return blank ? { kind: 'more-clues' } : { kind: 'done' };
}

/** The taps that turn a blank square into this mark (blank → cross → tick). */
export function markActions(cell: GridCell, value: Mark): Action[] {
  const tap: Action = { type: 'cycle', ...cell };
  return value === 'x' ? [tap] : [tap, tap];
}

/** The state after taking a hint (marks for `fill` are made by the caller). */
export function afterHint(state: GridHintState, h: GridHint): GridHintState {
  const count = (state.count ?? 0) + 1;
  switch (h.kind) {
    case 'wrong':
      return { ...state, count, flagged: { ...state.flagged, ...h.marks } };
    case 'nudge':
      return { ...state, count, target: keyOf(h.cell), step: 'nudge' };
    case 'why':
      return { ...state, count, step: 'why' };
    case 'fill':
      return { ...state, count, target: undefined, step: undefined };
    default:
      return { ...state, count };
  }
}
