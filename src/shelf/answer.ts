import type { Case } from '../engine/types.ts';
import type { Accusation, Progress } from '../game/state.ts';
import { ACCUSATION_PARTS, mentions, visibleClues } from '../game/state.ts';

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

/** Her rank for solving on the nth accusation (1-based): fewer tries, better rank. Hints and Solve never count. */
export function rankFor(accusations: number): string {
  if (accusations <= 1) return 'Master detective';
  if (accusations === 2) return 'Sharp eye';
  if (accusations === 3) return 'Good nose';
  return 'Dogged';
}

/** The line above the submit button: the rank she would get if this try is right. */
export function rightNowLine(tries: number): string {
  return `Right now: ${rankFor(tries + 1)}`;
}

/**
 * The line under a step of the night replay, first that applies: the clue that states where the guest was
 * ("You knew this"), else the earliest clue she found that names them ("Your clue"), else that she never
 * found it out. Never claims she worked it out: she may have guessed.
 */
export function shelfCite(c: Case, progress: Progress, step: { guest: string; clueText: string | null }): string {
  if (step.clueText) return `You knew this: ${step.clueText}`;
  const named = visibleClues(c, progress).find((clue) => mentions(clue, { kind: 'suspect', id: step.guest }));
  if (named) return `Your clue: ${named.text}`;
  return 'You never found this out.';
}

/** The slip after the latest try: how many parts were right, never which. */
export function resultLine(last: Pick<Accusation, 'correct'> | undefined): string {
  if (!last) return '';
  if (last.correct >= ACCUSATION_PARTS) return 'That is the one.';
  if (last.correct === 0) return 'Neither of those was right.';
  return `${last.correct} of ${ACCUSATION_PARTS} right. Keep digging.`;
}
