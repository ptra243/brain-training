import type { CaseLevels } from './settings.ts';

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
  /** More things in this room, 4–9 letters; the crossword and word search hide one. */
  things: readonly string[];
  /** Grid cells this room covers. Rooms must be contiguous and not overlap. */
  cells: readonly Cell[];
}

export interface House {
  id: string;
  name: string;
  rows: number;
  cols: number;
  rooms: readonly Room[];
  /**
   * Room id pairs joined by a door. Absent = no doors: rooms that share a wall
   * count as touching (the manor). With doors, only door-joined rooms touch.
   * Cells in the grid that no room owns are outside the house (not part of it).
   */
  doors?: readonly (readonly [string, string])[];
  /** Nosing around overrides for this house (the manor has none). `all` applies to every level, then the level's own. */
  nosing?: Partial<Record<'all' | 'easy' | 'medium' | 'hard', NosingOverride>>;
}

/** Plain numbers that replace fields of a Nosing level's spec (see `nosingSpec`). */
export interface NosingOverride {
  /** Squares per floor-plan cell side. */
  n?: number;
  dice?: number;
  len?: readonly [number, number];
  turns?: readonly [number, number];
  /** Obstacle squares (a small house cannot hold the stock 25 in a short path). */
  obstacles?: number;
  /** The path ends once (search clues + this) rooms are entered (capped at the room count); absent = every room. */
  enterExtra?: number;
  /** ...but never more than this many rooms (a long list of clues must still fit the short stock length). */
  enterMax?: number;
  /** The path never ends in a room it has walked fewer squares of than this. */
  minEndRoom?: number;
}

/**
 * Where a door is drawn: on the right edge of cell (row, col) when `side` is
 * 'right' (between it and (row, col + 1)), or its bottom edge when 'bottom'
 * (between it and (row + 1, col)). `a` and `b` are the two room ids.
 */
export interface DoorSpot {
  a: string;
  b: string;
  row: number;
  col: number;
  side: 'right' | 'bottom';
}

export interface Suspect {
  id: string;
  name: string;
  bio: string;
  /**
   * A guest with a kin-mate (the two heirs) is called `name` when both are at dinner, and
   * `alone.name` when no other guest present has the same `kin`. See `guestNames.ts`.
   */
  alone?: { kin: string; name: string };
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

// ---------- Talk (what guests say; see `sets.ts`) ----------

/** One reading of a card (upright or reversed): loose lines and follow-up threads. */
export interface CardReading {
  /** `neutral` can be said by anyone using the card; `bound` only by the card's home suspect. */
  lines: { neutral: readonly string[]; bound: readonly string[] };
  /** Each thread is 2 to 3 beats, heard in order. */
  threads: readonly (readonly string[])[];
}

export interface TalkCard {
  upright: CardReading;
  reversed: CardReading;
}

/**
 * Everything guests say, kept out of `Content` (like the cats) so it never
 * changes a case. Never name a card in a line; lines never state times or alibis.
 */
export interface TalkContent {
  /** Per suspect id: the home card and the cards they may borrow for a night. */
  suspects: Readonly<Record<string, { card: string; mayAlsoRoll: readonly string[] }>>;
  cards: Readonly<Record<string, TalkCard>>;
  /** Ordered: a cold guest warms up a step per beat heard, then moves on to `warm[0]`. */
  greetings: { cold: readonly string[]; warm: readonly string[] };
}

// ---------- Generated per case ----------

export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * The hidden answer: where each suspect was and what they held. Index i of
 * `room` / `item` belongs to `suspects[i]`. In a classic case everyone has
 * their own room and weapon; with 7 guests rooms are shared and two guests
 * hold nothing (null).
 */
export interface Solution {
  room: readonly string[];
  item: readonly (string | null)[];
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
  | { type: 'suspects-not-adjacent'; suspects: readonly [string, string] }
  // Only with shared rooms (7 guests):
  | { type: 'suspects-together'; suspects: readonly [string, string] }
  | { type: 'suspects-apart'; suspects: readonly [string, string] }
  | { type: 'suspect-alone'; suspect: string }
  | { type: 'suspect-empty-handed'; suspect: string };

export type ClueType = ClueFact['type'];

/**
 * Minigames. The three word games each reveal the scene (she plays whichever
 * she likes); the rotating games unlock clues. `finale` is the closing
 * interrogation on hard cases. What each kind is for lives in `gameKinds.ts`.
 */
export type SceneKind = 'wordle' | 'crossword' | 'wordsearch';
export type RotatingKind = 'cats' | 'sudoku' | 'interrogation' | 'board' | 'tarot' | 'nosing';
export type GameKind = SceneKind | RotatingKind | 'finale';

/** How a clue reaches her: free at the start, or as a minigame's reward. */
export type ClueDelivery = GameKind | 'given';

/** What every minigame in a case has. The puzzle itself is built from `seed` when opened. */
interface GameBase {
  seed: number;
  /** Clue ids this game unlocks. */
  clues: readonly string[];
  /** Play cases only: the difficulty rolled for this game (absent in every other mode). */
  level?: Difficulty;
}

/**
 * A word game that reveals the scene (any one will do). It unlocks no clues,
 * except in Play cases, where it is a clue game: `scene.answer` is an object
 * word that fills the blank of one of its clues (`Clue.blank`), `unlocksScene`
 * still marks it as a word game for narrowing, and the scene is already given
 * (`Case.sceneGiven`).
 */
export interface SceneGameSpec extends GameBase {
  kind: SceneKind;
  unlocksScene: true;
  /** Word length (Wordle) or grid width. */
  size: number;
  /** The hidden word and the scene text it reveals. */
  scene: SceneWord;
}

export interface CatsSpec extends GameBase {
  kind: 'cats';
  unlocksScene: false;
  size: number;
  /** Has a one-square zone and comes out by simple steps alone. */
  easy?: boolean;
}

export interface SudokuSpec extends GameBase {
  kind: 'sudoku';
  unlocksScene: false;
  size: 6 | 9;
  /** How many digits are given. */
  givens: number;
  /** Clues that unlock early from their two coordinate squares. */
  located: readonly string[];
}

export interface InterrogationSpec extends GameBase {
  kind: 'interrogation' | 'finale';
  unlocksScene: false;
  /** The suspect, evidence and questions. */
  interrogation: Interrogation;
}

/**
 * The case board puzzle: the free clues and its own clues as pieces, packed so
 * the only way they fit proves its clues (`caseBoard.ts`). Built from `seed`.
 */
export interface BoardSpec extends GameBase {
  kind: 'board';
  unlocksScene: false;
}

/** Tarot match: a memory game on the case's cards (suspects, weapons, rooms). `pairs` is the number of card pairs, not counting the joker. */
export interface TarotSpec extends GameBase {
  kind: 'tarot';
  unlocksScene: false;
  pairs: number;
}

/** Nosing around: a maths board game on the floor plan, ending at a lock. Play cases only; its `level` is always set. Built from `seed` (see `nosingSeed`). */
export interface NosingSpec extends GameBase {
  kind: 'nosing';
  unlocksScene: false;
}

/** One minigame in a case. */
export type GameSpec = SceneGameSpec | CatsSpec | SudokuSpec | InterrogationSpec | BoardSpec | TarotSpec | NosingSpec;

/** A word hidden by a scene game, and the scene sentence solving it reveals ("…by the bookcase in the Library."). */
export interface SceneWord {
  answer: string;
  text: string;
}

/** One question she can ask; the answer is a statement by the suspect in the chair. */
export interface Question {
  id: string;
  ask: string;
  /** The answer as a clue (testimony from the suspect). Not a real clue if it's the lie. */
  answer: Clue;
  lie: boolean;
}

/**
 * Questioning a suspect. They answer every question truthfully except one.
 * She catches the lie by presenting evidence that disproves it.
 */
export interface Interrogation {
  suspect: string;
  /**
   * Evidence on the table. Self-contained games bring their own cards
   * (`cards`); the finale uses her casebook (`useCaseClues`).
   */
  cards: readonly Clue[];
  useCaseClues: boolean;
  questions: readonly Question[];
  /** One smallest set of evidence ids that disproves the lie (any set that does is accepted). */
  proof: readonly string[];
  maxQuestions: number;
  strikes: number;
  /** Face to face only: none of her clues catches any lie, so the killer confesses and no question is a lie. */
  cracks?: boolean;
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
  /**
   * Play word games only: this clue's room is hidden behind `answer`, an
   * object of that room. `teaser` is the clue with "the room with the _ _ _ _ _"
   * in place of the room.
   */
  blank?: { game: SceneKind; answer: string; teaser: string };
}

/**
 * One round of a campaign: a murder at one time of the night. Its clues leave
 * 2 or 3 possible killers, except in the last round, which pins the killer
 * and weapon down.
 */
export interface CampaignRound {
  /** 0 for the first body (9pm), then 1, 2. */
  round: number;
  rounds: number;
  /** How many of the round's puzzles (besides the word game) she may play. */
  budget: number;
  last: boolean;
  /** Guests murdered so far: the ones she wrongly accused, in order. */
  victims: readonly string[];
}

export interface Case {
  number: number;
  /** What she sees as the case's name: "6", or a quick case's "K7QF2". */
  code: string;
  seed: number;
  /** The logic level, shown as the case's difficulty. */
  difficulty: Difficulty;
  levels: CaseLevels;
  /** Guests can share a room, and some hold no weapon. */
  shared: boolean;
  /** Set when this case is a round of a campaign. */
  campaign?: CampaignRound;
  houseId: string;
  /** Suspect ids in play, in solution order. */
  suspects: readonly string[];
  /** The guest who was killed: from the same shuffle as the seating, never a suspect or the killer. */
  victim: string;
  /**
   * Everyone at dinner: the seated suspects plus the victim (a campaign: the whole campaign cast plus the
   * first victim, the same every round). Names are decided from this list (`guestNames.ts`).
   */
  guests: readonly string[];
  /** Room ids in play (one per suspect in a classic case, 5 shared by 7 guests). Other rooms on the map are empty. */
  rooms: readonly string[];
  /** Weapon ids in play (one per suspect in a classic case, 5 for 7 guests). */
  items: readonly string[];
  solution: Solution;
  /** Where the body was found. The murderer is whoever was in this room. */
  sceneRoom: string;
  murderer: string;
  weapon: string;
  /**
   * Where the body was found. Not a placement clue: it tells the player which
   * room matters once the grid is solved. Always delivered, never trimmed.
   * It serves every scene word game (Wordle, crossword, word search): the
   * `wordle` and `delivery` names are historical, and each game hides its
   * own word in `GameSpec.scene`.
   */
  sceneClue: { text: string; delivery: 'wordle'; wordle: WordleReveal };
  /** Play cases: the scene card is filled in from the first screen, with no free clues. */
  sceneGiven?: true;
  /**
   * Set by the casebook (never by the engine) on a campaign round she explores: the scene counts as
   * known from the start and the scene word games aren't offered. Case output is unchanged.
   */
  explore?: true;
  /** Minimal clue set: removing any one allows a second solution. */
  clues: readonly Clue[];
  /** Minigames in play order; together with the free clues they unlock everything. */
  games: readonly GameSpec[];
}
