// The campaign opening (round 1): who tells her which free clue, and the summary if she skips.
// Pure. Nothing here reads the killer: the order, the victim lines and the placement come from the
// seed and guest ids only, and the free clues are delivered by who already speaks them.

import { Rng, hashSeed } from '../engine/rng.ts';
import type { Case, Clue } from '../engine/types.ts';
import { bodyRoom } from './explore.ts';
import type { Progress } from './state.ts';

/** How a guest knew the victim (keys of `victimLines` in `src/content/talk.ts`). */
export const RELATIONSHIPS = ['debt', 'rival', 'fondness', 'family'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

/** Which of the placeholder lines a guest says about the victim: a type and which of its two lines. */
export function victimLineKey(c: Case, guest: string): { type: Relationship; line: 0 | 1 } {
  const rng = new Rng(hashSeed(`${c.seed}-opening-victim-${guest}-${c.victim}`));
  return { type: rng.pick(RELATIONSHIPS), line: rng.int(2) as 0 | 1 };
}

export interface OpeningGuest {
  guest: string;
  /** Free clues this guest tells (testimony they speak). */
  clues: Clue['id'][];
  victimLineKey: { type: Relationship; line: 0 | 1 };
}

export interface OpeningScript {
  /** Where everyone gathers: the body. */
  room: string;
  guests: OpeningGuest[];
  /** Free evidence clues, told by the cat after the guests. */
  catClues: Clue['id'][];
}

/** The round-1 conversation list: one per seated guest, in seating order. */
export function openingScript(c: Case): OpeningScript {
  const guests: OpeningGuest[] = c.suspects.map((guest) => ({ guest, clues: [], victimLineKey: victimLineKey(c, guest) }));
  const catClues: Clue['id'][] = [];
  for (const clue of c.clues) {
    if (clue.delivery !== 'given') continue;
    const teller = clue.source === 'testimony' && clue.speaker ? guests.find((g) => g.guest === clue.speaker) : undefined;
    (teller ? teller.clues : catClues).push(clue.id);
  }
  return { room: bodyRoom(c), guests, catClues };
}

/** What a skip hands her: every free clue (skipping costs none) and the guests she didn't talk to. */
export function openingSummary(c: Case, p: Progress): { cluesGot: number; guestsMissed: string[] } {
  const talked = p.opening?.talked ?? [];
  return {
    cluesGot: c.clues.filter((clue) => clue.delivery === 'given').length,
    guestsMissed: c.suspects.filter((g) => !talked.includes(g)),
  };
}
