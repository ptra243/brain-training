import assert from 'node:assert/strict';
import { house } from '../content/index.ts';
import { nosingLadders, nosingSnakes } from '../content/nosing.ts';
import { NOSING_LEVELS, buildNosingBoard, nosingBounds, type NosingBoard, type NosingLevel } from './nosingBoard.ts';

/** The sweep behind "nosing board: every rule holds": seed `i` of a level. `npm test` runs a few; check-cases a sample or all 300. */
export const BOARD_SEEDS = 300;
export const BOARD_LEVELS: NosingLevel[] = ['easy', 'medium', 'hard'];
const roomIds = house.rooms.map((r) => r.id);

const build = (level: NosingLevel, seed: string, sceneRoom: string, searchClues: number) =>
  buildNosingBoard({ house, level, seed, sceneRoom, searchClues, ladders: nosingLadders, snakes: nosingSnakes });

/** Checks one board against every rule; throws on the first broken one. Returns the build time in ms. */
export function boardSeed(level: NosingLevel, i: number): number {
  const lv = NOSING_LEVELS[level];
  const seed = `case-${i}-${level}`;
  const sceneRoom = roomIds[i % roomIds.length];
  const searchClues = i % 6;
  const t0 = performance.now();
  // Every seed and scene room must have a board within NOSING_ATTEMPTS (build throws if not).
  const b: NosingBoard = build(level, seed, sceneRoom, searchClues);
  const ms = performance.now() - t0;
  const ctx = `${seed} scene ${sceneRoom} clues ${searchClues}`;
  const len = b.path.length;

  // Path: in range, self-avoiding, orthogonally connected, in bounds.
  assert.ok(len >= lv.len[0] && len <= lv.len[1], `${ctx}: length ${len}`);
  assert.equal(new Set(b.path).size, len, `${ctx}: repeats a square`);
  assert.equal(b.width, house.cols * lv.n);
  assert.equal(b.height, house.rows * lv.n);
  for (const s of b.path) assert.ok(s >= 0 && s < b.width * b.height);
  for (let k = 1; k < len; k++) {
    const a = b.path[k - 1];
    const c = b.path[k];
    const dist = Math.abs(Math.floor(a / b.width) - Math.floor(c / b.width)) + Math.abs((a % b.width) - (c % b.width));
    assert.equal(dist, 1, `${ctx}: gap at ${k}`);
  }
  assert.equal(b.roomOf.length, len);
  assert.equal(b.squares.length, len);
  assert.deepEqual([...new Set(b.roomOf)].sort(), [...roomIds].sort(), `${ctx}: misses a room`);

  // Counts match the table.
  const count = (k: string) => b.squares.filter((s) => s.kind === k).length;
  assert.equal(count('ladder'), lv.ladders, ctx);
  assert.equal(count('snake'), lv.snakes, ctx);
  assert.equal(count('obstacle'), lv.obstacles, ctx);
  assert.equal(count('speed'), lv.speed, ctx);
  assert.equal(count('catFind'), lv.catFinds, ctx);
  assert.equal(count('search'), roomIds.length, ctx);

  // Jumps.
  const ends = new Set<number>();
  b.squares.forEach((s, k) => {
    if (s.kind !== 'ladder' && s.kind !== 'snake') return;
    const to = s.to!;
    assert.ok(to >= 1 && to <= len - 2 && to !== k, `${ctx}: bad end`);
    const d = s.kind === 'ladder' ? to - k : k - to;
    const [lo, hi] = s.kind === 'ladder' ? lv.ladderGain : lv.snakeDrop;
    assert.ok(d >= lo && d <= hi, `${ctx}: ${s.kind} spans ${d}`);
    assert.equal(b.squares[to].kind, 'plain', `${ctx}: end is not plain`);
    assert.ok(!ends.has(to), `${ctx}: shared end`);
    ends.add(to);
    const list = s.kind === 'ladder' ? nosingLadders : nosingSnakes;
    const c = list.find((x) => x.id === s.contentId);
    assert.ok(c, `${ctx}: unknown content`);
    assert.ok(c.rooms === 'any' || c.rooms.includes(b.roomOf[k]), `${ctx}: ${c.id} in ${b.roomOf[k]}`);
  });
  for (const kind of ['ladder', 'snake'] as const) {
    const ids = b.squares.filter((s) => s.kind === kind).map((s) => s.contentId);
    assert.equal(new Set(ids).size, ids.length, `${ctx}: ${kind} content repeats`);
  }
  assert.equal(b.squares[0].kind, 'plain');
  assert.equal(b.squares[len - 1].kind, 'plain');

  // Lock room and clue rooms.
  const lockRoom = b.roomOf[len - 1];
  assert.notEqual(lockRoom, sceneRoom, ctx);
  assert.ok(b.clueRooms.includes(lockRoom), `${ctx}: lock room not a clue room`);
  assert.ok(!b.clueRooms.includes(sceneRoom), ctx);
  assert.equal(b.clueRooms.length, Math.max(searchClues, 1), ctx);

  // Search squares: one per room, exactly searchClues hold clues.
  const searches = b.squares.map((s, k) => ({ s, k })).filter((x) => x.s.kind === 'search');
  assert.deepEqual(searches.map((x) => b.roomOf[x.k]).sort(), [...roomIds].sort(), `${ctx}: search per room`);
  const withClue = searches.filter((x) => x.s.clueIndex !== null);
  assert.equal(withClue.length, searchClues, ctx);
  assert.deepEqual(withClue.map((x) => x.s.clueIndex), withClue.map((_, j) => j), `${ctx}: clue order`);
  assert.deepEqual(withClue.map((x) => b.roomOf[x.k]).sort(), searchClues ? [...b.clueRooms].sort() : [], ctx);
  for (const x of searches) assert.equal(x.s.bonus !== undefined, x.s.clueIndex === null, ctx);
  for (const s of b.squares) if (s.kind === 'obstacle' || s.kind === 'catFind') assert.ok(s.bonus, ctx);

  // Bounds.
  const bd = nosingBounds(b, seed, level);
  assert.ok(bd.minTurns >= lv.turns[0] && bd.maxTurns <= lv.turns[1], `${ctx}: turns ${bd.minTurns}-${bd.maxTurns}`);
  assert.ok(bd.minQuestions >= lv.minQuestions, `${ctx}: questions ${bd.minQuestions}`);

  // Same seed, same board.
  if (i % 20 === 0) assert.deepEqual(build(level, seed, sceneRoom, searchClues), b, `${ctx}: not repeatable`);
  return ms;
}
