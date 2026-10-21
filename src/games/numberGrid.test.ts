import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clear,
  clearAll,
  emptyFill,
  evaluateGrid,
  gridLines,
  gridText,
  gridValues,
  place,
  solveGrid,
  usedNumbers,
  usedOpCards,
  type GridFill,
  type Hand,
  type OpRef,
  type Slot,
} from './numberGrid.ts';

/** Free bracketing: can any pairing of the numbers (whole positive steps, 2 or more used) reach the target? */
function reachable(pool: number[], target: number, joined = false): boolean {
  if (joined && pool.includes(target)) return true;
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = Math.max(pool[i], pool[j]);
      const b = Math.min(pool[i], pool[j]);
      const results = [a + b, a * b];
      if (a > b) results.push(a - b);
      if (a % b === 0) results.push(a / b);
      const rest = pool.filter((_, k) => k !== i && k !== j);
      if (results.some((r) => reachable([...rest, r], target, true))) return true;
    }
  }
  return false;
}

const num = (row: 0 | 1 | 2, i: 0 | 1 | 2): Slot => ({ row, kind: 'num', i });
const op = (row: 0 | 1 | 2, i: 0 | 1): Slot => ({ row, kind: 'op', i });
const rowOp = (row: 1 | 2): Slot => ({ row, kind: 'rowOp' });

/** Fills a grid from [slot, card] pairs. */
function build(...cards: [Slot, number | OpRef][]): GridFill {
  return cards.reduce((fill, [slot, card]) => place(fill, slot, card), emptyFill());
}

const palette = (numbers: number[]): Hand => ({ numbers, ops: 'palette' });

test('precedence inside a row: 7 + 3 x 2 = 13', () => {
  const hand = palette([7, 3, 2]);
  const fill = build([num(0, 0), 0], [op(0, 0), '+'], [num(0, 1), 1], [op(0, 1), '*'], [num(0, 2), 2]);
  const ev = evaluateGrid(hand, fill);
  assert.equal(ev.rows[0].value, 13);
  assert.equal(ev.answer, 13);
  assert.equal(ev.numbersUsed, 3);
  assert.ok(ev.submittable);
  assert.deepEqual(ev.errors, []);
  assert.equal(gridText(hand, fill), '7 + 3 × 2 = 13');
});

test('subtraction after a product: 10 - 2 x 3 = 4, and 10 - 3 x 4 fails on the minus', () => {
  const hand = palette([10, 2, 3, 4]);
  const ok = build([num(0, 0), 0], [op(0, 0), '-'], [num(0, 1), 1], [op(0, 1), '*'], [num(0, 2), 2]);
  assert.equal(evaluateGrid(hand, ok).answer, 4);
  const bad = build([num(0, 0), 0], [op(0, 0), '-'], [num(0, 1), 2], [op(0, 1), '*'], [num(0, 2), 3]);
  const ev = evaluateGrid(hand, bad);
  assert.equal(ev.answer, null);
  assert.deepEqual(ev.errors, [op(0, 0)]);
});

test('the running total across rows: 25 x 4, + 7 x 3 - 1, x 2 gives 100, 120, 240', () => {
  const hand = palette([25, 4, 7, 3, 1, 2]);
  const fill = build(
    [num(0, 0), 0],
    [op(0, 0), '*'],
    [num(0, 1), 1],
    [rowOp(1), '+'],
    [num(1, 0), 2],
    [op(1, 0), '*'],
    [num(1, 1), 3],
    [op(1, 1), '-'],
    [num(1, 2), 4],
    [rowOp(2), '*'],
    [num(2, 0), 5],
  );
  const ev = evaluateGrid(hand, fill);
  assert.deepEqual(
    ev.rows.map((r) => [r.value, r.total]),
    [
      [100, 100],
      [20, 120],
      [2, 240],
    ],
  );
  assert.equal(ev.answer, 240);
  assert.equal(ev.numbersUsed, 6);
  assert.deepEqual(gridLines(hand, fill), ['25 × 4 = 100', '+ 7 × 3 − 1 = 20 → 120', '× 2 = 2 → 240']);
});

test('an inexact division is flagged on the right slot', () => {
  const hand = palette([7, 2, 4]);
  const row0 = build([num(0, 0), 0], [op(0, 0), '/'], [num(0, 1), 1]);
  const ev = evaluateGrid(hand, row0);
  assert.deepEqual(ev.errors, [op(0, 0)]);
  assert.equal(ev.answer, null);
  assert.ok(!ev.submittable);
  // second operator of a row
  const second = build([num(0, 0), 2], [op(0, 0), '+'], [num(0, 1), 0], [op(0, 1), '/'], [num(0, 2), 1]);
  assert.deepEqual(evaluateGrid(hand, second).errors, [op(0, 1)]);
  // on a row operator: 4 / ... total 4, row 7 -> 4 / 7 inexact
  const joined = build([num(0, 0), 2], [op(0, 0), '+'], [num(0, 1), 1], [rowOp(1), '/'], [num(1, 0), 0]);
  const ev2 = evaluateGrid(hand, joined);
  assert.deepEqual(ev2.errors, [rowOp(1)]);
  assert.equal(ev2.answer, null);
});

test('a result of 0 or less is flagged', () => {
  const hand = palette([4, 4, 3, 9]);
  const zero = build([num(0, 0), 0], [op(0, 0), '-'], [num(0, 1), 1]);
  assert.deepEqual(evaluateGrid(hand, zero).errors, [op(0, 0)]);
  const neg = build([num(0, 0), 2], [op(0, 0), '-'], [num(0, 1), 3]);
  assert.deepEqual(evaluateGrid(hand, neg).errors, [op(0, 0)]);
  const rowJoin = build([num(0, 0), 2], [op(0, 0), '+'], [num(0, 1), 0], [rowOp(1), '-'], [num(1, 0), 3]);
  const ev = evaluateGrid(hand, rowJoin);
  assert.deepEqual(ev.errors, [rowOp(1)]);
  assert.equal(ev.rows[1].total, null);
});

test('incomplete grids give null and no errors', () => {
  const hand = palette([5, 6, 7]);
  const cases: GridFill[] = [
    emptyFill(),
    build([num(0, 0), 0], [op(0, 0), '+']), // trailing op
    build([num(0, 1), 1]), // gap
    build([num(0, 0), 0], [num(0, 1), 1]), // two numbers, no op
    build([num(0, 0), 0], [op(0, 0), '+'], [num(0, 1), 1], [num(0, 2), 2]), // missing second op
    build([num(1, 0), 1], [rowOp(1), '+']), // used row below an empty row
    build([num(0, 0), 0], [num(1, 0), 1]), // row 1 without a row operator
    build([num(0, 0), 0], [rowOp(1), '+']), // row operator with no row
  ];
  for (const fill of cases) {
    const ev = evaluateGrid(hand, fill);
    assert.equal(ev.answer, null);
    assert.deepEqual(ev.errors, []);
    assert.ok(!ev.submittable);
  }
});

test('unused trailing rows and unplaced cards are fine; one number is not submittable', () => {
  const hand = palette([5, 6, 7]);
  const two = build([num(0, 0), 0], [op(0, 0), '+'], [num(0, 1), 1]);
  const ev = evaluateGrid(hand, two);
  assert.equal(ev.answer, 11);
  assert.ok(ev.submittable);
  assert.deepEqual(ev.rows.map((r) => r.used), [true, false, false]);
  const one = evaluateGrid(hand, build([num(0, 0), 2]));
  assert.equal(one.answer, 7);
  assert.equal(one.numbersUsed, 1);
  assert.ok(!one.submittable);
});

test('place and clear', () => {
  const a = place(emptyFill(), num(0, 0), 3);
  assert.deepEqual(usedNumbers(a), [3]);
  // a number card can't go in two slots
  assert.equal(place(a, num(0, 1), 3), a);
  // replacing a filled slot
  const b = place(a, num(0, 0), 4);
  assert.deepEqual(usedNumbers(b), [4]);
  // moving the same card within its own slot is allowed
  assert.deepEqual(usedNumbers(place(a, num(0, 0), 3)), [3]);
  // place is pure
  assert.deepEqual(usedNumbers(a), [3]);
  // palette operators repeat
  const ops = place(place(emptyFill(), op(0, 0), '+'), op(0, 1), '+');
  assert.equal(ops[0].ops[0], '+');
  assert.equal(ops[0].ops[1], '+');
  // operator cards can't, row operators included
  const c = place(place(emptyFill(), op(0, 0), 1), rowOp(1), 1);
  assert.deepEqual(usedOpCards(c), [1]);
  assert.deepEqual(usedOpCards(place(c, rowOp(2), 2)), [1, 2]);
  // a number index and an operator index are separate things
  assert.deepEqual(usedOpCards(place(a, op(0, 0), 3)), [3]);
  // row 0 has no row operator slot; number slots refuse operators
  assert.equal(place(a, { row: 0, kind: 'rowOp' }, '+'), a);
  assert.equal(place(a, num(1, 0), '+'), a);
  // clear
  assert.deepEqual(usedNumbers(clear(b, num(0, 0))), []);
  assert.deepEqual(usedNumbers(clearAll()), []);
});

function checkWays(hand: Hand, ways: ReturnType<typeof gridValues>): void {
  for (const [value, way] of ways) {
    const ev = evaluateGrid(hand, way.fill);
    assert.equal(ev.answer, value, `${gridText(hand, way.fill)}`);
    assert.deepEqual(ev.errors, []);
    assert.equal(ev.numbersUsed, way.numbersUsed);
    assert.equal(ev.rows.filter((r) => r.used).length, way.rows);
    assert.ok(ev.submittable);
    const nums = usedNumbers(way.fill);
    assert.equal(new Set(nums).size, nums.length);
    if (hand.ops !== 'palette') {
      const cards = usedOpCards(way.fill);
      assert.equal(new Set(cards).size, cards.length);
    }
  }
}

test('every solver value re-evaluates to itself (palette)', () => {
  for (const numbers of [[9, 4, 2], [2, 3, 4, 5, 6, 7], [25, 7, 3, 8]]) {
    const hand = palette(numbers);
    const ways = gridValues(hand);
    assert.ok(ways.size > 0);
    checkWays(hand, ways);
  }
});

test('known reachable targets and their text', () => {
  const hand = palette([9, 4, 2]);
  const way = solveGrid(hand, 38);
  assert.ok(way);
  assert.equal(way.numbersUsed, 3);
  assert.equal(gridText(hand, way.fill).split(' = ')[1], '38');
  assert.equal(solveGrid(hand, 36)?.numbersUsed, 2); // 9 x 4
  assert.equal(solveGrid(hand, 37), null);
});

test('targets that need brackets across the row shape are not reachable', () => {
  // 359 = free bracketing from 2..7, but the grid shape cannot make it.
  const numbers = [2, 3, 4, 5, 6, 7];
  assert.ok(reachable(numbers, 359), 'free bracketing reaches it');
  assert.equal(solveGrid(palette(numbers), 359), null);
  assert.equal(solveGrid(palette(numbers), 398), null);
});

test('one number alone is never a way', () => {
  assert.equal(gridValues(palette([5])).size, 0);
  assert.equal(solveGrid(palette([5, 6]), 5), null);
  assert.equal(solveGrid(palette([5, 6]), 11)?.numbersUsed, 2);
});

test('fewest numbers wins', () => {
  const hand = palette([2, 3, 4, 5, 6, 7]);
  const ways = gridValues(hand);
  let checked = 0;
  for (const [value, way] of ways) {
    if (way.numbersUsed === 2) continue;
    if (checked++ < 40) assert.equal(solveGrid(hand, value, way.numbersUsed - 1), null);
  }
  assert.ok(checked > 0);
  // 5 is 2 + 3 (two numbers) even though 7 - 2 style longer ways exist
  assert.equal(ways.get(5)?.numbersUsed, 2);
  // for equal numbers, fewer rows: 2 x 3 x 4 is one row
  assert.equal(ways.get(24)?.numbersUsed, 2); // 4 x 6
  assert.equal(solveGrid(palette([2, 3, 4]), 24)?.rows, 1);
});

test('maxNumbers caps the ways', () => {
  const hand = palette([2, 3, 4, 5, 6, 7]);
  const capped = gridValues(hand, 3);
  for (const way of capped.values()) assert.ok(way.numbersUsed <= 3);
  assert.equal(capped.get(4 * 5 + 6)?.numbersUsed, 3);
  assert.ok(gridValues(hand).size > capped.size);
});

test('operator cards are never used twice and 3 cards allow at most 4 numbers', () => {
  const hand: Hand = { numbers: [3, 5, 7, 2, 11, 4], ops: ['+', '*', '-'] };
  const ways = gridValues(hand);
  assert.ok(ways.size > 0);
  checkWays(hand, ways);
  let maxNumbers = 0;
  for (const way of ways.values()) {
    maxNumbers = Math.max(maxNumbers, way.numbersUsed);
    assert.ok(usedOpCards(way.fill).length <= 3);
  }
  assert.equal(maxNumbers, 4);
  // two plus cards: 3 + 5 + 7 needs both, a third plus is impossible
  const twoPlus: Hand = { numbers: [1, 2, 3, 4], ops: ['+', '+'] };
  const plusWays = gridValues(twoPlus);
  assert.equal(plusWays.get(9)?.numbersUsed, 3);
  assert.equal(plusWays.get(10), undefined);
  checkWays(twoPlus, plusWays);
  // a single card makes at most one join
  const one: Hand = { numbers: [4, 6, 9], ops: ['*'] };
  const oneWays = gridValues(one);
  assert.deepEqual([...oneWays.keys()].sort((a, b) => a - b), [24, 36, 54]);
});

test('the solver is deterministic', () => {
  for (const hand of [palette([25, 4, 7, 3, 1, 2]), { numbers: [3, 5, 7, 2, 11], ops: ['+', '*', '-'] } as Hand]) {
    const a = gridValues(hand);
    const b = gridValues(hand);
    assert.equal(JSON.stringify([...a]), JSON.stringify([...b]));
  }
});

test('solveGrid agrees with gridValues', () => {
  const hand = palette([25, 4, 7, 3, 1, 2]);
  const ways = gridValues(hand);
  assert.equal(JSON.stringify(solveGrid(hand, 240)), JSON.stringify(ways.get(240)));
  const way = solveGrid(hand, 240);
  assert.ok(way);
  assert.equal(evaluateGrid(hand, way.fill).answer, 240);
  assert.equal(solveGrid(hand, 1_000_000), null);
});

test('the six-number palette solver is quick', () => {
  const hand = palette([25, 75, 2, 5, 8, 3]);
  gridValues(hand); // warm up
  const start = performance.now();
  gridValues(hand);
  const ms = performance.now() - start;
  assert.ok(ms < 500, `took ${ms}ms`);
});
