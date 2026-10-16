// ---------- Static content (written once, lives in src/content) ----------

/** A cell on the house map grid: [row, col], both 0-based. */
export type Cell = readonly [row: number, col: number];

export interface Room {
  id: string;
  name: string;
  /** Floor-plan colour. */
  tint: string;
  /** 5-letter things found in this room; Wordle answers come from here. */
  objects: readonly string[];
  /** Grid cells this room covers. Rooms must be contiguous and not overlap. */
  cells: readonly Cell[];
}

export interface House {
  id: string;
  name: string;
  rows: number;
  cols: number;
  rooms: readonly Room[];
}

export interface Suspect {
  id: string;
  name: string;
  bio: string;
}

export interface Item {
  id: string;
  name: string;
}

export interface Content {
  house: House;
  suspects: readonly Suspect[];
  items: readonly Item[];
}

// ---------- Generated per case ----------

export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * The hidden answer. Index i of `room` / `item` belongs to `suspects[i]`.
 * Each suspect is in a different room and holds a different item.
 */
export interface Solution {
  room: readonly string[];
  item: readonly string[];
}

/** Clue data the solver can evaluate. `text` is added separately. */
export type ClueFact =
  | { type: 'suspect-room'; suspect: string; room: string }
  | { type: 'suspect-not-room'; suspect: string; room: string }
  | { type: 'suspect-item'; suspect: string; item: string }
  | { type: 'suspect-not-item'; suspect: string; item: string }
  | { type: 'item-room'; item: string; room: string }
  | { type: 'item-not-room'; item: string; room: string }
  | { type: 'suspect-either-room'; suspect: string; rooms: readonly [string, string] }
  | { type: 'suspect-next-to-room'; suspect: string; room: string }
  | { type: 'suspects-adjacent'; suspects: readonly [string, string] }
  | { type: 'suspects-not-adjacent'; suspects: readonly [string, string] };

export type ClueType = ClueFact['type'];

/** Minigames that unlock clues. */
export type GameKind = 'wordle' | 'cats' | 'sudoku';

/** How a clue reaches her: free at the start, or as a minigame's reward. */
export type ClueDelivery = GameKind | 'given';

/** One minigame in a case. The puzzle itself is built from `seed` when opened. */
export interface GameSpec {
  kind: GameKind;
  seed: number;
  /** Clue ids this game unlocks. */
  clues: readonly string[];
  /** Wordle unlocks the scene. */
  unlocksScene: boolean;
  /** Cat grid size, or sudoku size and how many digits are given. */
  size: number;
  givens?: number;
  /** Sudoku: clues that unlock early from their two coordinate squares. */
  located?: readonly string[];
}

/**
 * A Wordle-delivered clue: before solving she sees `teaser` with a blank;
 * solving reveals `answer` and the full clue text, room included.
 */
export interface WordleReveal {
  answer: string;
  teaser: string;
}

/** Who or what the clue comes from. Every clue is true either way. */
export type ClueSource = 'testimony' | 'evidence';

/**
 * A sudoku statement that points at its room by map coordinates. When she
 * fills both squares correctly their digits are the row and column of a
 * square in the room (1-based), and the statement unlocks.
 */
export interface Location {
  /** Statement text either side of "the room at row ▢, column ▢". */
  before: string;
  after: string;
  /** House map square the digits point to: [row, col], 0-based. */
  target: readonly [number, number];
}

export interface Clue {
  id: string;
  fact: ClueFact;
  delivery: ClueDelivery;
  source: ClueSource;
  /** Witness suspect id, for testimony. */
  speaker?: string;
  /** The statement: a quote for testimony, a sentence for evidence. */
  body: string;
  /** One-line plain version (speaker and quote), for lists and the dev page. */
  text: string;
  /** Sudoku statements only. */
  location?: Location;
  wordle?: WordleReveal;
}

export interface Case {
  number: number;
  seed: number;
  difficulty: Difficulty;
  houseId: string;
  /** Suspect ids in play, in solution order. */
  suspects: readonly string[];
  /** Room ids in play (one per suspect). Other rooms on the map are empty. */
  rooms: readonly string[];
  /** Item ids in play (one per suspect). */
  items: readonly string[];
  solution: Solution;
  /** Where the body was found. The murderer is whoever was in this room. */
  sceneRoom: string;
  murderer: string;
  weapon: string;
  /**
   * Where the body was found. Not a placement clue: it tells the player which
   * room matters once the grid is solved. Always delivered, never trimmed.
   */
  sceneClue: { text: string; delivery: 'wordle'; wordle: WordleReveal };
  /** Minimal clue set: removing any one allows a second solution. */
  clues: readonly Clue[];
  /** Minigames in play order; together with the free clues they unlock everything. */
  games: readonly GameSpec[];
}
