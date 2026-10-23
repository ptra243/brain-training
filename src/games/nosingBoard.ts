// "Nosing around" board: a winding path over the floor plan, ladders and
// snakes, question squares and bonuses. Pure and seeded; content is passed in.

import { Rng, hashSeed } from '../engine/rng.ts';
import { roomAdjacency } from '../engine/house.ts';
import type { House } from '../engine/types.ts';

export type NosingLevel = 'easy' | 'medium' | 'hard';
export type BonusKind = 'steps' | 'spareTry' | 'torch' | 'note' | 'reroll' | 'closeEnough';
export const BONUS_KINDS: readonly BonusKind[] = ['steps', 'spareTry', 'torch', 'note', 'reroll', 'closeEnough'];

/** What the board needs to know about a ladder or snake (the content lists fit this). */
export interface JumpContent {
  id: string;
  rooms: readonly string[] | 'any';
}

export interface NosingLevelSpec {
  /** Squares per floor-plan cell side. */
  n: number;
  dice: number;
  len: readonly [number, number];
  ladders: number;
  ladderGain: readonly [number, number];
  snakes: number;
  snakeDrop: readonly [number, number];
  turns: readonly [number, number];
  obstacles: number;
  speed: number;
  catFinds: number;
  /** The fewest question squares she must land on, even answering everything wrong. */
  minQuestions: number;
  /** The path ends once (search clues + this) rooms are entered, capped at the room count; absent = every room. */
  enterExtra?: number;
  /** ...but never more than this many rooms. */
  enterMax?: number;
  /** The path never ends in a room it has walked fewer squares of than this; absent = no rule. */
  minEndRoom?: number;
}

export const NOSING_LEVELS: Readonly<Record<NosingLevel, NosingLevelSpec>> = {
  easy: { n: 1, dice: 1, len: [28, 33], ladders: 2, ladderGain: [3, 6], snakes: 1, snakeDrop: [3, 6], turns: [6, 10], obstacles: 5, speed: 1, catFinds: 2, minQuestions: 3 },
  medium: { n: 2, dice: 2, len: [80, 90], ladders: 3, ladderGain: [5, 9], snakes: 2, snakeDrop: [4, 8], turns: [10, 16], obstacles: 25, speed: 2, catFinds: 4, minQuestions: 3 },
  hard: { n: 2, dice: 2, len: [80, 90], ladders: 3, ladderGain: [5, 9], snakes: 4, snakeDrop: [5, 9], turns: [10, 16], obstacles: 25, speed: 2, catFinds: 4, minQuestions: 3 },
};

/** The spec of a level in a house: the stock level plus the house's overrides (the manor has none: the stock object itself). */
export function nosingSpec(house: House, level: NosingLevel): NosingLevelSpec {
  const o = house.nosing;
  if (!o) return NOSING_LEVELS[level];
  return { ...NOSING_LEVELS[level], ...o.all, ...o[level] };
}

export type SquareKind = 'plain' | 'ladder' | 'snake' | 'obstacle' | 'search' | 'speed' | 'catFind';

export interface Square {
  kind: SquareKind;
  /** Ladder and snake: the path index the cat ends on. */
  to?: number;
  /** Ladder and snake: the id of the content item. */
  contentId?: string;
  /** Search: which clue this finds (in path order), or null when it gives a bonus. */
  clueIndex?: number | null;
  /** Obstacle, cat find and bonus search: the bonus on offer. */
  bonus?: BonusKind;
}

export interface NosingBoard {
  n: number;
  /** Squares across and down. */
  width: number;
  height: number;
  /** Square indices (row * width + col), in path order. */
  path: number[];
  /** The room of each path index. */
  roomOf: string[];
  /** The square kind of each path index. */
  squares: Square[];
  /** Rooms whose search square holds a search clue, in path order, plus the lock room (the last square's room) even when it holds none. */
  clueRooms: string[];
  /** Which attempt (seed text `${seed}-${attempt}`) built it. */
  attempt: number;
}

export interface NosingBoardOptions {
  house: House;
  level: NosingLevel;
  seed: string;
  sceneRoom: string;
  /** How many search squares hold a clue (the rest give bonuses); 0 is allowed. */
  searchClues: number;
  ladders: readonly JumpContent[];
  snakes: readonly JumpContent[];
}

export const NOSING_ATTEMPTS = 600;
const DFS_BUDGET = 3000;

interface Grid {
  width: number;
  height: number;
  room: string[];
  /** The index of each square's room among the rooms (-1 for a void square), and how many rooms there are. */
  roomNo: number[];
  roomTotal: number;
  /** The squares each square can step to; never changed after the grid is built. */
  adj: number[][];
}

function gridFor(house: House, n: number): Grid {
  const width = house.cols * n;
  const height = house.rows * n;
  const owner = new Map<string, string>();
  for (const r of house.rooms) for (const [y, x] of r.cells) owner.set(`${y},${x}`, r.id);
  const room: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) room.push(owner.get(`${Math.floor(y / n)},${Math.floor(x / n)}`) ?? '');
  }
  // Only a house with doors limits where the path may cross from room to room (without doors, touching rooms are open).
  const touching = house.doors ? roomAdjacency(house) : null;
  const nb = (s: number): number[] => {
    const y = Math.floor(s / width);
    const x = s % width;
    const out: number[] = [];
    if (y > 0) out.push(s - width);
    if (y < height - 1) out.push(s + width);
    if (x > 0) out.push(s - 1);
    if (x < width - 1) out.push(s + 1);
    // Squares of a void cell (no room owns it) are walls; so is a wall between rooms with no door.
    return out.filter((t) => room[t] !== '' && (room[t] === room[s] || !touching || touching.get(room[s])?.has(room[t])));
  };
  const adj = room.map((_, s) => nb(s));
  const ids = [...new Set(room.filter((r) => r !== ''))];
  const roomNo = room.map((r) => ids.indexOf(r));
  return { width, height, room, roomNo, roomTotal: ids.length, adj };
}

/** Room-by-room randomised DFS: fill the current room, then move to a room not yet entered. */
function windingPath(lv: NosingLevelSpec, grid: Grid, rng: Rng, searchClues: number): number[] | null {
  const { width, height, room, roomNo, adj, roomTotal: allRooms } = grid;
  const target = lv.len[0] + rng.int(lv.len[1] - lv.len[0] + 1);
  const roomCount = lv.enterExtra === undefined ? allRooms : Math.min(allRooms, searchClues + lv.enterExtra, lv.enterMax ?? allRooms);
  /** Squares at the end of the path that are in the last room. */
  const endRun = (): number => {
    const last = room[path[path.length - 1]];
    let k = 0;
    while (k < path.length && room[path[path.length - 1 - k]] === last) k++;
    return k;
  };
  const edge: number[] = [];
  for (let s = 0; s < width * height; s++) if (room[s] !== '' && adj[s].length < 4) edge.push(s);
  const start = rng.pick(edge);
  const path: number[] = [start];
  const used = new Uint8Array(width * height);
  used[start] = 1;
  // Times each room was entered (re-entries count), and how many rooms have been entered at all.
  const entered = new Int16Array(roomNo.length === 0 ? 0 : Math.max(...roomNo) + 1);
  entered[roomNo[start]] = 1;
  let distinct = 1;
  let budget = DFS_BUDGET;
  const free = (s: number) => {
    let k = 0;
    for (const t of adj[s]) if (!used[t]) k++;
    return k;
  };
  const dfs = (): boolean => {
    if (--budget < 0) return false;
    const cur = path[path.length - 1];
    if (path.length >= target && distinct >= roomCount && (lv.minEndRoom === undefined || endRun() >= lv.minEndRoom)) return true;
    if (path.length >= lv.len[1]) return false;
    const here = roomNo[cur];
    const opts: number[] = [];
    for (const t of adj[cur]) if (!used[t]) opts.push(t);
    // Same draws as `rng.shuffle(opts)`.
    for (let i = opts.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    // Rank each option once, then a stable insertion sort: stay in the room (fewest onward moves first), then a new room, then back into an old room.
    const keys = opts.map((t) => {
      const r = roomNo[t];
      return (r === here ? 0 : entered[r] === 0 ? 1 : 2) + free(t) / 10;
    });
    for (let i = 1; i < opts.length; i++) {
      for (let j = i; j > 0 && keys[j - 1] > keys[j]; j--) {
        [opts[j - 1], opts[j]] = [opts[j], opts[j - 1]];
        [keys[j - 1], keys[j]] = [keys[j], keys[j - 1]];
      }
    }
    for (const t of opts) {
      used[t] = 1;
      path.push(t);
      const pushed = roomNo[t] !== here;
      if (pushed && entered[roomNo[t]]++ === 0) distinct++;
      if (dfs()) return true;
      if (pushed && --entered[roomNo[t]] === 0) distinct--;
      path.pop();
      used[t] = 0;
    }
    return false;
  };
  return dfs() ? path : null;
}

interface Jump {
  from: number;
  to: number;
  kind: 'ladder' | 'snake';
  contentId: string;
}

function allowedIn(c: JumpContent, room: string): boolean {
  return c.rooms === 'any' || c.rooms.includes(room);
}

function placeJumps(
  lv: NosingLevelSpec,
  len: number,
  roomAt: (i: number) => string,
  ladders: readonly JumpContent[],
  snakes: readonly JumpContent[],
  rng: Rng,
): Jump[] | null {
  const jumps: Jump[] = [];
  const taken = new Set<number>();
  const usedIds = new Set<string>();
  const tryPlace = (kind: 'ladder' | 'snake', [lo, hi]: readonly [number, number], pool: readonly JumpContent[]) => {
    for (let a = 0; a < 50; a++) {
      const d = lo + rng.int(hi - lo + 1);
      const from = 2 + rng.int(len - 4);
      const to = kind === 'ladder' ? from + d : from - d;
      if (to < 1 || to > len - 2) continue;
      if (taken.has(from) || taken.has(to)) continue;
      const fits = pool.filter((c) => allowedIn(c, roomAt(from)));
      if (fits.length === 0) continue;
      const fresh = fits.filter((c) => !usedIds.has(`${kind}:${c.id}`));
      if (fresh.length === 0 && a < 35) continue; // look for a spot with unused content first
      const content = rng.pick(fresh.length ? fresh : fits);
      usedIds.add(`${kind}:${content.id}`);
      taken.add(from);
      taken.add(to);
      jumps.push({ from, to, kind, contentId: content.id });
      return true;
    }
    return false;
  };
  for (let i = 0; i < lv.ladders; i++) if (!tryPlace('ladder', lv.ladderGain, ladders)) return null;
  for (let i = 0; i < lv.snakes; i++) if (!tryPlace('snake', lv.snakeDrop, snakes)) return null;
  return jumps;
}

/** The result of one attempt, before the exact bounds check. */
function lay(
  lv: NosingLevelSpec,
  path: number[],
  roomOf: string[],
  jumps: Jump[],
  searchClues: number,
  sceneRoom: string,
  rng: Rng,
): { squares: Square[]; clueRooms: string[] } | null {
  const len = path.length;
  const lockRoom = roomOf[len - 1];
  if (lockRoom === sceneRoom) return null;
  const squares: Square[] = path.map(() => ({ kind: 'plain' }));
  const landing = new Set(jumps.map((j) => j.to));
  const q = new Set<number>(jumps.map((j) => j.from));
  for (const j of jumps) squares[j.from] = { kind: j.kind, to: j.to, contentId: j.contentId };
  const blocked = (i: number) => i === 0 || i === len - 1 || q.has(i) || landing.has(i);

  // Clue rooms: the lock's room plus the first others entered, never the scene room.
  const order: string[] = [];
  for (const r of roomOf) if (!order.includes(r)) order.push(r);
  const candidates = order.filter((r) => r !== sceneRoom && r !== lockRoom);
  // With no search clues (a picked game holding 1 clue) every search square gives a bonus, but the lock room is still a clue room.
  const want = Math.min(searchClues, candidates.length + 1);
  const chosen = new Set<string>(want > 0 ? [lockRoom, ...candidates.slice(0, want - 1)] : []);
  const clueRooms = order.filter((r) => chosen.has(r) || r === lockRoom);

  // One search square per room.
  const searchAt: number[] = [];
  for (const r of order) {
    const spots = path.map((_, i) => i).filter((i) => roomOf[i] === r && !blocked(i));
    if (!spots.length) return null;
    const i = rng.pick(spots);
    q.add(i);
    searchAt.push(i);
  }
  const clueSquares = searchAt.filter((i) => chosen.has(roomOf[i])).sort((a, b) => a - b);
  for (const i of searchAt) {
    const idx = clueSquares.indexOf(i);
    squares[i] = idx >= 0 ? { kind: 'search', clueIndex: idx } : { kind: 'search', clueIndex: null, bonus: rng.pick(BONUS_KINDS) };
  }

  // Obstacles and speed rounds, then cat finds, on plain squares.
  const plain = rng.shuffle(path.map((_, i) => i).filter((i) => !blocked(i)));
  const needQ = lv.obstacles + lv.speed;
  if (plain.length < needQ + lv.catFinds) return null;
  plain.slice(0, lv.speed).forEach((i) => (squares[i] = { kind: 'speed' }));
  plain.slice(lv.speed, needQ).forEach((i) => (squares[i] = { kind: 'obstacle', bonus: rng.pick(BONUS_KINDS) }));
  plain.slice(needQ, needQ + lv.catFinds).forEach((i) => (squares[i] = { kind: 'catFind', bonus: rng.pick(BONUS_KINDS) }));
  return { squares, clueRooms };
}

/**
 * The seed text the rolls of a board come from: the board seed plus the attempt
 * that built it, so each attempt is checked against its own rolls. Play with
 * `rollFor(nosingRollSeed(seed, board.attempt), level, turn)`.
 */
export function nosingRollSeed(seed: string, attempt: number): string {
  return `${seed}-${attempt}`;
}

/** The dice roll for a turn (turns count from 1). Same seed and turn, same roll. */
export function rollFor(seed: string, spec: NosingLevelSpec, turn: number): number {
  return diceSum(`${seed}-roll-${turn}`, spec.dice);
}

/** The replacement roll if she uses a re-roll on this turn. */
export function rerollFor(seed: string, spec: NosingLevelSpec, turn: number): number {
  return diceSum(`${seed}-reroll-${turn}`, spec.dice);
}

function diceSum(text: string, dice: number): number {
  const r = new Rng(hashSeed(text));
  let s = 0;
  for (let d = 0; d < dice; d++) s += 1 + r.int(6);
  return s;
}

export interface NosingBounds {
  minTurns: number;
  maxTurns: number;
  /** The fewest question squares she lands on, whatever she answers. */
  minQuestions: number;
}

/** Squares the `steps` bonus carries the cat. */
export const STEPS_BONUS = 3;

/** Where the `steps` bonus puts the cat (no square is triggered there). */
export const stepsFrom = (pos: number, len: number): number => Math.min(pos + STEPS_BONUS, len - 1);

/** Squares a wrong answer on a plain obstacle sends the cat back. */
export const OBSTACLE_BACK = 2;

/** Where a wrong obstacle answer leaves the cat (not below the first square; no square is triggered there). */
export const obstacleBack = (pos: number): number => Math.max(pos - OBSTACLE_BACK, 0);

/**
 * Where the cat stands after answering a ladder, snake, obstacle or search
 * square: a right ladder climbs, a wrong snake slips, a right `steps` prize
 * moves it on. Shared by the run and the exact bounds so they cannot drift.
 */
export function answerDestination(sq: Square, pos: number, right: boolean, len: number): number {
  if (sq.kind === 'ladder') return right ? sq.to! : pos;
  if (sq.kind === 'snake') return right ? pos : sq.to!;
  if (right && sq.bonus === 'steps') return stepsFrom(pos, len);
  return pos;
}

/** The bonuses a speed square pays for `count` bonus draws, drawn from the seed. */
export function speedBonusDraw(seed: string, pos: number, count: number): BonusKind[] {
  const rng = new Rng(hashSeed(`${seed}-speed-bonus-${pos}`));
  return Array.from({ length: count }, () => rng.pick(BONUS_KINDS));
}

/** The cat's position after each reachable speed reward tier (nothing, 1, 2, 2 plus steps). */
function speedTierPositions(seed: string, pos: number, len: number): number[] {
  const draw = speedBonusDraw(seed, pos, 2);
  const after = (count: number, extra: boolean): number => {
    let p = pos;
    for (const k of draw.slice(0, count)) if (k === 'steps') p = stepsFrom(p, len);
    return extra ? stepsFrom(p, len) : p;
  };
  return [...new Set([after(0, false), after(1, false), after(2, false), after(2, true)])];
}

/**
 * Exact bounds over every mix of right and wrong answers, with rolls fixed by
 * seed and turn. Models what moves the cat: ladders, snakes and the `steps`
 * bonus (from obstacles, bonus searches, cat finds and speed rounds, each
 * spent after use). Other bonuses only shorten a run, and re-rolls are her
 * choice, so they are left out.
 */
/** The snake head the dog waits on: one of the board's snakes, picked from the seed. */
export function pickDogSquare(board: NosingBoard, seed: string): number {
  const heads = board.squares.flatMap((sq, i) => (sq.kind === 'snake' ? [i] : []));
  return new Rng(hashSeed(`${seed}-dog`)).pick(heads);
}

export function nosingBounds(board: NosingBoard, seed: string, spec: NosingLevelSpec): NosingBounds {
  const len = board.path.length;
  const rollSeed = nosingRollSeed(seed, board.attempt);
  const rolls: number[] = [0];
  const roll = (t: number) => {
    while (rolls.length <= t) rolls.push(rollFor(rollSeed, spec, rolls.length));
    return rolls[t];
  };
  // One mask bit per snake and per square whose "spent" state can matter.
  const bit = new Map<number, number>();
  const speedAt = new Map<number, number[]>();
  board.squares.forEach((s, i) => {
    const matters =
      s.kind === 'snake' || s.kind === 'speed' || ((s.kind === 'obstacle' || s.kind === 'search' || s.kind === 'catFind') && s.bonus === 'steps');
    if (matters) bit.set(i, 2 ** bit.size);
    if (s.kind === 'speed') speedAt.set(i, speedTierPositions(seed, i, len));
  });
  const has = (mask: number, b: number) => Math.floor(mask / b) % 2 === 1;
  const isQuestion = (k: SquareKind) => k !== 'plain' && k !== 'catFind';
  // The dog stops the cat as it passes: any move onto or past the dog's square (while the dog is
  // there) halts on it. A win carries on to where the move was going; a loss slides down the dog's
  // snake. Either way the dog is gone (its square's bit is set). A fight takes no turn.
  const dogAt = pickDogSquare(board, seed);
  const dBit = bit.get(dogAt)!;
  const slide = board.squares[dogAt].to!;
  /** [position, mask, questions asked on the way (the dog)]. */
  type Next = [number, number, number];
  const move = (from: number, to: number, mask: number): Next[] =>
    !has(mask, dBit) && from < dogAt && to >= dogAt ? [[to, mask + dBit, 1], [slide, mask + dBit, 1]] : [[to, mask, 0]];
  /** What happens on landing at `p`: the places the cat may go on to, and whether it is asked a question. */
  const landing = (p: number, mask: number): { next: Next[]; asks: boolean } => {
    if (p === len - 1) return { next: [[p, mask, 0]], asks: false };
    const sq = board.squares[p];
    const b = bit.get(p);
    const spent = b !== undefined && has(mask, b) && sq.kind !== 'snake';
    const asks = isQuestion(sq.kind) && !spent && !(sq.kind === 'snake' && has(mask, b!));
    const next: Next[] = [];
    if (sq.kind === 'ladder') next.push(...move(p, answerDestination(sq, p, true, len), mask), [p, mask, 0]);
    else if (sq.kind === 'snake') {
      next.push([p, mask, 0]);
      if (!has(mask, b!)) next.push([sq.to!, mask + b!, 0]);
    } else if (spent) next.push([p, mask, 0]);
    else if (sq.kind === 'catFind') {
      if (sq.bonus === 'steps') next.push(...move(p, stepsFrom(p, len), mask + b!));
      else next.push([p, mask, 0]);
    } else if (sq.kind === 'speed') for (const np of speedAt.get(p)!) next.push(...move(p, np, mask + b!));
    else {
      // obstacle: wrong sends the cat back (it stays open). Right may pay `steps` and spends it.
      next.push([p, mask, 0]); // (a right answer with no `steps` prize leaves the cat here too)
      if (sq.kind === 'obstacle') next.push([obstacleBack(p), mask, 0]);
      if (sq.bonus === 'steps') next.push(...move(p, answerDestination(sq, p, true, len), mask + b!));
    }
    return { next, asks };
  };
  const memo = new Map<string, [number, number, number]>();
  const go = (t: number, pos: number, mask: number): [number, number, number] => {
    const key = `${t},${pos},${mask}`;
    const hit = memo.get(key);
    if (hit) return hit;
    const p = Math.min(pos + roll(t), len - 1);
    const branches: { next: Next[]; asks: boolean; extra: number }[] = [];
    if (!has(mask, dBit) && pos < dogAt && p >= dogAt) {
      const m2 = mask + dBit;
      const won = landing(p, m2);
      branches.push({ ...won, extra: 1 }, { next: [[slide, m2, 0]], asks: false, extra: 1 });
    } else branches.push({ ...landing(p, mask), extra: 0 });
    const tuples = branches.map((br): [number, number, number] => {
      const subs = br.next.map(([np, nm, ex]): [number, number, number] => {
        const r: [number, number, number] = np === len - 1 ? [t, t, 0] : go(t + 1, np, nm);
        return [r[0], r[1], r[2] + ex];
      });
      return [Math.min(...subs.map((x) => x[0])), Math.max(...subs.map((x) => x[1])), br.extra + (br.asks ? 1 : 0) + Math.min(...subs.map((x) => x[2]))];
    });
    const out: [number, number, number] = [Math.min(...tuples.map((x) => x[0])), Math.max(...tuples.map((x) => x[1])), Math.min(...tuples.map((x) => x[2]))];
    memo.set(key, out);
    return out;
  };
  const [minTurns, maxTurns, minQuestions] = go(1, 0, 0);
  return { minTurns, maxTurns, minQuestions };
}

export function buildNosingBoard(opts: NosingBoardOptions): NosingBoard {
  const { house, level, seed, sceneRoom, searchClues, ladders, snakes } = opts;
  const lv = nosingSpec(house, level);
  const grid = gridFor(house, lv.n);
  for (let attempt = 0; attempt < NOSING_ATTEMPTS; attempt++) {
    const rng = new Rng(hashSeed(nosingRollSeed(seed, attempt)));
    const path = windingPath(lv, grid, rng, searchClues);
    if (!path) continue;
    const roomOf = path.map((s) => grid.room[s]);
    const jumps = placeJumps(lv, path.length, (i) => roomOf[i], ladders, snakes, rng);
    if (!jumps) continue;
    const laid = lay(lv, path, roomOf, jumps, searchClues, sceneRoom, rng);
    if (!laid) continue;
    const board: NosingBoard = {
      n: lv.n,
      width: grid.width,
      height: grid.height,
      path,
      roomOf,
      squares: laid.squares,
      clueRooms: laid.clueRooms,
      attempt,
    };
    const b = nosingBounds(board, seed, lv);
    if (b.minTurns < lv.turns[0] || b.maxTurns > lv.turns[1] || b.minQuestions < lv.minQuestions) continue;
    return board;
  }
  throw new Error(`No nosing board for ${seed} (${level}) after ${NOSING_ATTEMPTS} attempts`);
}
