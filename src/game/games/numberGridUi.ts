// Small pure helpers for the number grid screen. No React.

import { nosingGridProblems } from '../../content/nosing.ts';
import { allSlots, getSlot, sameSlot, type GridFill, type Hand, type RowEval, type Slot } from '../../games/numberGrid.ts';

const ORDINAL = ['first', 'second', 'third'];

/** Spoken name of a grid slot: "Row 2, second number". */
export function slotLabel(slot: Slot): string {
  const row = `Row ${slot.row + 1}`;
  if (slot.kind === 'rowOp') return `${row}, how it joins the total`;
  if (slot.kind === 'num') return `${row}, ${ORDINAL[slot.i]} number`;
  return `${row}, ${ORDINAL[slot.i]} sign`;
}

/**
 * The small line under a row: "= 20" for the first row, "= 20 → 120" after that
 * (the row's total, then the running total). Nothing while the row is incomplete.
 */
export function rowCaption(rowIndex: number, row: RowEval): string {
  if (row.value === null) return '';
  if (rowIndex > 0 && row.total !== null) return `= ${row.value} → ${row.total}`;
  return `= ${row.value}`;
}

/** A short reason a row shows red (its sign breaks the whole-and-positive rule), or null. */
export function rowProblem(hand: Hand, fill: GridFill, errors: readonly Slot[], row: number): string | null {
  const slot = errors.find((s) => s.row === row);
  if (!slot) return null;
  const ref = getSlot(fill, slot);
  const op = typeof ref === 'string' ? ref : typeof ref === 'number' && hand.ops !== 'palette' ? hand.ops[ref] : null;
  if (op === '/') return nosingGridProblems.divide;
  return op === '-' ? nosingGridProblems.minus : null;
}

/** True when something in the grid can be cleared (a slot that holds a card and isn't locked). */
export function hasClearable(fill: GridFill, locked: readonly Slot[]): boolean {
  return allSlots().some((slot) => getSlot(fill, slot) !== null && !locked.some((l) => sameSlot(l, slot)));
}
