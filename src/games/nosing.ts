// "Nosing around": the run. A snakes-and-ladders walk round the house with sums
// on the way, ending at a numbers lock. The puzzle is rebuilt from a seed; the
// saved state is only her moves, and `nosingView` replays them. Pure, no React.

import { Rng, hashSeed } from '../engine/rng.ts';
import type { House } from '../engine/types.ts';
import { nosingBonuses, nosingCatFindLines, nosingLockObjects, nosingSearchLines, type NosingJump, type NosingLockObject } from '../content/nosing.ts';
import {
  buildNosingBoard,
  nosingRollSeed,
  rerollFor,
  rollFor,
  STEPS_BONUS,
  answerDestination,
  speedBonusDraw,
  stepsFrom,
  type BonusKind,
  type NosingBoard,
  type NosingLevel,
} from './nosingBoard.ts';
import { question, questionHint, type Question } from './mentalMaths.ts';
import { SPEED_COUNT, SPEED_SECONDS, speedQuestions, speedReward, type SpeedQuestion } from './speedRound.ts';
import {
  buildLock,
  lockAccepts,
  lockMove,
  lockHint,
  lockStart,
  lockSubmittable,
  lockWindow,
  type Lock,
  type LockHint,
  type LockMove,
  type LockTile,
  type Op,
  type Step,
} from './lock.ts';

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
  board.squares.forEach((sq, i) => {
    if (sq.kind === 'ladder' || sq.kind === 'snake' || sq.kind === 'obstacle' || sq.kind === 'search') questions[i] = question(`${seed}-q-${i}`, level);
    else if (sq.kind === 'speed') speed[i] = speedQuestions(`${seed}-speed-${i}`, level);
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
  };
}

// --- Her moves ---

export type NosingMove =
  | { t: 'roll' }
  | { t: 'reroll' }
  | { t: 'answer'; value: number }
  | { t: 'speed'; right: number }
  | { t: 'combine'; a: number; b: number; op: Op }
  | { t: 'undo' }
  | { t: 'try' }
  /** A cat hint was taken (also counted in `hints`); it lets the next hint be a step stronger. */
  | { t: 'hint' };

export interface NosingState {
  moves: NosingMove[];
  hints: number;
  solved?: 'revealed';
}

export const nosingInitial = (): NosingState => ({ moves: [], hints: 0 });

export const TRIES = 3;
export { STEPS_BONUS };

// --- The view ---

export type NosingPhase = 'roll' | 'rolled' | 'question' | 'speed' | 'lock' | 'open';

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
  /** Bonuses held (`reroll` is used up when swapped; `steps` is never held, it applies at once). */
  bonuses: Record<BonusKind, number>;
  /** Clue ids found so far, in order found. */
  found: string[];
  /** Search clues she answered wrong: they come with the lock (as do any she never landed on). */
  waiting: string[];
  question: NosingQuestionView | null;
  speed: NosingSpeedView | null;
  /** The lock: her tiles, the one she may try, tries left, what it accepts. */
  tiles: LockTile[];
  submittable: LockTile | null;
  triesLeft: number;
  window: [number, number];
  /** With a torch: a number the stored way never uses. */
  torch: number | null;
  /** Close but not exact: the cat's bout of inspiration, the exact way to show. */
  inspiration: Step[] | null;
  /** When the lock opened as `revealed`: the exact way to show. */
  way: Step[] | null;
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
  tileStack: LockTile[][];
  triesUsed: number;
  triesTotal: number;
  finished: 'won' | 'revealed' | null;
  inspiration: Step[] | null;
  way: Step[] | null;
  hintRun: number;
  messages: string[];
  working: string[] | null;
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
    tileStack: [],
    triesUsed: 0,
    triesTotal: TRIES,
    finished: null,
    inspiration: null,
    way: null,
    hintRun: 0,
    messages: [],
    working: null,
  };
}

const lastOf = (p: NosingPuzzle) => p.board.path.length - 1;
const tilesOf = (sim: Sim) => sim.tileStack[sim.tileStack.length - 1] ?? [];

/** The move that makes `step` from the tiles she holds. */
function moveFor(tiles: readonly LockTile[], step: Step): LockMove | null {
  const a = tiles.findIndex((t) => t.value === step.a);
  const b = tiles.findIndex((t, i) => i !== a && t.value === step.b);
  return a < 0 || b < 0 ? null : { a, b, op: step.op };
}

function gain(p: NosingPuzzle, sim: Sim, kind: BonusKind): void {
  const info = nosingBonuses[kind];
  sim.messages.push(`${info.name}. ${info.copy}`);
  if (kind === 'steps') {
    sim.pos = stepsFrom(sim.pos, p.board.path.length);
    sim.trail.push(sim.pos);
  } else sim.bonuses[kind]++;
}

function enterLock(p: NosingPuzzle, sim: Sim): void {
  sim.phase = 'lock';
  sim.pendingRoll = null;
  sim.square = null;
  sim.triesTotal = TRIES + sim.bonuses.spareTry;
  let tiles = lockStart(p.lock.numbers);
  // A note from the cat does the first step(s) of the stored way, never the last.
  const notes = Math.min(sim.bonuses.note, p.lock.way.length - 1);
  for (let i = 0; i < notes; i++) {
    const move = moveFor(tiles, p.lock.way[i]);
    const next = move && lockMove(tiles, move);
    if (!next) break;
    tiles = next.tiles;
  }
  // The base is the starting numbers plus the note's work: undo never goes below it.
  sim.tileStack = [tiles];
  if (notes > 0) sim.messages.push('The cat did the first step of the lock for you.');
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
  sim.pos = Math.min(sim.pos + roll, lastOf(p));
  sim.trail.push(sim.pos);
  land(p, sim);
}

function searchLine(p: NosingPuzzle, pos: number): string {
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
        sim.pos = answerDestination(sq, at, true, p.board.path.length);
        sim.trail.push(sim.pos);
        sim.messages.push(c ? c.description : 'The cat took a shortcut.');
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

/** The cat on the last square goes to the lock (once). */
function settle(p: NosingPuzzle, sim: Sim): void {
  if (sim.pos >= lastOf(p) && sim.phase !== 'lock' && sim.phase !== 'open') enterLock(p, sim);
}

/** Applies one move to `sim`. False (and `sim` untouched) when the move isn't legal now. */
function act(p: NosingPuzzle, sim: Sim, move: NosingMove): boolean {
  if (sim.finished) return false;
  switch (move.t) {
    case 'hint':
      if (sim.phase !== 'question' && sim.phase !== 'lock') return false;
      sim.hintRun++;
      return true;
    case 'roll': {
      if (sim.phase !== 'roll' && sim.phase !== 'rolled') return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      if (sim.phase === 'rolled') {
        moveCat(p, sim, sim.pendingRoll!);
      } else {
        const r = rollFor(nosingRollSeed(p.seed, p.board.attempt), p.level, sim.turn);
        if (sim.bonuses.reroll > 0) {
          sim.lastRoll = r;
          sim.pendingRoll = r;
          sim.phase = 'rolled';
        } else moveCat(p, sim, r);
      }
      break;
    }
    case 'reroll': {
      if (sim.phase !== 'rolled' || sim.bonuses.reroll < 1) return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.bonuses.reroll--;
      moveCat(p, sim, rerollFor(nosingRollSeed(p.seed, p.board.attempt), p.level, sim.turn));
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
    case 'combine': {
      if (sim.phase !== 'lock') return false;
      const next = lockMove(tilesOf(sim), { a: move.a, b: move.b, op: move.op });
      if (!next) return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.tileStack.push(next.tiles);
      return true;
    }
    case 'undo': {
      if (sim.phase !== 'lock' || sim.tileStack.length < 2) return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.tileStack.pop();
      return true;
    }
    case 'try': {
      if (sim.phase !== 'lock') return false;
      const tile = lockSubmittable(tilesOf(sim));
      if (!tile || sim.triesUsed >= sim.triesTotal) return false;
      sim.hintRun = 0;
      sim.messages = [];
      sim.working = null;
      sim.triesUsed++;
      if (lockAccepts(p.lock, tile.value, sim.bonuses.closeEnough)) {
        if (tile.value !== p.lock.target) {
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
      sim.tileStack = [lockStart(p.lock.numbers)];
    }
    sim.square = null;
    sim.pendingRoll = null;
    openLock(p, sim, 'revealed');
    sim.messages.push('The cat shows the way and the lock opens.');
  }
  return sim;
}

/** The numbers (by value) the stored way never uses, first one first. */
function unusedNumbers(lock: Lock): number[] {
  let tiles = lock.numbers.map((value, i) => ({ value, from: [i] }));
  for (const s of lock.way) {
    const a = tiles.findIndex((t) => t.value === s.a);
    const b = tiles.findIndex((t, i) => i !== a && t.value === s.b);
    const joined = { value: s.result, from: [...tiles[a].from, ...tiles[b].from] };
    tiles = [...tiles.filter((_, i) => i !== a && i !== b), joined];
  }
  const used = new Set(tiles.flatMap((t) => t.from));
  return lock.numbers.filter((_, i) => !used.has(i));
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
  const tiles = tilesOf(sim);
  return {
    phase: sim.phase,
    turn: sim.turn,
    pos: sim.pos,
    lastRoll: sim.lastRoll,
    pendingRoll: sim.pendingRoll,
    trail: sim.trail.slice(),
    usedSnakes: [...sim.usedSnakes],
    takenLadders: [...sim.takenLadders],
    bonuses: { ...sim.bonuses },
    found: sim.found.slice(),
    waiting: sim.waiting.slice(),
    question,
    speed,
    tiles: tiles.slice(),
    submittable: lockSubmittable(tiles),
    triesLeft: Math.max(0, sim.triesTotal - sim.triesUsed),
    window: lockWindow(p.lock.target, sim.bonuses.closeEnough),
    torch: unused.length ? unused[0] : null,
    inspiration: sim.inspiration,
    way: sim.way,
    finished: sim.finished,
    hintStep: sim.hintRun,
    messages: sim.messages.slice(),
    working: sim.working,
  };
}

/** One move. An illegal move gives back the same state. */
export function nosingStep(p: NosingPuzzle, state: NosingState, move: NosingMove): NosingState {
  if (move.t === 'hint') return state; // hints go through `nosingHint`
  if (state.solved) return state;
  if (!act(p, replay(p, state), move)) return state;
  return { ...state, moves: [...state.moves, move] };
}

/** Solve: the cat goes to the end, the lock opens, every clue is given. Recorded as `revealed`. */
export function nosingSolve(_p: NosingPuzzle, state: NosingState): NosingState {
  return state.solved ? state : { ...state, solved: 'revealed' };
}

export type NosingHint =
  /** In a question: step 0 first line of the working, 1 the three choices, 2 the answer. */
  | { kind: 'question'; step: number; text: string; choices: [number, number, number] | null; answer: number | null }
  /** At the lock: see `LockHint`. */
  | { kind: 'lock'; hint: LockHint };

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
    hint = { kind: 'lock', hint: lockHint(p.lock, tilesOf(sim), sim.hintRun) };
  } else return null;
  return { hint, state: { ...state, moves: [...state.moves, { t: 'hint' }], hints: state.hints + 1 } };
}
