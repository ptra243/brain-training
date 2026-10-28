import type { Accusation, Progress } from '../game/state.ts';
import { ACCUSATION_PARTS } from '../game/state.ts';

/** One line of the form that has been handed in: what she wrote, how it went, and whether it is crossed out. */
export interface Try {
  suspect: string;
  item: string;
  correct: number;
  /** A wrong try is struck through in red pencil; the right one stays. */
  crossed: boolean;
}

/** Her tries, oldest first, from her saved accusations (so a reload and the Casebook agree). */
export function triesList(progress: Pick<Progress, 'accusations'>): Try[] {
  return progress.accusations.map((a: Accusation) => ({
    suspect: a.suspect,
    item: a.item,
    correct: a.correct,
    crossed: a.correct < ACCUSATION_PARTS,
  }));
}

/** Her pencilled picks for the open line. */
export interface Blanks {
  suspect: string;
  item: string;
}

export const emptyBlanks: Blanks = { suspect: '', item: '' };

/** How many of the two blanks she has written in. */
export function blanksFilled(b: Blanks): number {
  return Number(Boolean(b.suspect)) + Number(Boolean(b.item));
}

/** She may hand the line in once both blanks are written and the case is not already solved. */
export function canSubmit(b: Blanks, solved: boolean): boolean {
  return !solved && blanksFilled(b) === 2;
}

/** The slip after the latest try: how many parts were right, never which. */
export function resultLine(last: Pick<Accusation, 'correct'> | undefined): string {
  if (!last) return '';
  if (last.correct >= ACCUSATION_PARTS) return 'That is the one.';
  if (last.correct === 0) return 'Neither of those was right.';
  return `${last.correct} of ${ACCUSATION_PARTS} right. Keep digging.`;
}
