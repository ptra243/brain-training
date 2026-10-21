// The number grid: up to 3 rows of `number op number op number`, with a row
// operator on the left of rows 2 and 3 that joins them to the running total.
// Inside a row x and / go before + and -; between rows the total runs top down.
// Only whole positive results count. Pure, no randomness; the solver lists every
// value a hand can reach in this shape, with one way for each.

import type { Op } from './lock.ts';

export type { Op };

export type RowIndex = 0 | 1 | 2;

export type Slot =
  | { row: RowIndex; kind: 'rowOp' }
  | { row: RowIndex; kind: 'num'; i: 0 | 1 | 2 }
  | { row: RowIndex; kind: 'op'; i: 0 | 1 };

/**
 * An operator placed in a slot: an `Op` from an unlimited palette, or (when the
 * hand has operator cards) the index of the card in `hand.ops`.
 */
export type OpRef = Op | number;

export interface Hand {
  numbers: readonly number[];
  /** 'palette': each operator is unlimited. Otherwise one card each, spent when placed. */
  ops: 'palette' | readonly Op[];
}

export interface GridRow {
  /** Joins this row to the running total; always null on row 0. */
  rowOp: OpRef | null;
  /** Indexes into `hand.numbers`. */
  nums: readonly [number | null, number | null, number | null];
  /** op i sits between num i and num i + 1. */
  ops: readonly [OpRef | null, OpRef | null];
}

/** Exactly 3 rows. Plain data, safe to save. */
export type GridFill = readonly GridRow[];

export const GRID_ROWS = 3;
export const ROW_NUMBERS = 3;
export const PALETTE: readonly Op[] = ['+', '-', '*', '/'];

// ---------- the fill ----------

export function emptyFill(): GridFill {
  return [0, 1, 2].map(() => ({ rowOp: null, nums: [null, null, null], ops: [null, null] }) as GridRow);
}

export function getSlot(fill: GridFill, slot: Slot): number | OpRef | null {
  const row = fill[slot.row];
  if (slot.kind === 'rowOp') return row.rowOp;
  if (slot.kind === 'num') return row.nums[slot.i];
  return row.ops[slot.i];
}

function setSlot(fill: GridFill, slot: Slot, value: number | OpRef | null): GridFill {
  return fill.map((row, r) => {
    if (r !== slot.row) return row;
    if (slot.kind === 'rowOp') return { ...row, rowOp: value };
    if (slot.kind === 'num') {
      const nums = row.nums.slice() as [number | null, number | null, number | null];
      nums[slot.i] = value as number | null;
      return { ...row, nums };
    }
    const ops = row.ops.slice() as [OpRef | null, OpRef | null];
    ops[slot.i] = value;
    return { ...row, ops };
  });
}

export function sameSlot(a: Slot, b: Slot): boolean {
  if (a.row !== b.row || a.kind !== b.kind) return false;
  return (a as { i?: number }).i === (b as { i?: number }).i;
}

/** Every slot of the grid, top to bottom, left to right. */
export function allSlots(): Slot[] {
  const out: Slot[] = [];
  for (const row of [0, 1, 2] as const) {
    if (row > 0) out.push({ row, kind: 'rowOp' });
    out.push({ row, kind: 'num', i: 0 }, { row, kind: 'op', i: 0 }, { row, kind: 'num', i: 1 });
    out.push({ row, kind: 'op', i: 1 }, { row, kind: 'num', i: 2 });
  }
  return out;
}

/** The hand's number indexes already placed. */
export function usedNumbers(fill: GridFill): number[] {
  const out: number[] = [];
  for (const row of fill) for (const n of row.nums) if (n !== null) out.push(n);
  return out;
}

/** The hand's operator-card indexes already placed (palette operators never count). */
export function usedOpCards(fill: GridFill): number[] {
  const out: number[] = [];
  for (const row of fill) {
    if (typeof row.rowOp === 'number') out.push(row.rowOp);
    for (const o of row.ops) if (typeof o === 'number') out.push(o);
  }
  return out;
}

/**
 * Puts a card in a slot, replacing what was there. A number slot takes a number
 * index; an operator slot takes a palette `Op` or an operator-card index. A card
 * already placed in a different slot can't be placed twice (palette operators
 * can): the fill comes back unchanged. A row-0 `rowOp` slot does not exist, so
 * that is a no-op too.
 */
export function place(fill: GridFill, slot: Slot, card: number | OpRef): GridFill {
  if (slot.kind === 'rowOp' && slot.row === 0) return fill;
  if (slot.kind === 'num') {
    if (typeof card !== 'number') return fill;
    for (const other of allSlots()) {
      if (other.kind === 'num' && !sameSlot(other, slot) && getSlot(fill, other) === card) return fill;
    }
  } else if (typeof card === 'number') {
    for (const other of allSlots()) {
      if (other.kind !== 'num' && !sameSlot(other, slot) && getSlot(fill, other) === card) return fill;
    }
  }
  return setSlot(fill, slot, card);
}

export function clear(fill: GridFill, slot: Slot): GridFill {
  return setSlot(fill, slot, null);
}

export function clearAll(): GridFill {
  return emptyFill();
}

// ---------- arithmetic ----------

/** `a op b` when the result is whole and positive, otherwise null. */
function applyOp(a: number, b: number, op: Op): number | null {
  if (op === '+') return a + b;
  if (op === '*') return a * b;
  if (op === '-') return a > b ? a - b : null;
  return b > 0 && a % b === 0 ? a / b : null;
}

/** One row: x and / first, then + and - left to right. `bad` is the op index that fails. */
function evalRow(vals: readonly number[], ops: readonly Op[]): { value: number | null; bad: number | null } {
  const terms: number[] = [];
  const addOps: number[] = [];
  let cur = vals[0];
  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === '*' || ops[i] === '/') {
      const r = applyOp(cur, vals[i + 1], ops[i]);
      if (r === null) return { value: null, bad: i };
      cur = r;
    } else {
      terms.push(cur);
      addOps.push(i);
      cur = vals[i + 1];
    }
  }
  terms.push(cur);
  let acc = terms[0];
  for (let j = 0; j < addOps.length; j++) {
    const r = applyOp(acc, terms[j + 1], ops[addOps[j]]);
    if (r === null) return { value: null, bad: addOps[j] };
    acc = r;
  }
  return { value: acc, bad: null };
}

function resolveOp(hand: Hand, ref: OpRef | null): Op | null {
  if (ref === null) return null;
  if (hand.ops === 'palette') return typeof ref === 'string' ? ref : null;
  return typeof ref === 'number' ? (hand.ops[ref] ?? null) : null;
}

function resolveNum(hand: Hand, ref: number | null): number | null {
  if (ref === null) return null;
  return hand.numbers[ref] ?? null;
}

// ---------- evaluate ----------

export interface RowEval {
  /** Any slot of the row (its row operator included) is filled. */
  used: boolean;
  value: number | null;
  /** The running total down to and including this row. */
  total: number | null;
}

export interface GridEval {
  rows: RowEval[];
  /** The operator slots whose operation breaks the whole-positive rule (show red). */
  errors: Slot[];
  /** The last running total of the last used row; null while anything is incomplete. */
  answer: number | null;
  numbersUsed: number;
  /** A complete answer using at least 2 numbers. */
  submittable: boolean;
}

export function evaluateGrid(hand: Hand, fill: GridFill): GridEval {
  const rows: RowEval[] = [];
  const errors: Slot[] = [];
  let numbersUsed = 0;
  let lastUsed = -1;
  let incomplete = false;
  let sawEmpty = false;

  for (const r of [0, 1, 2] as const) {
    const row = fill[r];
    const count = row.nums.filter((n) => n !== null).length;
    const used = count > 0 || row.ops.some((o) => o !== null) || (r > 0 && row.rowOp !== null);
    if (!used) {
      sawEmpty = true;
      rows.push({ used: false, value: null, total: null });
      continue;
    }
    numbersUsed += count;
    lastUsed = r;
    if (sawEmpty) incomplete = true;

    // The row: a filled prefix of numbers with an op between each, and nothing else.
    let k = 0;
    while (k < ROW_NUMBERS && row.nums[k] !== null) k++;
    let shaped = k >= 1 && row.nums.slice(k).every((n) => n === null);
    if (shaped) for (let i = 0; i < 2; i++) if ((row.ops[i] !== null) !== i < k - 1) shaped = false;
    let value: number | null = null;
    if (shaped) {
      const vals = row.nums.slice(0, k).map((n) => resolveNum(hand, n));
      const ops = row.ops.slice(0, k - 1).map((o) => resolveOp(hand, o));
      if (!vals.includes(null) && !ops.includes(null)) {
        const res = evalRow(vals as number[], ops as Op[]);
        value = res.value;
        if (res.bad !== null) errors.push({ row: r, kind: 'op', i: res.bad as 0 | 1 });
      }
    }

    let total: number | null = null;
    if (r === 0) total = value;
    else if (value !== null) {
      const prev = rows[r - 1].total;
      const op = resolveOp(hand, row.rowOp);
      if (prev !== null && op !== null) {
        total = applyOp(prev, value, op);
        if (total === null) errors.push({ row: r, kind: 'rowOp' });
      }
    }
    if (value === null || total === null) incomplete = true;
    rows.push({ used: true, value, total });
  }

  const answer = !incomplete && lastUsed >= 0 ? rows[lastUsed].total : null;
  return { rows, errors, answer, numbersUsed, submittable: answer !== null && numbersUsed >= 2 };
}

// ---------- text ----------

const GLYPH: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/** Operator glyph for display text: + − × ÷. */
export function opGlyph(op: Op): string {
  return GLYPH[op];
}

/**
 * One line per used row. Row 0: "25 × 4 = 100". Later rows lead with their row
 * operator and end with the row value and the running total: "+ 7 × 3 − 1 = 20 → 120".
 * An empty or broken slot shows as "_" and the "=" part is left off.
 */
export function gridLines(hand: Hand, fill: GridFill): string[] {
  const ev = evaluateGrid(hand, fill);
  const lines: string[] = [];
  for (const r of [0, 1, 2] as const) {
    if (!ev.rows[r].used) continue;
    const row = fill[r];
    const parts: string[] = [];
    if (r > 0) {
      const op = resolveOp(hand, row.rowOp);
      parts.push(op ? GLYPH[op] : '_');
    }
    for (let i = 0; i < ROW_NUMBERS; i++) {
      const n = resolveNum(hand, row.nums[i]);
      const o = i < 2 ? resolveOp(hand, row.ops[i]) : null;
      if (i > 0 && n === null && row.ops[i - 1] === null) break;
      parts.push(n === null ? '_' : String(n));
      if (i < 2 && (o !== null || row.nums[i + 1] !== null)) parts.push(o ? GLYPH[o] : '_');
      else break;
    }
    let line = parts.join(' ');
    const { value, total } = ev.rows[r];
    if (value !== null) {
      line += ` = ${value}`;
      if (r > 0 && total !== null) line += ` → ${total}`;
    }
    lines.push(line);
  }
  return lines;
}

/** `gridLines` joined with "; ", so one row reads "9 × 4 + 2 = 38". */
export function gridText(hand: Hand, fill: GridFill): string {
  return gridLines(hand, fill).join('; ');
}

// ---------- solver ----------

export interface GridWay {
  fill: GridFill;
  numbersUsed: number;
  rows: number;
}

interface RowWay {
  nums: number[];
  ops: OpRef[];
}

interface State {
  mask: number;
  /** Operator cards spent (always 0 for a palette). */
  opMask: number;
  value: number;
  rows: number;
  prev: State | null;
  rowOp: OpRef | null;
  row: RowWay;
}

interface OpChoice {
  ref: OpRef;
  op: Op;
  bit: number;
}

const POP: number[] = [0];
for (let i = 1; i < 1024; i++) POP[i] = POP[i >> 1] + (i & 1);

function popcount(m: number): number {
  return POP[m];
}

class StateSet {
  map = new Map<number, Map<number, State>>();
  list: State[] = [];
  add(s: State): void {
    const key = s.mask + s.opMask * 256;
    let inner = this.map.get(key);
    if (!inner) this.map.set(key, (inner = new Map()));
    if (inner.has(s.value)) return;
    inner.set(s.value, s);
    this.list.push(s);
  }
}

const PALETTE_CHOICES: readonly OpChoice[] = PALETTE.map((op) => ({ ref: op, op, bit: 0 }));

function opChoices(hand: Hand, usedMask: number): readonly OpChoice[] {
  if (hand.ops === 'palette') return PALETTE_CHOICES;
  const out: OpChoice[] = [];
  hand.ops.forEach((op, i) => {
    if (!(usedMask & (1 << i))) out.push({ ref: i, op, bit: 1 << i });
  });
  return out;
}

function fillOf(state: State): GridFill {
  const chain: State[] = [];
  for (let s: State | null = state; s; s = s.prev) chain.unshift(s);
  const fill = emptyFill().map((row, r) => {
    const s = chain[r];
    if (!s) return row;
    const nums: (number | null)[] = [null, null, null];
    s.row.nums.forEach((n, i) => (nums[i] = n));
    const ops: (OpRef | null)[] = [null, null];
    s.row.ops.forEach((o, i) => (ops[i] = o));
    return {
      rowOp: s.rowOp,
      nums: nums as unknown as GridRow['nums'],
      ops: ops as unknown as GridRow['ops'],
    };
  });
  return fill;
}

/**
 * Every value reachable in the grid's shape with at least 2 numbers (and at most
 * `maxNumbers`, default all), each with one preferred way: fewest numbers, then
 * fewest rows, then the first found in a fixed order. With operator cards each
 * card is used at most once, row operators included. Each number is used once.
 */
export function gridValues(hand: Hand, maxNumbers = hand.numbers.length): Map<number, GridWay> {
  const n = hand.numbers.length;
  const full = (1 << n) - 1;
  const cap = Math.min(maxNumbers, n);

  // Level 1: every row, from ordered picks of up to 3 numbers.
  const level1 = new StateSet();
  const rowByMask: State[][] = Array.from({ length: full + 1 }, () => []);

  const buildOps = (nums: number[], vals: number[], mask: number, ops: OpChoice[], opMask: number): void => {
    if (ops.length === nums.length - 1) {
      const res = evalRow(vals, ops.map((o) => o.op));
      if (res.value === null) return;
      level1.add({
        mask,
        opMask,
        value: res.value,
        rows: 1,
        prev: null,
        rowOp: null,
        row: { nums: nums.slice(), ops: ops.map((o) => o.ref) },
      });
      return;
    }
    for (const c of opChoices(hand, opMask)) {
      ops.push(c);
      buildOps(nums, vals, mask, ops, opMask | c.bit);
      ops.pop();
    }
  };
  const buildNums = (nums: number[], mask: number): void => {
    buildOps(nums, nums.map((i) => hand.numbers[i]), mask, [], 0);
    if (nums.length === Math.min(ROW_NUMBERS, cap)) return;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;
      nums.push(i);
      buildNums(nums, mask | (1 << i));
      nums.pop();
    }
  };
  for (let i = 0; i < n; i++) buildNums([i], 1 << i);
  for (const s of level1.list) rowByMask[s.mask].push(s);

  // Best way per value over all levels.
  const best = new Map<number, State>();
  const consider = (s: State): void => {
    if (popcount(s.mask) < 2) return;
    const old = best.get(s.value);
    if (!old) {
      best.set(s.value, s);
      return;
    }
    const a = popcount(s.mask);
    const b = popcount(old.mask);
    if (a < b || (a === b && s.rows < old.rows)) best.set(s.value, s);
  };
  const worthIt = (value: number, mask: number, rows: number): boolean => {
    const old = best.get(value);
    if (!old) return true;
    const a = popcount(mask);
    const b = popcount(old.mask);
    return a < b || (a === b && rows < old.rows);
  };

  for (const s of level1.list) consider(s);

  // Levels 2 and 3: add a row on the bottom, with a row operator.
  let current = level1.list;
  for (let rows = 2; rows <= GRID_ROWS; rows++) {
    const next = new StateSet();
    const last = rows === GRID_ROWS;
    for (const st of current) {
      const left = full & ~st.mask;
      const have = popcount(st.mask);
      for (let sub = left; sub > 0; sub = (sub - 1) & left) {
        if (have + popcount(sub) > cap) continue;
        const mask = st.mask | sub;
        for (const row of rowByMask[sub]) {
          if (row.opMask & st.opMask) continue;
          const used = st.opMask | row.opMask;
          for (const rop of opChoices(hand, used)) {
            const value = applyOp(st.value, row.value, rop.op);
            if (value === null) continue;
            if (last && !worthIt(value, mask, rows)) continue;
            const ns: State = {
              mask,
              opMask: used | rop.bit,
              value,
              rows,
              prev: st,
              rowOp: rop.ref,
              row: row.row,
            };
            if (last) consider(ns);
            else next.add(ns);
          }
        }
      }
    }
    if (!last) {
      for (const s of next.list) consider(s);
      current = next.list;
    }
  }

  const out = new Map<number, GridWay>();
  for (const [value, s] of best) out.set(value, { fill: fillOf(s), numbersUsed: popcount(s.mask), rows: s.rows });
  return out;
}

/** The preferred way to exactly `target` (at least 2 numbers, at most `maxNumbers`), or null. */
export function solveGrid(hand: Hand, target: number, maxNumbers?: number): GridWay | null {
  return gridValues(hand, maxNumbers).get(target) ?? null;
}
