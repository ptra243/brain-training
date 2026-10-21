// Exploration rounds (campaign): what is in each room, and the clock. Pure.
// Everything is rebuilt from the case's seed, so the same case is always the
// same house; none of it depends on who the killer is.

import { isInterrogation, isSceneGame } from '../engine/gameKinds.ts';
import { Rng, hashSeed } from '../engine/rng.ts';
import type { Case, Content, GameKind } from '../engine/types.ts';
import { gameDone, type Progress } from './state.ts';
import { questioningOf } from './talk.ts';

/** A puzzle standing in a room as an object, named from that room's words. */
export interface RoomObject {
  kind: GameKind;
  /** "The inkwell". */
  label: string;
}

export interface RoomContents {
  /** Something to look at: flavour only. */
  looks: string[];
  objects: RoomObject[];
  /** Living guests in the room for the whole round. */
  guests: string[];
}

/** Flavour lines per room. */
const LOOKS_PER_ROOM = 2;

/** The puzzles a round offers besides the scene word games, split into objects and guests' questioning. */
export function roundPuzzles(c: Case) {
  const people = c.games.filter((g) => !isSceneGame(g) && isInterrogation(g) && questioningOf(c, g.interrogation.suspect) === g);
  const objects = c.games.filter((g) => !isSceneGame(g) && !people.includes(g));
  return { objects, people };
}

/** Who is where, what is there to look at and which puzzles stand in which room. Only rooms in play. */
export function roomContents(content: Content, details: readonly string[], c: Case): Record<string, RoomContents> {
  const out: Record<string, RoomContents> = Object.fromEntries(c.rooms.map((r) => [r, { looks: [], objects: [], guests: [] }]));
  const house = new Map(content.house.rooms.map((r) => [r.id, r]));

  // Guests: each on its own stream, so adding or removing one never moves the others.
  for (const s of c.suspects) out[new Rng(hashSeed(`${c.seed}-explore-guests-${s}`)).pick(c.rooms)].guests.push(s);

  // Objects: spread over different rooms where possible, each named from its room's words.
  const rng = new Rng(hashSeed(`${c.seed}-explore-objects`));
  const order = rng.shuffle(c.rooms);
  const taken = new Set<string>();
  roundPuzzles(c).objects.forEach((g, i) => {
    const room = order[i % order.length];
    const room_ = house.get(room);
    const words = room_ ? [...room_.objects, ...room_.things] : [];
    const fresh = words.filter((w) => !taken.has(w));
    const word = rng.pick(fresh.length ? fresh : words);
    taken.add(word);
    out[room].objects.push({ kind: g.kind, label: word ? `The ${word.toLowerCase()}` : 'An object' });
  });

  // Something to look at: the house's details dealt round the rooms.
  const lines = new Rng(hashSeed(`${c.seed}-explore-looks`)).shuffle(details);
  let n = 0;
  for (let k = 0; k < LOOKS_PER_ROOM; k++) for (const room of c.rooms) if (lines.length) out[room].looks.push(lines[n++ % lines.length]);
  return out;
}

// ---------- The clock ----------

/** Every round starts at 9pm (minutes after midnight) and ends at midnight. */
export const START = 21 * 60;
export const MIDNIGHT = 24 * 60;

/** Puzzles (not the scene word games) she has finished or revealed. */
export const gamesDone = (c: Case, p: Progress) => c.games.filter((g) => !isSceneGame(g) && gameDone(p, g.kind)).length;

const budgetOf = (c: Case) => Math.max(1, c.campaign?.budget ?? 1);

/** Minutes after midnight: 9pm plus each finished puzzle's share of the evening. */
export function clockMinutes(c: Case, p: Progress): number {
  const done = Math.min(gamesDone(c, p), budgetOf(c));
  return START + Math.round((done * (MIDNIGHT - START)) / budgetOf(c));
}

export const formatClock = (minutes: number): string => {
  if (minutes >= MIDNIGHT) return 'Midnight';
  const h = Math.floor(minutes / 60) % 12 || 12;
  return `${h}:${String(minutes % 60).padStart(2, '0')}`;
};

/** "10:30" (or "Midnight"). */
export const clockTime = (c: Case, p: Progress): string => formatClock(clockMinutes(c, p));

export const gamesLeft = (c: Case, p: Progress) => Math.max(0, budgetOf(c) - gamesDone(c, p));
export const atMidnight = (c: Case, p: Progress) => gamesDone(c, p) >= budgetOf(c);

/** The header line: "10:30 (2 games left)". */
export function clockLine(c: Case, p: Progress): string {
  const left = gamesLeft(c, p);
  return left ? `${clockTime(c, p)} (${left} game${left === 1 ? '' : 's'} left)` : `${clockTime(c, p)} (time's up)`;
}

/** Minutes each puzzle takes. */
export const minutesPerGame = (c: Case) => Math.round((MIDNIGHT - START) / budgetOf(c));

/** What the clock will say once she finishes one more puzzle. */
export const clockAfterNext = (c: Case, p: Progress): string =>
  formatClock(START + Math.round((Math.min(gamesDone(c, p) + 1, budgetOf(c)) * (MIDNIGHT - START)) / budgetOf(c)));

// ---------- Where the marks go ----------

/** Whether she can open this puzzle now: not finished, and either chosen already or a pick is left. */
export function canOpen(c: Case, p: Progress, kind: GameKind, picked: readonly GameKind[], left: number): boolean {
  return !atMidnight(c, p) && !gameDone(p, kind) && (picked.includes(kind) || left > 0);
}

/** Puzzles in a room that she can still play: its objects and its guests' questioning. */
export function openPuzzlesIn(c: Case, p: Progress, room: RoomContents, picked: readonly GameKind[], left: number): GameKind[] {
  const kinds = room.objects.map((o) => o.kind);
  for (const s of room.guests) {
    const q = questioningOf(c, s);
    if (q) kinds.push(q.kind);
  }
  return kinds.filter((k) => canOpen(c, p, k, picked, left));
}

/** The room she is in: where she walked to, else the scene room (the round opens at the body). */
export const whereAmI = (c: Case, p: Progress): string => (p.at && c.rooms.includes(p.at) ? p.at : c.sceneRoom);
