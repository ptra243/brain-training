// Exploration rounds (campaign): what is in each room, and the clock. Pure.
// Everything is rebuilt from the case's seed, so the same case is always the
// same house; none of it depends on who the killer is.

import { isInterrogation, isSceneGame } from '../engine/gameKinds.ts';
import { Rng, hashSeed } from '../engine/rng.ts';
import type { Case, Content, GameKind, Room } from '../engine/types.ts';
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
  // Puzzle answers come from these same word lists: never label an object with a word any puzzle hides.
  const puzzleText = JSON.stringify(c.games).toUpperCase();
  roundPuzzles(c).objects.forEach((g, i) => {
    const room = order[i % order.length];
    const room_ = house.get(room);
    const words = (room_ ? [...room_.objects, ...room_.things] : []).filter((w) => !puzzleText.includes(w.toUpperCase()));
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

/** Rooms she has been in this round: the scene from the start, where she is, and rooms she walked into. */
export function roomsSeen(c: Case, p: Progress): string[] {
  const out: string[] = [];
  const add = (room: string | undefined) => {
    if (room && c.rooms.includes(room) && !out.includes(room)) out.push(room);
  };
  add(c.sceneRoom);
  add(whereAmI(c, p));
  for (const room of p.seen ?? []) add(room);
  return out;
}

const nearestCell = (room: Room, r: number, col: number): readonly [number, number] =>
  room.cells.reduce((best, cell) =>
    (cell[0] - r) ** 2 + (cell[1] - col) ** 2 < (best[0] - r) ** 2 + (best[1] - col) ** 2 ? cell : best,
  );

/** The cell nearest the middle of a room. */
export function centreCell(room: Room): readonly [number, number] {
  const cr = room.cells.reduce((s, [r]) => s + r, 0) / room.cells.length;
  const cc = room.cells.reduce((s, [, col]) => s + col, 0) / room.cells.length;
  return nearestCell(room, cr, cc);
}

/** Where she and the guests stand. `r` and `col` are map percentages: the centre of cell `i` is `i + 0.5`. */
export function standSpots(room: Room, guests: readonly string[], playerHere: boolean): { id: string; r: number; col: number }[] {
  const centre = centreCell(room);
  const spots: { id: string; r: number; col: number }[] = [];
  if (playerHere) spots.push({ id: 'player', r: centre[0] + 0.5, col: centre[1] + 0.5 });

  const same = (cell: readonly [number, number]) => cell[0] === centre[0] && cell[1] === centre[1];
  const free = room.cells.filter((cell) => !playerHere || !same(cell)).slice();
  free.sort((a, b) => {
    const da = (a[0] - centre[0]) ** 2 + (a[1] - centre[1]) ** 2;
    const db = (b[0] - centre[0]) ** 2 + (b[1] - centre[1]) ** 2;
    return da - db || a[0] - b[0] || a[1] - b[1];
  });

  const at = (id: string, cell: readonly [number, number], along: number) => {
    spots.push({ id, r: cell[0] + 0.5, col: cell[1] + along });
  };
  // No cell free of her: they share the one she stands on.
  if (!free.length) {
    for (let i = 0; i < guests.length; i++) at(guests[i], centre, guests.length === 1 ? 0.5 : i % 2 === 0 ? 0.3 : 0.7);
    return spots;
  }
  if (guests.length <= free.length) {
    guests.forEach((id, i) => at(id, free[i], 0.5));
    return spots;
  }
  // Extras share the cells farthest from the centre, two to a cell, at 0.3 and 0.7 along the column.
  const doubled = Math.min(free.length, guests.length - free.length);
  const single = free.length - doubled;
  let n = 0;
  for (let i = 0; i < single; i++) at(guests[n++], free[i], 0.5);
  for (let i = 0; i < doubled && n < guests.length; i++) {
    const cell = free[single + i];
    at(guests[n++], cell, 0.3);
    if (n < guests.length) at(guests[n++], cell, 0.7);
  }
  const last = free[free.length - 1];
  while (n < guests.length) {
    at(guests[n], last, n % 2 === 0 ? 0.3 : 0.7);
    n++;
  }
  return spots;
}
