// The campaign opening on the shelf: when the book is on it, and the rows it lists. Pure. The actions it
// dispatches and `Progress.opening` are the classic `OpeningScene`'s, so either shell can carry on a half-done opening.

import type { Case } from '../engine/types.ts';
import { openingScript, openingStep } from '../game/opening.ts';
import type { Progress } from '../game/state.ts';

/**
 * The book shows the opening (not the room page) while chapter one's opening exists and is not done, as
 * `CampaignView` does: the first chapter, no accusation held, and nothing read back or over.
 */
export function openingActive(view: number, current: number, progress: Progress, readOnly: boolean, held: boolean): boolean {
  return view === 0 && current === 0 && !readOnly && !held && !!progress.opening && !progress.opening.done;
}

export interface GuestRow {
  guest: string;
  met: boolean;
  /** How many free clues they hand over. */
  clues: number;
}

/** The guests to meet, in seating order, with who she has met. */
export function guestRows(c: Case, progress: Progress): GuestRow[] {
  const talked = progress.opening?.talked ?? [];
  return openingScript(c).guests.map((g) => ({ guest: g.guest, met: talked.includes(g.guest), clues: g.clues.length }));
}

/** Meeting a guest happens once: the action to dispatch when their spread opens, or null if she has met them. */
export function meetAction(progress: Progress, guest: string): { type: 'opening-talk'; guest: string } | null {
  return progress.opening && !progress.opening.done && !progress.opening.talked.includes(guest) ? { type: 'opening-talk', guest } : null;
}

/** The cat's turn: only after every guest, and only when it has something to show. */
export const catReady = (c: Case, progress: Progress): boolean => openingStep(c, progress) !== 'guests' && openingScript(c).catClues.length > 0;
