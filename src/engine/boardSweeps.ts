// Random board plans and the per-board rule checks, shared by board.test.ts
// (12 fixed plans) and board.sweep.ts (many more). Each check takes one built
// board and throws (node:assert) on a broken rule.

import assert from 'node:assert/strict';
import { boardSolvable, buildBoard, countPackings } from './board.ts';
import { UNKNOWN, boardKey } from './boardTypes.ts';
import type { Board, BoardCell, BoardPlan, BoardPiecePlan } from './boardTypes.ts';
import { Rng } from './rng.ts';

export const ROOMS = ['hall', 'study', 'kitchen'];

/** A random plan: 3 rooms + Unknown, guests, weapons, touch and apart pairs, fog, grey and a body. */
export function makePlan(seed: number): BoardPlan {
  const rng = new Rng(seed * 7919 + 13);
  const pieces: BoardPiecePlan[] = [];
  const secs = [...ROOMS, UNKNOWN];
  const add = (p: Partial<BoardPiecePlan> & { id: string; kind: BoardPiecePlan['kind']; section: string }) => {
    const piece: BoardPiecePlan = { who: null, not: [], only: null, clue: null, ...p };
    pieces.push(piece);
    return piece;
  };
  const guests = ['ann', 'bob', 'cat', 'dan', 'eve'];
  const guestSection: Record<string, string> = {};
  for (const g of guests) guestSection[g] = rng.pick(secs);
  const count = 5 + rng.int(4);
  const mine: BoardPiecePlan[] = [];
  for (let i = 0; i < count; i++) {
    const g = guests[i % guests.length];
    const section = guestSection[g];
    const p = add({ id: `g${i}`, kind: 'guest', who: g, section, clue: `c${i}` });
    if (section !== UNKNOWN && rng.next() < 0.5) {
      const other = ROOMS.filter((r) => r !== section);
      p.not = [rng.pick(other)];
    }
    mine.push(p);
  }
  const weapons: BoardPiecePlan[] = [];
  for (let i = 0; i < 3; i++) weapons.push(add({ id: `w${i}`, kind: 'weapon', who: `weapon${i}`, section: rng.pick(secs) }));
  const touches: [string, string][] = [];
  const apart: [string, string][] = [];
  // A touch pair in Unknown and one in a room (when there are two guests' pieces there).
  const pairIn = (sec: string, kinds: BoardPiecePlan['kind'][]) => {
    const pool = pieces.filter((p) => p.section === sec && kinds.includes(p.kind) && !touches.some((t) => t.includes(p.id)));
    if (pool.length >= 2) touches.push([pool[0].id, pool[1].id]);
  };
  pairIn(UNKNOWN, ['guest']);
  pairIn(rng.pick(ROOMS), ['guest', 'weapon']);
  // An apart pair: two pieces in different rooms.
  const a = pieces.find((p) => p.section !== UNKNOWN);
  const b = pieces.find((p) => p.section !== UNKNOWN && p.section !== a?.section && p.who !== a?.who);
  if (a && b) apart.push([a.id, b.id]);
  for (let i = 0; i < rng.int(3); i++) add({ id: `grey${i}`, kind: 'grey', section: UNKNOWN });
  if (rng.next() < 0.7) add({ id: 'body', kind: 'body', section: rng.pick(ROOMS) });
  return { seed, rooms: ROOMS, pieces, touches, apart, fog: rng.int(5), neverPin: [mine[0].id, weapons[0].id] };
}

const nbrOf = ([r, c]: BoardCell): BoardCell[] => [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]];

/** Build a plan, timing it. */
export function buildTimed(plan: BoardPlan): { board: Board | null; ms: number } {
  const t = Date.now();
  const board = buildBoard(plan);
  return { board, ms: Date.now() - t };
}

/** Full rectangle; truth covers each square once, inside its section. */
export function checkRectangle(board: Board): void {
  assert.equal(board.W, 8);
  assert.ok(board.H <= 12);
  assert.equal(Object.keys(board.cells).length, board.W * board.H);
  for (let r = 0; r < board.H; r++) for (let c = 0; c < board.W; c++) assert.ok(board.cells[boardKey(r, c)] !== undefined);
  const seen = new Set<string>();
  for (const p of board.pieces) {
    const t: { section: string; cells: BoardCell[] } = board.truth[p.id];
    assert.equal(t.cells.length, p.shape.length);
    for (const [r, c] of t.cells) {
      const key = boardKey(r, c);
      assert.ok(!seen.has(key), 'square used twice');
      seen.add(key);
      assert.equal(board.cells[key], t.section);
    }
  }
  assert.equal(seen.size, board.W * board.H);
  assert.deepEqual(board.sections, [...ROOMS, UNKNOWN]);
}

/** The truth obeys every rule of the plan. */
export function checkTruthRules(plan: BoardPlan, board: Board): void {
  const sectionOf = (id: string) => board.truth[id].section;
  const owner = new Map<string, string>();
  for (const p of board.pieces) for (const [r, c] of board.truth[p.id].cells) owner.set(boardKey(r, c), p.id);
  for (const pp of plan.pieces) assert.equal(sectionOf(pp.id), pp.section);
  for (const p of board.pieces) {
    const s = sectionOf(p.id);
    if (p.kind === 'grey') assert.equal(s, UNKNOWN);
    if (p.kind === 'guest' || p.kind === 'weapon') {
      if (s !== UNKNOWN) {
        assert.ok(!p.marks.not.includes(s));
        assert.ok(p.marks.only === null || p.marks.only.includes(s));
      }
    }
    if (p.kind === 'guest') for (const q of board.pieces) if (q.kind === 'guest' && q.who === p.who) assert.equal(sectionOf(q.id), s);
  }
  for (const [a, b] of plan.touches) {
    assert.equal(sectionOf(a), sectionOf(b));
    const touching = board.truth[a].cells.some((c) => nbrOf(c).some(([r, cc]) => owner.get(boardKey(r, cc)) === b));
    assert.ok(touching, `${a} and ${b} do not touch`);
    const shared: string[] = board.pieces.find((p) => p.id === a)!.marks.sym.filter((s) => board.pieces.find((p) => p.id === b)!.marks.sym.includes(s));
    assert.equal(shared.length, 1);
  }
  for (const [a, b] of plan.apart) {
    assert.ok(sectionOf(a) !== sectionOf(b) || sectionOf(a) === UNKNOWN);
    const shared: string[] = board.pieces.find((p) => p.id === a)!.marks.anti.filter((s) => board.pieces.find((p) => p.id === b)!.marks.anti.includes(s));
    assert.equal(shared.length, 1);
  }
}

/** Exactly one packing. */
export function checkOnePacking(plan: BoardPlan, board: Board): void {
  assert.equal(countPackings(board, 3, board.pinned.hard), 1, `plan ${plan.seed}`);
}

/** boardSolvable: true for the truth, false for a wrong section or wrong squares. */
export function checkSolvable(board: Board): void {
  const t = Date.now();
  // Nothing fixed but body and fog.
  assert.equal(boardSolvable(board, {}), true);
  // Everything in place.
  const all: Record<string, BoardCell[]> = {};
  for (const p of board.pieces) all[p.id] = board.truth[p.id].cells;
  assert.equal(boardSolvable(board, all), true);
  // The easy pins.
  const pins: Record<string, BoardCell[]> = {};
  for (const id of board.pinned.easy) pins[id] = board.truth[id].cells;
  assert.equal(boardSolvable(board, pins), true);
  const hardPins: Record<string, BoardCell[]> = {};
  for (const id of board.pinned.hard) hardPins[id] = board.truth[id].cells;
  // Forcing the truth section holds; forcing an allowed wrong one fails.
  let wrongTried = 0;
  for (const p of board.pieces) {
    if (p.kind !== 'guest' && p.kind !== 'weapon') continue;
    const truthSec: string = board.truth[p.id].section;
    assert.equal(boardSolvable(board, hardPins, { [p.id]: truthSec }), true);
    for (const s of board.sections) {
      if (s === truthSec) continue;
      const allowed = s === UNKNOWN || (!p.marks.not.includes(s) && (p.marks.only === null || p.marks.only.includes(s)));
      if (!allowed) continue;
      assert.equal(boardSolvable(board, hardPins, { [p.id]: s }), false, `${p.id} forced to ${s}`);
      wrongTried++;
    }
  }
  assert.ok(wrongTried > 0);
  // A piece fixed at the wrong squares (swapped into another section's squares) fails.
  const g = board.pieces.find((p) => p.kind === 'weapon')!;
  const other = board.pieces.find((p) => p.id !== g.id && p.kind === 'guest' && board.truth[p.id].section !== board.truth[g.id].section)!;
  assert.equal(boardSolvable(board, { [g.id]: board.truth[other.id].cells }), false);
  assert.ok(Date.now() - t < 3000, 'boardSolvable too slow');
}

/** Pinned never holds neverPin, body or fog. */
export function checkPinned(plan: BoardPlan, board: Board): void {
  const bad = new Set([...plan.neverPin, ...board.pieces.filter((p) => p.kind === 'body' || p.kind === 'fog').map((p) => p.id)]);
  for (const level of ['easy', 'medium', 'hard'] as const) {
    for (const id of board.pinned[level]) assert.ok(!bad.has(id), `${id} pinned on ${level}`);
  }
  assert.ok(board.pinned.easy.length <= 6 + 4 && board.pinned.hard.length <= 2 + 4);
}

/** Every rule, for one built board (the sweep's per-seed check). */
export function checkBoard(plan: BoardPlan, board: Board): void {
  checkRectangle(board);
  checkTruthRules(plan, board);
  checkOnePacking(plan, board);
  checkSolvable(board);
  checkPinned(plan, board);
}
