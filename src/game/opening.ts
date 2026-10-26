// The campaign opening (round 1): who tells her which free clue, and the summary if she skips.
// Pure. Nothing here reads the killer: the order, the victim lines and the placement come from the
// seed and guest ids only, and the free clues are delivered by who already speaks them.

import { Rng, hashSeed } from '../engine/rng.ts';
import type { Case, Clue } from '../engine/types.ts';
import { guestRoles, guestTies, victimLines } from '../content/talk.ts';
import { bodyRoom } from './explore.ts';
import type { Progress } from './state.ts';
import { setsFor } from './talk.ts';

/** How a guest is tied to the victim (keys of `victimLines` in `src/content/talk.ts`). */
export type VictimTie = keyof typeof victimLines;
export const VICTIM_TIES = Object.keys(victimLines) as VictimTie[];

const has = (pairs: readonly (readonly string[])[], a: string, b: string) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** The key for what `speaker` is to `victim`: an exact family tie, else their roles (collapsed). */
export function victimTie(speaker: string, victim: string): VictimTie {
  if (has(guestTies.spouses, speaker, victim)) return 'spouse';
  if (guestTies.parentChild.some(([p, ch]) => p === speaker && ch === victim)) return 'parent';
  if (guestTies.parentChild.some(([p, ch]) => ch === speaker && p === victim)) return 'child';
  if (has(guestTies.siblings, speaker, victim)) return 'sibling';
  const s = guestRoles[speaker] ?? 'outsider';
  const v = guestRoles[victim] ?? 'outsider';
  switch (s) {
    case 'family':
      return v === 'estranged' ? 'family-estranged' : v === 'staff' || v === 'hired' ? 'family-staff' : 'family-outsider';
    case 'estranged':
      return v === 'family' ? 'estranged-family' : 'estranged-other';
    case 'staff':
      return v === 'family' ? 'staff-family' : v === 'staff' ? 'staff-staff' : 'staff-other';
    case 'hired':
      return v === 'family' ? 'hired-family' : 'hired-other';
    case 'outsider':
      return v === 'family' ? 'outsider-family' : 'outsider-other';
  }
}

/** Which of the placeholder lines a guest says about the victim: their tie and which of its two lines. */
export function victimLineKey(c: Case, guest: string): { tie: VictimTie; line: 0 | 1 } {
  const rng = new Rng(hashSeed(`${c.seed}-opening-victim-${guest}-${c.victim}`));
  return { tie: victimTie(guest, c.victim), line: rng.int(2) as 0 | 1 };
}

export interface OpeningGuest {
  guest: string;
  /** Free clues this guest tells (testimony they speak). */
  clues: Clue['id'][];
  victimLineKey: { tie: VictimTie; line: 0 | 1 };
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

/** Where the scene is: guests still to talk to, then the cat (only with evidence to show), then the goodbye. */
export function openingStep(c: Case, p: Progress): 'guests' | 'cat' | 'finish' {
  const o = p.opening;
  if (!o) return 'finish';
  if (c.suspects.some((g) => !o.talked.includes(g))) return 'guests';
  if (!o.cat && openingScript(c).catClues.length > 0) return 'cat';
  return 'finish';
}

/** "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** The first sentence of a beat (the whole text when it has no full stop to cut at). */
export function firstSentence(text: string): string {
  const m = /^.*?[.!?…](?=\s|$)/s.exec(text.trim());
  return (m ? m[0] : text).trim();
}

/** The first sentence of each beat she has heard from this guest, in order. Empty when none. */
export function soFarLines(c: Case, p: Progress, guest: string): string[] {
  const heard = p.talk?.[guest] ?? 0;
  const thread = setsFor(c)[guest]?.thread ?? [];
  return thread.slice(0, heard).map(firstSentence);
}

/** The Story so far page: a row per seated guest, with `line` null when she hasn't heard them. */
export function storySoFar(c: Case, p: Progress): { guest: string; line: string | null }[] {
  return c.suspects.map((guest) => {
    const lines = soFarLines(c, p, guest);
    return { guest, line: lines.length ? lines.join(' ') : null };
  });
}

/** A guest's line about the victim, with the victim's display name filled in. */
export function victimLineText(c: Case, guest: string, victimName: string): string {
  const { tie, line } = victimLineKey(c, guest);
  return victimLines[tie][line].replaceAll('{victim}', victimName);
}

/** What a skip hands her: every free clue (skipping costs none) and the guests she didn't talk to. */
export function openingSummary(c: Case, p: Progress): { cluesGot: number; guestsMissed: string[] } {
  const talked = p.opening?.talked ?? [];
  return {
    cluesGot: c.clues.filter((clue) => clue.delivery === 'given').length,
    guestsMissed: c.suspects.filter((g) => !talked.includes(g)),
  };
}
