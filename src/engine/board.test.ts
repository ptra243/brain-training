import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardSolvable, buildBoard, countPackings } from './board.ts';
import { UNKNOWN } from './boardTypes.ts';
import type { Board, BoardCell, BoardPlan, BoardPiecePlan } from './boardTypes.ts';
import { ROOMS, buildTimed, checkOnePacking, checkPinned, checkRectangle, checkSolvable, checkTruthRules, makePlan } from './boardSweeps.ts';

const PLANS = Array.from({ length: Number(process.env.N ?? 12) }, (_, i) => makePlan(i + 1));
const built = new Map<number, { board: Board | null; ms: number }>();
function get(plan: BoardPlan) {
  let b = built.get(plan.seed);
  if (!b) {
    b = buildTimed(plan);
    built.set(plan.seed, b);
  }
  return b;
}

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
    if (board) checkRectangle(board);
  }
});

test('truth obeys every rule', () => {
  for (const plan of PLANS) {
    const board = get(plan).board;
    if (board) checkTruthRules(plan, board);
  }
});

test('exactly one packing', () => {
  for (const plan of PLANS) {
    const board = get(plan).board;
    if (board) checkOnePacking(plan, board);
  }
});

test('boardSolvable: true for the truth, false for a wrong section', () => {
  for (const plan of PLANS) {
    const board = get(plan).board;
    if (board) checkSolvable(board);
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
    if (board) checkPinned(plan, board);
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
