// The pure parts of the sticker tin: lifting stickers (3 to 7), the hand a shake deals, the lines under
// the tin, and the quiet retry policy for a mix that will not build. No React, no crypto: callers pass in
// `rand` (the UI's crypto in [0, 1), never the engine Rng) and the build function.

import { CODE_COUNT, PICK_MAX, PICK_MIN, PICK_ORDER, codeFor, pickedInOrder, type PickedGame } from '../engine/caseRef.ts';
import type { CaseLevels } from '../engine/settings.ts';
import { starsText } from './labels.ts';

/** A random number in [0, 1). */
export type Rand = () => number;

export const CAP_NOTE = `That's ${PICK_MAX}. Press one down to swap.`;

/** A fresh case code from the UI's random. */
export const newCode = (rand: Rand): string => codeFor(Math.floor(rand() * CODE_COUNT));

/** A new hand: 3 to 5 games, every game equally likely, in the fixed order. */
export function dealHand(rand: Rand): PickedGame[] {
  const pool = [...PICK_ORDER];
  const size = PICK_MIN + Math.floor(rand() * 3);
  const hand: PickedGame[] = [];
  while (hand.length < size) hand.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return pickedInOrder(hand);
}

/** Tapping a sticker: lifts it, presses it down, or (an eighth) leaves things as they are with a note. */
export function toggleSticker(lifted: readonly PickedGame[], game: PickedGame): { lifted: PickedGame[]; note: string } {
  if (lifted.includes(game)) return { lifted: lifted.filter((g) => g !== game), note: '' };
  if (lifted.length >= PICK_MAX) return { lifted: [...lifted], note: CAP_NOTE };
  return { lifted: pickedInOrder([...lifted, game]), note: '' };
}

/** "4 of 7 lifted". */
export const liftedText = (n: number): string => `${n} of ${PICK_MAX} lifted`;

/** What the button says: "Lift 2 more" below the minimum, else "Stick them in". */
export const stickText = (n: number): string => (n >= PICK_MIN ? 'Stick them in' : `Lift ${PICK_MIN - n} more`);

/** The case line under the tin, e.g. "Logic ★★☆ · 5 guests". */
export const caseLine = (levels: CaseLevels): string => `Logic ${starsText(levels.logic)} · ${levels.suspects} guests`;

/** Her picks to start with: what she saved (3 or more), else a dealt hand. */
export const firstHand = (saved: readonly PickedGame[], rand: Rand): PickedGame[] => (saved.length >= PICK_MIN ? pickedInOrder(saved) : dealHand(rand));

/** Codes tried with the same games, then the number of new hands dealt, before it gives up. */
export const CODES_PER_HAND = 5;
export const NEW_HANDS = 10;

export type PickOutcome<T> = { ok: true; built: T; code: string; games: PickedGame[]; swapped: boolean } | { ok: false };

/**
 * Builds the case she picked, quietly. The first code is the one she saw; if it fails (the engine has
 * already tried 100 seeds), a new code with the same games, up to 5 codes in all. Then a new hand is
 * dealt as a shake does (`swapped`), with 5 more codes each, up to 10 new hands. Then it gives up.
 */
export async function buildPick<T>(first: { code: string; games: readonly PickedGame[] }, build: (code: string, games: PickedGame[]) => Promise<T>, rand: Rand): Promise<PickOutcome<T>> {
  let games = pickedInOrder(first.games);
  for (let hand = 0; hand <= NEW_HANDS; hand++) {
    for (let i = 0; i < CODES_PER_HAND; i++) {
      const code = hand === 0 && i === 0 ? first.code : newCode(rand);
      try {
        return { ok: true, built: await build(code, games), code, games, swapped: hand > 0 };
      } catch {
        // try the next code
      }
    }
    games = dealHand(rand);
  }
  return { ok: false };
}
