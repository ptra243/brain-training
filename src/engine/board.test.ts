import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardSolvable, buildBoard, countPackings } from './board.ts';
import { UNKNOWN, boardKey } from './boardTypes.ts';
import type { Board, BoardCell, BoardPlan, BoardPiecePlan } from './boardTypes.ts';
import { Rng } from './rng.ts';

const ROOMS = ['hall', 'study', 'kitchen'];

/** A random plan: 3 rooms + Unknown, guests, weapons, touch and apart pairs, fog, grey and a body. */
function makePlan(seed: number): BoardPlan {
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

const PLANS = Array.from({ length: Number(process.env.N ?? 12) }, (_, i) => makePlan(i + 1));
const built = new Map<number, { board: Board | null; ms: number }>();
function get(plan: BoardPlan) {
  let b = built.get(plan.seed);
  if (!b) {
    const t = Date.now();
    const board = buildBoard(plan);
    b = { board, ms: Date.now() - t };
    built.set(plan.seed, b);
  }
  return b;
}
const nbrOf = ([r, c]: BoardCell): BoardCell[] => [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]];

test('build timing and success on random plans', () => {
  const times: number[] = [];
  let made = 0;
  for (const plan of PLANS) {
    const { board, ms } = get(plan);
    times.push(ms);
    if (board) made++;
  }
  times.sort((x, y) => x - y);
  console.log(`built ${made}/${PLANS.length}; median ${times[times.length >> 1]}ms, max ${times[times.length - 1]}ms`);
  assert.ok(made >= PLANS.length - 1, `only ${made} of ${PLANS.length} plans built`);
  assert.ok(times[times.length - 1] < 15000);
});

test('deterministic', () => {
  for (const plan of PLANS.slice(0, 3)) {
    const again = buildBoard(plan);
    assert.deepEqual(again, get(plan).board);
  }
});

test('full rectangle; truth covers each square once, inside its section', () => {
  for (const plan of PLANS) {
    const board = get(plan).board;
    if (!board) continue;
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
});

test('truth obeys every rule', () => {
  for (const plan of PLANS) {
    const board = get(plan).board;
    if (!board) continue;
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
});

test('exactly one packing', () => {
  for (const plan of PLANS) {
    const board = get(plan).board;
    if (!board) continue;
    assert.equal(countPackings(board, 3, board.pinned.hard), 1, `plan ${plan.seed}`);
  }
});

test('boardSolvable: true for the truth, false for a wrong section', () => {
  for (const plan of PLANS) {
    const board = get(plan).board;
    if (!board) continue;
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
});

test('boardSolvable is fast', () => {
  let worst = 0;
  for (const plan of PLANS) {
    const board = get(plan).board;
    if (!board) continue;
    const t = Date.now();
    boardSolvable(board, {});
    const some: Record<string, BoardCell[]> = {};
    for (const id of board.pinned.hard) some[id] = board.truth[id].cells;
    boardSolvable(board, some);
    worst = Math.max(worst, Date.now() - t);
  }
  console.log(`boardSolvable worst (two calls): ${worst}ms`);
  assert.ok(worst < 100, `${worst}ms`);
});

test('pinned never holds neverPin, body or fog', () => {
  for (const plan of PLANS) {
    const board = get(plan).board;
    if (!board) continue;
    const bad = new Set([...plan.neverPin, ...board.pieces.filter((p) => p.kind === 'body' || p.kind === 'fog').map((p) => p.id)]);
    for (const level of ['easy', 'medium', 'hard'] as const) {
      for (const id of board.pinned[level]) assert.ok(!bad.has(id), `${id} pinned on ${level}`);
    }
    assert.ok(board.pinned.easy.length <= 6 + 4 && board.pinned.hard.length <= 2 + 4);
  }
});

test('a plan that contradicts itself builds nothing', () => {
  const base = PLANS[0];
  const guest = base.pieces.find((p) => p.kind === 'guest')!;
  // A piece sitting where its own marks forbid.
  const notHere = { ...base, pieces: base.pieces.map((p) => (p === guest ? { ...p, section: ROOMS[0], not: [ROOMS[0]] } : p)) };
  assert.equal(buildBoard(notHere), null);
  // The same guest in two sections.
  const second = { id: 'extra', kind: 'guest' as const, who: guest.who, section: guest.section === UNKNOWN ? ROOMS[0] : UNKNOWN, not: [], only: null, clue: null };
  assert.equal(buildBoard({ ...base, pieces: [...base.pieces, second] }), null);
  // A touching pair in different sections.
  const a = base.pieces.find((p) => p.section === UNKNOWN && p.kind !== 'grey')!;
  const c = base.pieces.find((p) => p.section !== UNKNOWN && p.kind !== 'body')!;
  assert.equal(buildBoard({ ...base, touches: [[a.id, c.id]] }), null);
  // An apart pair in the same room.
  const rooms = base.pieces.filter((p) => p.section === ROOMS[0] || p.section === ROOMS[1] || p.section === ROOMS[2]);
  const pair = rooms.find((p) => rooms.some((q) => q !== p && q.section === p.section));
  if (pair) {
    const mate = rooms.find((q) => q !== pair && q.section === pair.section)!;
    assert.equal(buildBoard({ ...base, apart: [[pair.id, mate.id]] }), null);
  }
  // A grey piece outside Unknown; a board too tall.
  assert.equal(buildBoard({ ...base, pieces: [...base.pieces, { id: 'gx', kind: 'grey', who: null, section: ROOMS[0], not: [], only: null, clue: null }] }), null);
  const tall: BoardPiecePlan[] = Array.from({ length: 40 }, (_, i) => ({ id: `t${i}`, kind: 'guest' as const, who: `t${i}`, section: UNKNOWN, not: [], only: null, clue: null }));
  assert.equal(buildBoard({ ...base, pieces: tall, touches: [], apart: [], fog: 0 }), null);
});

test('real end-board plans (7 guests, medium logic) build fast and unique', async () => {
  const { content } = await import('../content/index.ts');
  const { generateCase } = await import('./generate.ts');
  const { endBoardPlan } = await import('./caseBoard.ts');
  const times: number[] = [];
  for (let n = 1; n <= 4; n++) {
    const c = generateCase(content, n, { suspects: 7, logic: 'medium', minigames: 'medium', length: 'normal' });
    const free = new Set(c.clues.filter((cl) => cl.delivery === 'given').map((cl) => cl.id));
    const plans = [endBoardPlan(content, c, free, false, 2), endBoardPlan(content, c, new Set(c.clues.map((cl) => cl.id)), true, 0)];
    for (const plan of plans) {
      const t = Date.now();
      const board = buildBoard(plan);
      times.push(Date.now() - t);
      assert.ok(board, `case ${n} did not build`);
      assert.equal(countPackings(board, 3, board.pinned.hard), 1);
      const pins: Record<string, BoardCell[]> = {};
      for (const id of board.pinned.easy) pins[id] = board.truth[id].cells;
      assert.equal(boardSolvable(board, pins), true);
    }
  }
  console.log(`real end boards: max ${Math.max(...times)}ms`);
  assert.ok(Math.max(...times) < 2000, `slowest ${Math.max(...times)}ms`);
});
