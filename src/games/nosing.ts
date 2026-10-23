// "Nosing around": the run. A snakes-and-ladders walk round the house with sums
// on the way, ending at a numbers lock. The puzzle is rebuilt from a seed; the
// saved state is only her moves, and `nosingView` replays them. Pure, no React.

import { Rng, hashSeed } from '../engine/rng.ts';
import type { House } from '../engine/types.ts';
import { nosingBonuses, nosingCatFindLines, nosingDog, nosingObstacleBackLine, nosingLockObjects, nosingSearchLines, type NosingJump, type NosingLockObject } from '../content/nosing.ts';
import {
  BONUS_KINDS,
  buildNosingBoard,
  pickDogSquare,
  nosingRollSeed,
  nosingSpec,
  rerollFor,
  rollFor,
  STEPS_BONUS,
  answerDestination,
  obstacleBack,
  speedBonusDraw,
  stepsFrom,
  type BonusKind,
  type NosingBoard,
  type NosingLevel,
} from './nosingBoard.ts';
import { question, questionHint, wordingPairs, type Question } from './mentalMaths.ts';
import { buildDogFight, dogApply, dogSimView, dogStart, type DogFight, type DogHint, type DogSim, type DogView } from './dogFight.ts';
import { SPEED_COUNT, SPEED_SECONDS, speedQuestions, speedReward, type SpeedQuestion } from './speedRound.ts';
import { buildLock, lockAccepts, lockHand, lockHint, lockNote, lockWindow, type Lock, type LockHint, type Op } from './lock.ts';
import {
  PALETTE,
  allSlots,
  clear,
  emptyFill,
  evaluateGrid,
  getSlot,
  place,
  usedNumbers,
  type GridEval,
  type GridFill,
  type Hand,
  type Slot,
} from './numberGrid.ts';

// --- The puzzle ---

export interface NosingPuzzle {
  seed: string;
  level: NosingLevel;
  house: House;
  board: NosingBoard;
  /** A question for every ladder, snake, obstacle and search square, by path index. */
  questions: Record<number, Question>;
  /** The speed round's 40 sums for every speed square, by path index. */
  speed: Record<number, SpeedQuestion[]>;
  lock: Lock;
  lockObject: NosingLockObject;
  /** All the game's clue ids, in order. */
  clues: string[];
  /** Search square `clueIndex` k finds `searchClues[k]`. */
  searchClues: string[];
  /** Given when the lock opens. */
  lockClues: string[];
  ladders: readonly NosingJump[];
  snakes: readonly NosingJump[];
  /** The snake head (a path index) where the dog waits. It has no question. */
  dogSquare: number;
  /** The dog's fight, built once. */
  dogFight: DogFight;
}

export interface BuildNosingOptions {
  house: House;
  seed: string;
  level: NosingLevel;
  sceneRoom: string;
  /** The game's clue ids in order (1 to 7; the Quick play stand-in only ever has 3 to 7). */
  clues: string[];
  ladders: readonly NosingJump[];
  snakes: readonly NosingJump[];
}

/** The seed text a game spec's numeric seed becomes. Engine and registry both use it. */
export const nosingSeed = (specSeed: number): string => `nosing-${specSeed}`;

/** The clue split for a share: shares 1 to 3 give the lock 1 clue, any more gives it 2; the rest are search clues (share 1 has none). */
export function nosingSplit(share: number): { search: number; lock: number } {
  const lock = share <= 3 ? 1 : 2;
  return { search: share - lock, lock };
}

export function buildNosing(o: BuildNosingOptions): NosingPuzzle {
  const { house, seed, level, sceneRoom, clues, ladders, snakes } = o;
  if (clues.length < 1 || clues.length > 7) throw new Error(`Nosing around needs 1 to 7 clues, not ${clues.length}`);
  const split = nosingSplit(clues.length);
  const board = buildNosingBoard({ house, level, seed, sceneRoom, searchClues: split.search, ladders, snakes });
  const questions: Record<number, Question> = {};
  const speed: Record<number, SpeedQuestion[]> = {};
  // One dog per run, on a snake head picked from the seed; the dog replaces that snake's question.
  const dogSquare = pickDogSquare(board, seed);
  // Wordings come from a seeded shuffled deck, so none repeats until the deck is used up; then a fresh deck.
  const pairs = wordingPairs(level);
  let deck: typeof pairs = [];
  let decks = 0;
  const deal = () => {
    if (deck.length === 0) {
      deck = new Rng(hashSeed(decks === 0 ? `${seed}-questions` : `${seed}-questions-${decks}`)).shuffle(pairs);
      decks++;
    }
    return deck.pop()!;
  };
  board.squares.forEach((sq, i) => {
    if (sq.kind === 'ladder' || sq.kind === 'snake' || sq.kind === 'obstacle' || sq.kind === 'search') {
      if (i === dogSquare) return;
      const p = deal();
      questions[i] = question(`${seed}-q-${i}`, level, p.kind, p.wording);
    } else if (sq.kind === 'speed') speed[i] = speedQuestions(`${seed}-speed-${i}`, level);
  });
  const lockObject = new Rng(hashSeed(`${seed}-object`)).pick(nosingLockObjects);
  return {
    seed,
    level,
    house,
    board,
    questions,
    speed,
    lock: buildLock(`${seed}-lock`, level),
    lockObject,
    clues: clues.slice(),
    searchClues: clues.slice(0, split.search),
    lockClues: clues.slice(split.search),
    ladders,
    snakes,
    dogSquare,
    dogFight: buildDogFight(`${seed}-dog-${dogSquare}`, level),
  };
}

// --- Her moves ---

export type NosingMove =
  | { t: 'roll' }
  | { t: 'reroll' }
  | { t: 'answer'; value: number }
  | { t: 'speed'; right: number }
  /** At the lock: put a card in a slot. A number card is an index into `lock.numbers`; an operator is a palette `Op`. */
  | { t: 'place'; slot: Slot; card: number | Op }
  | { t: 'clear'; slot: Slot }
  | { t: 'clearAll' }
  /** At the lock: submit the grid's answer. */
  | { t: 'try' }
  /** In the dog fight: play the grid. (`place`, `clear` and `clearAll` act on the fight's grid there; a card is an index into the fight hand.) */
  | { t: 'play' }
  /** In the dog fight: the once-per-fight swap of 1 or 2 cards (indexes into the fight hand). */
  | { t: 'swap'; nums: number[]; ops: number[] }
  /** A cat hint was taken (also counted in `hints`); it lets the next hint be a step stronger. */
  | { t: 'hint' }
  /** Solve on a question square or in the dog fight: the cat answers that step for her (also counted in `hints`). */
  | { t: 'solve' };

/**
 * The save version. 2: the dog fight got its challenge, +1/+1 bonus and swap, which replay old
 * fights differently. A save without `v` is older, and `nosingUpgrade` restarts its dog fight.
 */
export const NOSING_VERSION = 2;

export interface NosingState {
  moves: NosingMove[];
  hints: number;
  solved?: 'revealed';
  v?: number;
}

export const nosingInitial = (): NosingState => ({ moves: [], hints: 0, v: NOSING_VERSION });

/** A move from before the lock moved onto the number grid. */
export type LegacyNosingMove = { t: 'combine'; a: number; b: number; op: Op } | { t: 'undo' };

/** A save as read from storage: it may still hold moves from the old tile lock. */
export interface SavedNosingState {
  moves: (NosingMove | LegacyNosingMove)[];
  hints: number;
  solved?: 'revealed';
  v?: number;
}

/**
 * Old saves: the lock used to be tiles joined by `combine` and `undo`. From the
 * first of those (or the first `try`, which then meant a tile's value) on, the
 * moves belonged to the lock, the last square, so they are dropped; `hints` and
 * `solved` stay. A state with none of them comes back as it is. When the game is
 * already `finished`, the cut leaves it open as `revealed`, so its clues stay.
 * A save from before version 2 that has made a move inside the dog fight is cut at
 * that move (the fight restarts from turn 1, later moves are dropped) the same way;
 * it needs the puzzle to replay where the fight starts.
 */
export function nosingUpgrade(state: SavedNosingState, p: NosingPuzzle, finished = false): NosingState {
  const old = (m: { t: string }) => m.t === 'combine' || m.t === 'undo';
  let moves = state.moves;
  let cut = false;
  if (moves.some(old)) {
    moves = moves.slice(0, moves.findIndex((m) => old(m) || m.t === 'try'));
    cut = true;
  }
  let v = state.v;
  if ((v ?? 1) < NOSING_VERSION) {
    const sim = newSim();
    const at = moves.findIndex((m) => {
      if (sim.phase === 'dog') return true;
      act(p, sim, m as NosingMove);
      return false;
    });
    if (at >= 0) {
      moves = moves.slice(0, at);
      cut = true;
    }
    v = NOSING_VERSION;
  }
  if (!cut && v === state.v) return state as NosingState;
  const out = { ...state, moves, v } as NosingState;
  return cut && finished && !state.solved ? { ...out, solved: 'revealed' } : out;
}

export const TRIES = 3;
export { STEPS_BONUS };

// --- The view ---

export type NosingPhase = 'roll' | 'rolled' | 'question' | 'dog' | 'speed' | 'lock' | 'open';

export interface NosingQuestionView {
  /** The path index of the square. */
  square: number;
  kind: 'ladder' | 'snake' | 'obstacle' | 'search';
  q: Question;
  /** Snake: where a wrong answer sends the cat. */
  slipTo: number | null;
  /** Ladder: where a right answer takes it. */
  climbTo: number | null;
  /** Obstacle and bonus search: what a right answer wins. */
  bonus: BonusKind | null;
  /** Search that holds a clue: the clue id a right answer finds now; otherwise null. */
  clueId: string | null;
}

export interface NosingSpeedView {
  square: number;
  questions: SpeedQuestion[];
  seconds: number;
}

export interface NosingView {
  phase: NosingPhase;
  /** The number of the roll she is about to make (or has just made, in `rolled`). Turns taken = turn - 1 once the cat has moved. */
  turn: number;
  /** The cat's path index. */
  pos: number;
  /** The last roll made (null before the first). */
  lastRoll: number | null;
  /** In `rolled`: the roll waiting to be played (she may swap it once with `reroll`). */
  pendingRoll: number | null;
  /** Every path index the cat has stood on, in order (slides and ladders included). */
  trail: number[];
  /** Path indexes of snake heads and ladder feet already used. */
  usedSnakes: number[];
  takenLadders: number[];
  /** Question, search, speed and cat-find squares used up (a right answer, a played speed round, a cat find landed on). A wrong answer does not spend one. */
  spent: number[];
  /** Bonuses held (`reroll` is used up when swapped; `steps` is never held, it applies at once). */
  bonuses: Record<BonusKind, number>;
  /** Clue ids found so far, in order found. */
  found: string[];
  /** Search clues she answered wrong: they come with the lock (as do any she never landed on). */
  waiting: string[];
  question: NosingQuestionView | null;
  speed: NosingSpeedView | null;
  /** The dog fight: in the `dog` phase, and after the move that ends it (so its result can show); null otherwise. */
  dog: DogView | null;
  /** The lock: her grid, how it adds up, the cards she holds, the slots the cat filled (she can't clear them), tries left, what it accepts. */
  grid: GridFill;
  evaluation: GridEval;
  hand: Hand;
  locked: Slot[];
  triesLeft: number;
  window: [number, number];
  /** With a torch: a number the stored way never uses. */
  torch: number | null;
  /** With a torch: the index in `hand.numbers` of that card. */
  torchCard: number | null;
  /** Close but not exact: the cat's bout of inspiration, the exact way to show (show it with `gridLines`). */
  inspiration: GridFill | null;
  /** When the lock opened as `revealed`: the exact way to show. */
  way: GridFill | null;
  finished: 'won' | 'revealed' | null;
  /** How many hints she has already taken on this question or lock position. */
  hintStep: number;
  /** What happened on her last move, as sentences. */
  messages: string[];
  /** After a wrong answer: the working, one line each. */
  working: string[] | null;
}

// --- Replay ---

interface Sim {
  turn: number;
  pos: number;
  phase: NosingPhase;
  lastRoll: number | null;
  pendingRoll: number | null;
  trail: number[];
  usedSnakes: Set<number>;
  takenLadders: Set<number>;
  spent: Set<number>;
  bonuses: Record<BonusKind, number>;
  found: string[];
  waiting: string[];
  square: number | null;
  /** Her grid, and the base it can't go below (the cat's note). */
  fill: GridFill;
  base: GridFill;
  triesUsed: number;
  triesTotal: number;
  finished: 'won' | 'revealed' | null;
  inspiration: GridFill | null;
  way: GridFill | null;
  hintRun: number;
  messages: string[];
  working: string[] | null;
  /** The running dog fight (kept after it ends, until the next move). */
  fight: DogSim | null;
  /** While the dog has stopped the cat: where the move was going, and whether that square then triggers (a roll) or not (steps, a ladder). */
  resume: { to: number; land: boolean } | null;
}

const noBonuses = (): Record<BonusKind, number> => ({ steps: 0, spareTry: 0, torch: 0, note: 0, reroll: 0, closeEnough: 0 });

function newSim(): Sim {
  return {
    turn: 1,
    pos: 0,
    phase: 'roll',
    lastRoll: null,
    pendingRoll: null,
    trail: [0],
    usedSnakes: new Set(),
    takenLadders: new Set(),
    spent: new Set(),
    bonuses: noBonuses(),
    found: [],
    waiting: [],
    square: null,
    fill: emptyFill(),
    base: emptyFill(),
    triesUsed: 0,
    triesTotal: TRIES,
    finished: null,
    inspiration: null,
    way: null,
    hintRun: 0,
    messages: [],
    working: null,
    fight: null,
    resume: null,
  };
}

const lastOf = (p: NosingPuzzle) => p.board.path.length - 1;
const lockedSlots = (sim: Sim): Slot[] => allSlots().filter((s) => getSlot(sim.base, s) !== null);
const isLocked = (sim: Sim, slot: Slot) => getSlot(sim.base, slot) !== null;
const sameFill = (a: GridFill, b: GridFill) => JSON.stringify(a) === JSON.stringify(b);

function gain(p: NosingPuzzle, sim: Sim, kind: BonusKind): void {
  const info = nosingBonuses[kind];
  sim.messages.push(`${info.name}. ${info.copy}`);
  if (kind === 'steps') {
    const len = p.board.path.length;
    if (sim.resume) sim.resume.to = stepsFrom(sim.resume.to, len); // already stopped by the dog: the steps carry on from where it was going
    else carryTo(p, sim, stepsFrom(sim.pos, len), false);
  } else sim.bonuses[kind]++;
}

/**
 * Moves the cat to `to`, unless the dog is still here and `to` is on or past its square:
 * then the cat stops on the dog's square and the fight starts, and `to` waits in `resume`.
 */
function carryTo(p: NosingPuzzle, sim: Sim, to: number, land: boolean): void {
  const d = p.dogSquare;
  if (!sim.usedSnakes.has(d) && sim.pos < d && to >= d) {
    sim.pos = d;
    sim.trail.push(d);
    sim.resume = { to, land };
    sim.phase = 'dog';
    sim.square = d;
    sim.fight = dogStart(p.dogFight);
  } else {
    sim.pos = to;
    sim.trail.push(to);
  }
}

function enterLock(p: NosingPuzzle, sim: Sim): void {
  sim.phase = 'lock';
  sim.pendingRoll = null;
  sim.square = null;
  sim.triesTotal = TRIES + sim.bonuses.spareTry;
  // A note from the cat fills in the start of the stored way (several notes go no further).
  // Those slots are locked: Clear leaves them.
  sim.base = sim.bonuses.note > 0 ? lockNote(p.lock) : emptyFill();
  sim.fill = sim.base;
  if (sim.bonuses.note > 0) sim.messages.push('The cat filled in the start of the lock for you.');
}

function openLock(p: NosingPuzzle, sim: Sim, how: 'won' | 'revealed'): void {
  sim.phase = 'open';
  sim.finished = how;
  sim.pos = lastOf(p);
  // Every clue is guaranteed: the lock's, the ones that waited, and any search square she never landed on.
  sim.found = [...sim.found, ...p.lockClues, ...p.searchClues.filter((id) => !sim.found.includes(id))];
  sim.waiting = [];
  if (how === 'revealed') sim.way = p.lock.way;
}

/** Ask a question on the square, or fall through to a plain square. */
function land(p: NosingPuzzle, sim: Sim): void {
  const sq = p.board.squares[sim.pos];
  const ask = () => {
    sim.phase = 'question';
    sim.square = sim.pos;
  };
  sim.phase = 'roll';
  sim.square = null;
  if (sim.pos === lastOf(p)) return; // settled into the lock below
  switch (sq.kind) {
    case 'catFind':
      if (!sim.spent.has(sim.pos)) {
        sim.spent.add(sim.pos);
        sim.messages.push(nosingCatFindLines[sim.pos % nosingCatFindLines.length]);
        gain(p, sim, sq.bonus!);
      }
      break;
    case 'ladder':
      ask();
      break;
    case 'snake':
      // The dog's square is never asked: the dog stops the cat there (`carryTo`), then it is a used snake.
      if (!sim.usedSnakes.has(sim.pos)) ask();
      break;
    case 'obstacle':
    case 'search':
      if (!sim.spent.has(sim.pos)) ask();
      break;
    case 'speed':
      if (!sim.spent.has(sim.pos)) sim.phase = 'speed';
      break;
    default:
      break;
  }
}

function moveCat(p: NosingPuzzle, sim: Sim, roll: number): void {
  sim.lastRoll = roll;
  sim.pendingRoll = null;
  sim.turn++;
  carryTo(p, sim, Math.min(sim.pos + roll, lastOf(p)), true);
  if (sim.phase !== 'dog') land(p, sim);
}

/** The line for a search square, worded the same when she finds the clue and on its encounter card. */
export function searchLine(p: NosingPuzzle, pos: number): string {
  const room = p.house.rooms.find((r) => r.id === p.board.roomOf[pos]);
  const rng = new Rng(hashSeed(`${p.seed}-line-${pos}`));
  const line = rng.pick(nosingSearchLines);
  return line.replace('{thing}', room && room.things.length ? rng.pick(room.things).toLowerCase() : 'furniture');
}

function answer(p: NosingPuzzle, sim: Sim, value: number): void {
  const at = sim.square!;
  const sq = p.board.squares[at];
  const q = p.questions[at];
  const right = value === q.answer;
  sim.square = null;
  sim.phase = 'roll';
  if (!right) {
    sim.working = q.working;
    sim.messages.push('Not quite.');
  }
  switch (sq.kind) {
    case 'ladder': {
      if (right) {
        const c = p.ladders.find((l) => l.id === sq.contentId);
        sim.takenLadders.add(at);
        sim.messages.push(c ? c.description : 'The cat took a shortcut.');
        carryTo(p, sim, answerDestination(sq, at, true, p.board.path.length), false);
      }
      break;
    }
    case 'snake': {
      const c = p.snakes.find((l) => l.id === sq.contentId);
      if (right) sim.messages.push('Right. The cat kept its footing.');
      else {
        sim.usedSnakes.add(at);
        sim.pos = answerDestination(sq, at, false, p.board.path.length);
        sim.trail.push(sim.pos);
        sim.messages.push(c ? c.description : 'The cat slid back.');
      }
      break;
    }
    case 'obstacle':
      if (right) {
        sim.spent.add(at);
        gain(p, sim, sq.bonus!);
      } else {
        // Back two squares (not below the start); the square it lands on does not trigger, and the obstacle stays open.
        sim.pos = obstacleBack(at);
        sim.trail.push(sim.pos);
        sim.messages.push(nosingObstacleBackLine);
      }
      break;
    default: {
      // search
      const id = sq.clueIndex == null ? null : p.searchClues[sq.clueIndex];
      if (right) {
        sim.spent.add(at);
        sim.messages.push(searchLine(p, at));
        if (id) {
          if (!sim.found.includes(id)) sim.found.push(id);
          sim.waiting = sim.waiting.filter((w) => w !== id);
          sim.messages.push('The cat found a clue.');
        } else gain(p, sim, sq.bonus!);
      } else if (id && !sim.found.includes(id) && !sim.waiting.includes(id)) {
        sim.waiting.push(id);
        sim.messages.push('The clue will wait at the lock.');
      }
    }
  }
}

/** The bonuses a won fight pays: two draws from the seed, never `steps`, so the turn bounds are unchanged. */
export function dogReward(seed: string): BonusKind[] {
  const kinds = BONUS_KINDS.filter((k) => k !== 'steps');
  const rng = new Rng(hashSeed(`${seed}-dog-reward`));
  return [rng.pick(kinds), rng.pick(kinds)];
}

/**
 * The fight is over. A win is a right answer on the snake (the cat stays put), a
 * loss a wrong one (it slides); either way the snake is used and the dog is gone.
 */
function endDog(p: NosingPuzzle, sim: Sim, won: boolean): void {
  const at = sim.square!;
  const sq = p.board.squares[at];
  sim.square = null;
  sim.phase = 'roll';
  sim.usedSnakes.add(at);
  const resume = sim.resume;
  sim.resume = null;
  if (won) {
    sim.messages.push(nosingDog.win);
    for (const kind of dogReward(p.seed)) gain(p, sim, kind);
    // The cat carries on to where the move was going; a rolled-to square triggers as normal.
    if (resume && resume.to !== at) {
      sim.pos = resume.to;
      sim.trail.push(sim.pos);
      if (resume.land) land(p, sim);
      settle(p, sim);
    }
  } else {
    const c = p.snakes.find((l) => l.id === sq.contentId);
    sim.pos = answerDestination(sq, at, false, p.board.path.length);
    sim.trail.push(sim.pos);
    sim.messages.push(nosingDog.lose(`square ${sim.pos + 1}`));
    if (c) sim.messages.push(c.description);
  }
}

/** The cat on the last square goes to the lock (once). */
function settle(p: NosingPuzzle, sim: Sim): void {
  if (sim.pos >= lastOf(p) && sim.phase !== 'lock' && sim.phase !== 'open') enterLock(p, sim);
}

/** Applies one move to `sim`. False (and `sim` untouched) when the move isn't legal now. */
function act(p: NosingPuzzle, sim: Sim, move: NosingMove): boolean {
  if (sim.finished) return false;
  // The fight's result is only in the view for the move that ended it.
  if (sim.fight?.over) {
    sim.fight = null;
    sim.messages = [];
  }
  switch (move.t) {
    case 'hint':
      if (sim.phase !== 'question' && sim.phase !== 'lock' && sim.phase !== 'dog') return false;
      if (sim.phase === 'dog') return dogApply(sim.fight!, { t: 'hint' }).ok;
      if (sim.phase === 'lock') {
        // A lock hint fills her grid with that much of the stored way.
        const h = lockHint(p.lock, sim.fill, sim.hintRun);
        if (h.kind === 'fill') sim.fill = h.fill;
      }
      sim.hintRun++;
      return true;
    case 'solve': {
      if (sim.phase === 'question' && sim.square != null) {
        const q = p.questions[sim.square];
        sim.hintRun = 0;
        sim.messages = [];
        sim.working = null;
        answer(p, sim, q.answer);
        sim.working = q.working; // show the working for the step she was given
        break;
      }
      if (sim.phase === 'dog' && sim.fight && !sim.fight.over) {
        sim.messages = [];
        sim.fight.over = 'won';
        endDog(p, sim, true);
        break;
      }
      return false;
    }
    case 'roll': {
      if (sim.phase !== 'roll' && sim.phase !== 'rolled') return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.fight = null;
      if (sim.phase === 'rolled') {
        moveCat(p, sim, sim.pendingRoll!);
      } else {
        const r = rollFor(nosingRollSeed(p.seed, p.board.attempt), nosingSpec(p.house, p.level), sim.turn);
        // Always stop after rolling, so the UI can show where the cat would land before it moves.
        sim.lastRoll = r;
        sim.pendingRoll = r;
        sim.phase = 'rolled';
      }
      break;
    }
    case 'reroll': {
      if (sim.phase !== 'rolled' || sim.bonuses.reroll < 1) return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.fight = null;
      sim.bonuses.reroll--;
      moveCat(p, sim, rerollFor(nosingRollSeed(p.seed, p.board.attempt), nosingSpec(p.house, p.level), sim.turn));
      break;
    }
    case 'answer': {
      if (sim.phase !== 'question' || !Number.isInteger(move.value)) return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      answer(p, sim, move.value);
      break;
    }
    case 'speed': {
      if (sim.phase !== 'speed' || !Number.isInteger(move.right) || move.right < 0 || move.right > SPEED_COUNT) return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      const reward = speedReward(p.level, move.right);
      sim.spent.add(sim.pos);
      sim.phase = 'roll';
      sim.messages.push(`Time. ${move.right} right.`);
      for (const kind of speedBonusDraw(p.seed, sim.pos, reward.bonuses)) gain(p, sim, kind);
      if (reward.steps) gain(p, sim, 'steps');
      break;
    }
    case 'place': {
      if (sim.phase === 'dog') return typeof move.card === 'number' && dogApply(sim.fight!, { t: 'place', slot: move.slot, card: move.card }).ok;
      if (sim.phase !== 'lock') return false;
      const { slot, card } = move;
      const valid =
        slot.kind === 'num'
          ? Number.isInteger(card) && (card as number) >= 0 && (card as number) < p.lock.numbers.length
          : PALETTE.includes(card as Op);
      if (!valid || getSlot(sim.fill, slot) === card || isLocked(sim, slot)) return false;
      const next = place(sim.fill, slot, card);
      if (next === sim.fill) return false; // that number is already placed
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.fill = next;
      return true;
    }
    case 'clear': {
      if (sim.phase === 'dog') return dogApply(sim.fight!, move).ok;
      if (sim.phase !== 'lock' || getSlot(sim.fill, move.slot) === null || isLocked(sim, move.slot)) return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.fill = clear(sim.fill, move.slot);
      return true;
    }
    case 'swap':
      return sim.phase === 'dog' && dogApply(sim.fight!, { t: 'swap', nums: move.nums, ops: move.ops }).ok;
    case 'clearAll': {
      if (sim.phase === 'dog') return dogApply(sim.fight!, move).ok;
      if (sim.phase !== 'lock' || sameFill(sim.fill, sim.base)) return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.fill = sim.base;
      return true;
    }
    case 'play': {
      if (sim.phase !== 'dog') return false;
      sim.messages = [];
      if (!dogApply(sim.fight!, move).ok) return false;
      const over = sim.fight!.over;
      if (over) endDog(p, sim, over === 'won');
      return true;
    }
    case 'try': {
      if (sim.phase !== 'lock') return false;
      const ev = evaluateGrid(lockHand(p.lock), sim.fill);
      if (!ev.submittable || sim.triesUsed >= sim.triesTotal) return false;
      const value = ev.answer!;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.triesUsed++;
      if (lockAccepts(p.lock, value, sim.bonuses.closeEnough)) {
        if (value !== p.lock.target) {
          sim.inspiration = p.lock.way;
          sim.messages.push('Close enough. The cat has a bout of inspiration and shows the exact way.');
        }
        sim.messages.push('The lock clicks open.');
        openLock(p, sim, 'won');
      } else if (sim.triesUsed >= sim.triesTotal) {
        sim.messages.push('Out of tries. The cat shows the way and the lock opens.');
        openLock(p, sim, 'revealed');
      } else sim.messages.push(`Not that number. ${sim.triesTotal - sim.triesUsed} left.`);
      return true;
    }
  }
  // Roll, reroll, answer and speed end here: the cat may have reached the lock.
  settle(p, sim);
  return true;
}

function replay(p: NosingPuzzle, state: NosingState): Sim {
  const sim = newSim();
  for (const m of state.moves) act(p, sim, m);
  if (state.solved && !sim.finished) {
    sim.messages = [];
    sim.working = null;
    sim.trail.push(lastOf(p));
    if (sim.phase !== 'lock') {
      sim.phase = 'lock';
      sim.fill = emptyFill();
      sim.base = sim.fill;
    }
    sim.square = null;
    sim.pendingRoll = null;
    sim.fight = null;
    openLock(p, sim, 'revealed');
    sim.messages.push('The cat shows the way and the lock opens.');
  }
  return sim;
}

/** The indexes of the numbers the stored way never uses, first one first. */
function unusedNumbers(lock: Lock): number[] {
  const used = new Set(usedNumbers(lock.way));
  return lock.numbers.map((_, i) => i).filter((i) => !used.has(i));
}

export function nosingView(p: NosingPuzzle, state: NosingState): NosingView {
  const sim = replay(p, state);
  let question: NosingQuestionView | null = null;
  if (sim.phase === 'question' && sim.square != null) {
    const sq = p.board.squares[sim.square];
    question = {
      square: sim.square,
      kind: sq.kind as NosingQuestionView['kind'],
      q: p.questions[sim.square],
      slipTo: sq.kind === 'snake' ? sq.to! : null,
      climbTo: sq.kind === 'ladder' ? sq.to! : null,
      bonus: sq.kind === 'obstacle' || (sq.kind === 'search' && sq.clueIndex == null) ? sq.bonus! : null,
      clueId: sq.kind === 'search' && sq.clueIndex != null ? p.searchClues[sq.clueIndex] : null,
    };
  }
  const speed: NosingSpeedView | null =
    sim.phase === 'speed' ? { square: sim.pos, questions: p.speed[sim.pos], seconds: SPEED_SECONDS } : null;
  const unused = sim.bonuses.torch > 0 ? unusedNumbers(p.lock) : [];
  const hand = lockHand(p.lock);
  return {
    phase: sim.phase,
    turn: sim.turn,
    pos: sim.pos,
    lastRoll: sim.lastRoll,
    pendingRoll: sim.pendingRoll,
    trail: sim.trail.slice(),
    usedSnakes: [...sim.usedSnakes],
    takenLadders: [...sim.takenLadders],
    spent: [...sim.spent],
    bonuses: { ...sim.bonuses },
    found: sim.found.slice(),
    waiting: sim.waiting.slice(),
    question,
    speed,
    dog: sim.fight ? dogSimView(p.dogFight, sim.fight) : null,
    grid: sim.fill,
    evaluation: evaluateGrid(hand, sim.fill),
    hand,
    locked: lockedSlots(sim),
    triesLeft: Math.max(0, sim.triesTotal - sim.triesUsed),
    window: lockWindow(p.lock.target, sim.bonuses.closeEnough),
    torch: unused.length ? p.lock.numbers[unused[0]] : null,
    torchCard: unused.length ? unused[0] : null,
    inspiration: sim.inspiration,
    way: sim.way,
    finished: sim.finished,
    hintStep: sim.phase === 'dog' && sim.fight ? sim.fight.hintRun : sim.hintRun,
    messages: sim.messages.slice(),
    working: sim.working,
  };
}

/**
 * In `rolled`: the path index the cat would stop on if it moved with the pending roll
 * (the dog may stop it early). Null when there is no pending roll. The square is not triggered here.
 */
export function nosingLanding(p: NosingPuzzle, view: NosingView): number | null {
  if (view.phase !== 'rolled' || view.pendingRoll == null) return null;
  const to = Math.min(view.pos + view.pendingRoll, lastOf(p));
  const d = p.dogSquare;
  return !view.usedSnakes.includes(d) && view.pos < d && to >= d ? d : to;
}

/** One move. An illegal move gives back the same state. */
export function nosingStep(p: NosingPuzzle, state: NosingState, move: NosingMove): NosingState {
  if (move.t === 'hint' || move.t === 'solve') return state; // these go through `nosingHint` and `nosingSolveStep`
  if (state.solved) return state;
  if (!act(p, replay(p, state), move)) return state;
  return { ...state, moves: [...state.moves, move] };
}

/** Solve: the cat goes to the end, the lock opens, every clue is given. Recorded as `revealed`. */
export function nosingSolve(_p: NosingPuzzle, state: NosingState): NosingState {
  return state.solved ? state : { ...state, solved: 'revealed' };
}

/** What the header Solve does in this view: solve the step (question, dog fight), open the lock, or nothing (hidden). */
export function nosingSolveKind(view: NosingView): 'step' | 'lock' | null {
  if (view.finished) return null;
  if (view.phase === 'question' || view.phase === 'dog') return 'step';
  return view.phase === 'lock' ? 'lock' : null;
}

/** Solve the step she is on (a question or the dog fight): the cat answers it, counted as a hint. Illegal elsewhere: the same state. */
export function nosingSolveStep(p: NosingPuzzle, state: NosingState): NosingState {
  if (state.solved) return state;
  const move: NosingMove = { t: 'solve' };
  if (!act(p, replay(p, state), move)) return state;
  return { ...state, moves: [...state.moves, move], hints: state.hints + 1 };
}

export type NosingHint =
  /** In a question: step 0 first line of the working, 1 the three choices, 2 the answer. */
  | { kind: 'question'; step: number; text: string; choices: [number, number, number] | null; answer: number | null }
  /** At the lock: see `LockHint`. */
  | { kind: 'lock'; hint: LockHint }
  /** In the dog fight: see `DogHint`. */
  | { kind: 'dog'; hint: DogHint };

/** A cat hint for the question or lock she is on, and the state with the hint counted. Null elsewhere (never in the speed round). */
export function nosingHint(p: NosingPuzzle, state: NosingState): { hint: NosingHint; state: NosingState } | null {
  if (state.solved) return null;
  const sim = replay(p, state);
  let hint: NosingHint;
  if (sim.phase === 'question' && sim.square != null) {
    const q = p.questions[sim.square];
    const step = sim.hintRun;
    hint = { kind: 'question', step, text: questionHint(q, step), choices: step === 1 ? q.choices : null, answer: step >= 2 ? q.answer : null };
  } else if (sim.phase === 'lock') {
    hint = { kind: 'lock', hint: lockHint(p.lock, sim.fill, sim.hintRun) };
  } else if (sim.phase === 'dog') {
    const r = dogApply(sim.fight!, { t: 'hint' });
    if (!r.ok || !r.hint) return null;
    hint = { kind: 'dog', hint: r.hint };
  } else return null;
  return { hint, state: { ...state, moves: [...state.moves, { t: 'hint' }], hints: state.hints + 1 } };
}
