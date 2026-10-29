// The summation: after the night is over, each guest's counter moves to the room they were really in.
// Pure steps only; the component words the sentences (`Summation.tsx`).

import type { Case, ClueFact } from '../engine/types.ts';

export interface SumClue {
  id: string;
  text: string;
  fact: ClueFact;
}

/** What one round's replay needs. `guests` are in `Case.suspects` order; `solution` is indexed the same way. */
export interface SumInput {
  guests: readonly string[];
  killer: string;
  solution: { room: readonly string[]; item: readonly (string | null)[] };
  clues: readonly SumClue[];
  /** Ids of the clues she had unlocked on that round. */
  found: readonly string[];
}

export interface SumStep {
  /** Index of the round this step replays (0 for a single case). */
  round: number;
  guest: string;
  room: string;
  /** What they held, or null when empty-handed. */
  item: string | null;
  /** The found clue that states it, or null when she never found it out. */
  clueText: string | null;
  /** A short step (a campaign's earlier round): the time and whether the right person was named with the wrong weapon. */
  earlier: { time: string; wrongWeapon: boolean } | null;
  /** Guests on the map at the end of this step, in arrival order. */
  placed: { guest: string; room: string }[];
  /** Position within a full replay (1-based) and its length; 0 for a short step. */
  n: number;
  of: number;
}

/** A clue's rank for this guest (lower is better), or -1 when it does not directly state their true room or item. */
function rank(f: ClueFact, input: SumInput, guest: string, room: string, item: string | null): number {
  switch (f.type) {
    case 'suspect-room':
      return f.suspect === guest && f.room === room ? 1 : -1;
    case 'suspect-item':
      return item !== null && f.suspect === guest && f.item === item ? 2 : -1;
    case 'suspect-empty-handed':
      return item === null && f.suspect === guest ? 3 : -1;
    case 'item-room':
      return item !== null && f.item === item && f.room === room ? 4 : -1;
    case 'suspects-together': {
      if (!f.suspects.includes(guest)) return -1;
      const other = f.suspects[0] === guest ? f.suspects[1] : f.suspects[0];
      const at = input.guests.indexOf(other);
      return at >= 0 && input.solution.room[at] === room ? 5 : -1;
    }
    default:
      return -1;
  }
}

/** The best direct statement among the clues she had found, the earliest on a tie. */
export function citeFor(input: SumInput, guest: string): string | null {
  const i = input.guests.indexOf(guest);
  const room = input.solution.room[i];
  const item = input.solution.item[i];
  const found = new Set(input.found);
  let best: { rank: number; text: string } | null = null;
  for (const clue of input.clues) {
    if (!found.has(clue.id)) continue;
    const r = rank(clue.fact, input, guest, room, item);
    if (r > 0 && (!best || r < best.rank)) best = { rank: r, text: clue.text };
  }
  return best ? best.text : null;
}

/** Every guest, innocents in order, the killer last. */
export function fullSteps(input: SumInput, round = 0): SumStep[] {
  const order = [...input.guests.filter((g) => g !== input.killer), ...input.guests.filter((g) => g === input.killer)];
  const placed: { guest: string; room: string }[] = [];
  return order.map((guest, k) => {
    const i = input.guests.indexOf(guest);
    placed.push({ guest, room: input.solution.room[i] });
    return {
      round,
      guest,
      room: input.solution.room[i],
      item: input.solution.item[i],
      clueText: citeFor(input, guest),
      earlier: null,
      placed: [...placed],
      n: k + 1,
      of: order.length,
    };
  });
}

/** One short step: only the person she accused on an earlier round. */
export function shortStep(input: SumInput, accused: string, time: string, round: number): SumStep {
  const i = input.guests.indexOf(accused);
  const room = input.solution.room[i];
  return {
    round,
    guest: accused,
    room,
    item: input.solution.item[i],
    clueText: citeFor(input, accused),
    earlier: { time, wrongWeapon: accused === input.killer },
    placed: [{ guest: accused, room }],
    n: 0,
    of: 0,
  };
}

export interface EarlierRound {
  input: SumInput;
  accused: string;
  time: string;
}

/** A campaign night: a short step per earlier round, in order, then the full replay of the last round. */
export function nightSteps(earlier: readonly EarlierRound[], last: SumInput): SumStep[] {
  return [...earlier.map((e, k) => shortStep(e.input, e.accused, e.time, k)), ...fullSteps(last, earlier.length)];
}

/** The narrow input from a case and the clue ids she had unlocked on it. */
export function roundInput(c: Case, found: Iterable<string>): SumInput {
  return {
    guests: c.suspects,
    killer: c.murderer,
    solution: c.solution,
    clues: c.clues.map((cl) => ({ id: cl.id, text: cl.text, fact: cl.fact })),
    found: [...found],
  };
}
