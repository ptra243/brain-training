// Player progress on one case: grid marks, used clues, accusations.
// Pure functions, no React, so it can be unit tested.
//
// The map and the grid share one source of truth: a suspect's token sits in
// a room exactly when the suspect×room cell holds a tick ('o').

import type { Case, GameKind } from '../engine/types.ts';

export type Mark = 'x' | 'o';

/** Which pair of categories a grid compares. Rows first, columns second. */
export type GridKind = 'suspect-room' | 'suspect-item' | 'item-room';

export interface Accusation {
  suspect: string;
  room: string;
  item: string;
  /** How many of the three parts were right. */
  correct: number;
}

export interface GameRecord {
  /** `revealed` = she pressed Solve; the clues still unlock. */
  status: 'playing' | 'won' | 'revealed';
  /** The game's own saved state (guesses, marks, digits). */
  data?: unknown;
}

export interface Progress {
  /** Key `${kind}|${row}|${col}`; missing = blank. */
  marks: Record<string, Mark>;
  /** Clue ids she has struck through as used. */
  used: string[];
  accusations: Accusation[];
  solved: boolean;
  games: Partial<Record<GameKind, GameRecord>>;
}

export const emptyProgress = (): Progress => ({ marks: {}, used: [], accusations: [], solved: false, games: {} });

export const markKey = (kind: GridKind, row: string, col: string) => `${kind}|${row}|${col}`;

export interface GridAxes {
  rows: readonly string[];
  cols: readonly string[];
}

export function axes(c: Case, kind: GridKind): GridAxes {
  switch (kind) {
    case 'suspect-room':
      return { rows: c.suspects, cols: c.rooms };
    case 'suspect-item':
      return { rows: c.suspects, cols: c.items };
    case 'item-room':
      return { rows: c.items, cols: c.rooms };
  }
}

export type Action =
  | { type: 'cycle'; kind: GridKind; row: string; col: string }
  | { type: 'place'; suspect: string; room: string | null }
  | { type: 'toggle-used'; clue: string }
  | { type: 'accuse'; suspect: string; room: string; item: string }
  | { type: 'game-save'; kind: GameKind; data: unknown }
  | { type: 'game-finish'; kind: GameKind; status: 'won' | 'revealed'; data: unknown }
  | { type: 'reset' };

/** Set a tick, clearing any other tick in the same row and column (one per line). */
function setTick(marks: Record<string, Mark>, c: Case, kind: GridKind, row: string, col: string) {
  const { rows, cols } = axes(c, kind);
  for (const other of cols) if (other !== col && marks[markKey(kind, row, other)] === 'o') delete marks[markKey(kind, row, other)];
  for (const other of rows) if (other !== row && marks[markKey(kind, other, col)] === 'o') delete marks[markKey(kind, other, col)];
  marks[markKey(kind, row, col)] = 'o';
}

export function reduce(c: Case, p: Progress, action: Action): Progress {
  switch (action.type) {
    case 'cycle': {
      // blank -> cross -> tick -> blank
      const marks = { ...p.marks };
      const key = markKey(action.kind, action.row, action.col);
      const current = marks[key];
      if (!current) marks[key] = 'x';
      else if (current === 'x') setTick(marks, c, action.kind, action.row, action.col);
      else delete marks[key];
      return { ...p, marks };
    }
    case 'place': {
      const marks = { ...p.marks };
      for (const room of c.rooms) {
        const key = markKey('suspect-room', action.suspect, room);
        if (marks[key] === 'o') delete marks[key];
      }
      if (action.room) setTick(marks, c, 'suspect-room', action.suspect, action.room);
      return { ...p, marks };
    }
    case 'toggle-used': {
      const used = p.used.includes(action.clue) ? p.used.filter((u) => u !== action.clue) : [...p.used, action.clue];
      return { ...p, used };
    }
    case 'accuse': {
      if (p.solved) return p;
      const correct =
        Number(action.suspect === c.murderer) + Number(action.room === c.sceneRoom) + Number(action.item === c.weapon);
      const accusation: Accusation = { suspect: action.suspect, room: action.room, item: action.item, correct };
      return { ...p, accusations: [...p.accusations, accusation], solved: correct === 3 };
    }
    case 'game-save': {
      const current = p.games[action.kind];
      if (current && current.status !== 'playing') return p; // finished games are frozen
      return { ...p, games: { ...p.games, [action.kind]: { status: 'playing', data: action.data } } };
    }
    case 'game-finish': {
      const current = p.games[action.kind];
      if (current && current.status !== 'playing') return p;
      return { ...p, games: { ...p.games, [action.kind]: { status: action.status, data: action.data } } };
    }
    case 'reset':
      return emptyProgress();
  }
}

/** What a cell shows: her own mark, or a faint cross implied by a tick elsewhere in its line. */
export function cellState(c: Case, p: Progress, kind: GridKind, row: string, col: string): Mark | 'auto-x' | null {
  const own = p.marks[markKey(kind, row, col)];
  if (own) return own;
  const { rows, cols } = axes(c, kind);
  const tickedInRow = cols.some((other) => p.marks[markKey(kind, row, other)] === 'o');
  const tickedInCol = rows.some((other) => p.marks[markKey(kind, other, col)] === 'o');
  return tickedInRow || tickedInCol ? 'auto-x' : null;
}

export const gameDone = (p: Progress, kind: GameKind) => {
  const status = p.games[kind]?.status;
  return status === 'won' || status === 'revealed';
};

/** Ids of the clues she can see: the free ones plus every finished game's. */
export function unlockedClueIds(c: Case, p: Progress): Set<string> {
  const ids = new Set(c.clues.filter((clue) => clue.delivery === 'given').map((clue) => clue.id));
  for (const g of c.games) if (gameDone(p, g.kind)) for (const id of g.clues) ids.add(id);
  return ids;
}

export const sceneUnlocked = (c: Case, p: Progress) => c.games.some((g) => g.unlocksScene && gameDone(p, g.kind));

/** Clues that name this suspect, in casebook order. */
export function cluesAbout(c: Case, suspect: string) {
  return c.clues.filter((clue) => {
    const f = clue.fact;
    return ('suspect' in f && f.suspect === suspect) || ('suspects' in f && f.suspects.includes(suspect));
  });
}

/** The room a suspect's token is in, if she has placed (ticked) one. */
export function placedRoom(c: Case, p: Progress, suspect: string): string | null {
  return c.rooms.find((room) => p.marks[markKey('suspect-room', suspect, room)] === 'o') ?? null;
}

/** The item she has ticked for a suspect, shown under the token on the map. */
export function heldItem(c: Case, p: Progress, suspect: string): string | null {
  return c.items.find((item) => p.marks[markKey('suspect-item', suspect, item)] === 'o') ?? null;
}
