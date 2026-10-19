// Player progress on one case: grid marks, used clues, accusations.
// Pure functions, no React, so it can be unit tested.
//
// The map and the grid share one source of truth: a suspect's token sits in
// a room exactly when the suspect×room cell holds a tick ('o').

import { isInterrogation, isSceneGame } from '../engine/gameKinds.ts';
import type { Case, Clue, GameKind } from '../engine/types.ts';
import type { GridHintState } from './gridHints.ts';

export type Mark = 'x' | 'o';

/** Which pair of categories a grid compares. Rows first, columns second. */
export type GridKind = 'suspect-room' | 'suspect-item' | 'item-room';

export interface Accusation {
  suspect: string;
  item: string;
  /** How many of the two parts (who, weapon) were right. */
  correct: number;
}

/** Parts in an accusation: who and with what. The room is the scene, so it isn't asked. */
export const ACCUSATION_PARTS = 2;

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
  /** Sudoku statements unlocked early from their coordinate squares. Kept once found. */
  found: string[];
  /** The cat's hints on the map and grid (`gridHints.ts`). */
  gridHints?: GridHintState;
  /** Her moves on the end board, for the clues it was built from (`key`); a new clue means a new board. */
  endBoard?: { key: string; save: unknown };
}

export const emptyProgress = (): Progress => ({ marks: {}, used: [], accusations: [], solved: false, games: {}, found: [] });

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
  | { type: 'place-item'; item: string; room: string | null }
  | { type: 'give-item'; item: string; suspect: string }
  | { type: 'toggle-used'; clue: string }
  | { type: 'accuse'; suspect: string; item: string }
  | { type: 'game-save'; kind: GameKind; data: unknown }
  | { type: 'game-finish'; kind: GameKind; status: 'won' | 'revealed'; data: unknown }
  | { type: 'found'; clues: string[] }
  | { type: 'grid-hint'; hints: GridHintState }
  | { type: 'end-board'; key: string; save: unknown }
  | { type: 'reset' };

function clearTicks(marks: Record<string, Mark>, kind: GridKind, row: string | null, col: string | null, c: Case) {
  const { rows, cols } = axes(c, kind);
  for (const r of rows) {
    for (const cl of cols) {
      if ((row === null || r === row) && (col === null || cl === col) && marks[markKey(kind, r, cl)] === 'o') {
        delete marks[markKey(kind, r, cl)];
      }
    }
  }
}

/** Keep a held weapon in the same room as its holder. */
function carryItem(marks: Record<string, Mark>, c: Case, suspect: string) {
  const item = c.items.find((i) => marks[markKey('suspect-item', suspect, i)] === 'o');
  if (!item) return;
  clearTicks(marks, 'item-room', item, null, c);
  const room = c.rooms.find((r) => marks[markKey('suspect-room', suspect, r)] === 'o');
  if (room) setTick(marks, c, 'item-room', item, room);
}

/** When a suspect has both a room and a weapon ticked, tick the weapon in that room. Never clears. */
function linkItem(marks: Record<string, Mark>, c: Case, suspect: string) {
  const item = c.items.find((i) => marks[markKey('suspect-item', suspect, i)] === 'o');
  const room = c.rooms.find((r) => marks[markKey('suspect-room', suspect, r)] === 'o');
  if (item && room) setTick(marks, c, 'item-room', item, room);
}

/** 7 guests share 5 rooms (and rooms can hold several weapons). */
export const sharedRooms = (c: Case) => c.shared;

/**
 * Whether a tick rules out the rest of its column too. Always in a classic
 * case; with shared rooms only for who holds which weapon (one holder each),
 * since a room can hold several guests or weapons.
 */
export const oneTickPerColumn = (c: Case, kind: GridKind) => !sharedRooms(c) || kind === 'suspect-item';

/** Set a tick, clearing any other tick in the same row (and column, where that's one per line). */
function setTick(marks: Record<string, Mark>, c: Case, kind: GridKind, row: string, col: string) {
  const { rows, cols } = axes(c, kind);
  for (const other of cols) if (other !== col && marks[markKey(kind, row, other)] === 'o') delete marks[markKey(kind, row, other)];
  if (oneTickPerColumn(c, kind)) {
    for (const other of rows) if (other !== row && marks[markKey(kind, other, col)] === 'o') delete marks[markKey(kind, other, col)];
  }
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
      else if (current === 'x') {
        setTick(marks, c, action.kind, action.row, action.col);
        // Ticking someone's room and weapon puts the weapon in that room too, as on the map.
        if (action.kind !== 'item-room') linkItem(marks, c, action.row);
      } else delete marks[key];
      return { ...p, marks };
    }
    case 'place': {
      const marks = { ...p.marks };
      for (const room of c.rooms) {
        const key = markKey('suspect-room', action.suspect, room);
        if (marks[key] === 'o') delete marks[key];
      }
      if (action.room) setTick(marks, c, 'suspect-room', action.suspect, action.room);
      carryItem(marks, c, action.suspect);
      return { ...p, marks };
    }
    case 'place-item': {
      // Put a weapon down in a room (or back in the tray): nobody holds it now.
      const marks = { ...p.marks };
      clearTicks(marks, 'suspect-item', null, action.item, c);
      clearTicks(marks, 'item-room', action.item, null, c);
      if (action.room) setTick(marks, c, 'item-room', action.item, action.room);
      return { ...p, marks };
    }
    case 'give-item': {
      const marks = { ...p.marks };
      setTick(marks, c, 'suspect-item', action.suspect, action.item);
      carryItem(marks, c, action.suspect);
      return { ...p, marks };
    }
    case 'toggle-used': {
      const used = p.used.includes(action.clue) ? p.used.filter((u) => u !== action.clue) : [...p.used, action.clue];
      return { ...p, used };
    }
    case 'accuse': {
      if (p.solved) return p;
      const correct = Number(action.suspect === c.murderer) + Number(action.item === c.weapon);
      const accusation: Accusation = { suspect: action.suspect, item: action.item, correct };
      return { ...p, accusations: [...p.accusations, accusation], solved: correct === ACCUSATION_PARTS };
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
    case 'found': {
      const add = action.clues.filter((id) => !p.found.includes(id));
      return add.length ? { ...p, found: [...p.found, ...add] } : p;
    }
    case 'grid-hint':
      return { ...p, gridHints: action.hints };
    case 'end-board':
      return { ...p, endBoard: { key: action.key, save: action.save } };
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
  const tickedInCol = oneTickPerColumn(c, kind) && rows.some((other) => p.marks[markKey(kind, other, col)] === 'o');
  return tickedInRow || tickedInCol ? 'auto-x' : null;
}

export const gameDone = (p: Progress, kind: GameKind) => {
  const status = p.games[kind]?.status;
  return status === 'won' || status === 'revealed';
};

/** Ids of the clues she can see: the free ones plus every finished game's. */
export function unlockedClueIds(c: Case, p: Progress): Set<string> {
  const ids = new Set(c.clues.filter((clue) => clue.delivery === 'given').map((clue) => clue.id));
  for (const id of p.found) ids.add(id);
  for (const g of c.games) if (gameDone(p, g.kind)) for (const id of g.clues) ids.add(id);
  return ids;
}

export const sceneUnlocked = (c: Case, p: Progress) => c.games.some((g) => g.unlocksScene && gameDone(p, g.kind));

/** Puzzles done out of the case's total, counting the scene word games as one. */
export function puzzlesDone(c: Case, p: Progress): { done: number; total: number } {
  const others = c.games.filter((g) => !g.unlocksScene);
  return {
    done: (sceneUnlocked(c, p) ? 1 : 0) + others.filter((g) => gameDone(p, g.kind)).length,
    total: 1 + others.length,
  };
}

/** Before: a blank. After: the sentence from whichever scene game she solved. */
export const SCENE_TEASER = 'The body was found by the …';
export function sceneText(c: Case, p: Progress): string | null {
  const done = c.games.filter(isSceneGame).find((g) => gameDone(p, g.kind));
  return done ? done.scene.text : null;
}

/** Whether a clue names this suspect. */
export function mentionsSuspect(clue: Clue, suspect: string): boolean {
  const f = clue.fact;
  return ('suspect' in f && f.suspect === suspect) || ('suspects' in f && f.suspects.includes(suspect));
}

/** A person, room or weapon she can ask "which clues are about this?" of. */
export interface Subject {
  kind: 'suspect' | 'room' | 'item';
  id: string;
}

/** Whether a clue names this suspect, room or weapon. */
export function mentions(clue: Clue, s: Subject): boolean {
  if (s.kind === 'suspect') return mentionsSuspect(clue, s.id);
  const f = clue.fact;
  if (s.kind === 'item') return 'item' in f && f.item === s.id;
  return ('room' in f && f.room === s.id) || ('rooms' in f && f.rooms.includes(s.id));
}

/** Clues that name this suspect, in casebook order. */
export const cluesAbout = (c: Case, suspect: string) => c.clues.filter((clue) => mentionsSuspect(clue, suspect));

/** The room a suspect's token is in, if she has placed (ticked) one. */
export function placedRoom(c: Case, p: Progress, suspect: string): string | null {
  return c.rooms.find((room) => p.marks[markKey('suspect-room', suspect, room)] === 'o') ?? null;
}

/** The item she has ticked for a suspect, shown under the token on the map. */
export function heldItem(c: Case, p: Progress, suspect: string): string | null {
  return c.items.find((item) => p.marks[markKey('suspect-item', suspect, item)] === 'o') ?? null;
}

/** Who holds a weapon (suspect×item tick), if anyone. */
export function holderOf(c: Case, p: Progress, item: string): string | null {
  return c.suspects.find((s) => p.marks[markKey('suspect-item', s, item)] === 'o') ?? null;
}

/** The room she has put a weapon in (item×room tick), if any. */
export function itemRoom(c: Case, p: Progress, item: string): string | null {
  return c.rooms.find((r) => p.marks[markKey('item-room', item, r)] === 'o') ?? null;
}

/**
 * The accusation her map implies: the one person she's placed in the room
 * where the body was found, and the weapon they hold (or the one weapon
 * lying in that room). Null when the map doesn't say yet.
 */
export function mapAccusation(c: Case, p: Progress): { suspect: string; item: string } | null {
  const there = c.suspects.filter((s) => placedRoom(c, p, s) === c.sceneRoom);
  if (there.length !== 1) return null;
  const [suspect] = there;
  const held = heldItem(c, p, suspect);
  const lying = c.items.filter((i) => itemRoom(c, p, i) === c.sceneRoom && !holderOf(c, p, i));
  const item = held ?? (lying.length === 1 ? lying[0] : null);
  return item ? { suspect, item } : null;
}

/** What an interrogation saves: questions asked, wrong presses, and whether she caught the lie. */
export interface InterrogationData {
  asked: string[];
  strikes: number;
  caught: boolean;
}

/**
 * The finale opens once every other puzzle is finished (the scene counts
 * once any word game is done), because its evidence is everything else in
 * her casebook.
 */
export const finaleOpen = (c: Case, p: Progress) =>
  sceneUnlocked(c, p) && c.games.filter((g) => g.kind !== 'finale' && !g.unlocksScene).every((g) => gameDone(p, g.kind));

/** The scene game she has finished, or else the one she's partway through. */
export function sceneGameInPlay(c: Case, p: Progress): GameKind | null {
  const scene = c.games.filter((g) => g.unlocksScene);
  return (scene.find((g) => gameDone(p, g.kind)) ?? scene.find((g) => p.games[g.kind]))?.kind ?? null;
}

/**
 * Everything she can read in her casebook: unlocked case clues, plus what
 * finished interrogations produced (the evidence cards on the table and the
 * true answers she drew out; never the lie).
 */
export function visibleClues(c: Case, p: Progress): Clue[] {
  const unlocked = unlockedClueIds(c, p);
  const out = c.clues.filter((clue) => unlocked.has(clue.id));
  for (const g of c.games) {
    if (!isInterrogation(g) || !gameDone(p, g.kind)) continue;
    const data = p.games[g.kind]?.data as InterrogationData | undefined;
    out.push(...g.interrogation.cards);
    for (const q of g.interrogation.questions) if (!q.lie && data?.asked.includes(q.id)) out.push(q.answer);
  }
  return out;
}
