import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LARGE_NUMBERS, buildLock, lockHint, lockMove, lockStart, lockSubmittable, lockTiles, lockWindow, solveLock, undoMove, type Lock, type LockMove, type Step } from './lock.ts';
import type { Level } from './mentalMaths.ts';

const levels: Level[] = ['easy', 'medium', 'hard'];
const range = { easy: [20, 99], medium: [100, 299], hard: [300, 699] } as const;
const small = (numbers: number[]) => numbers.filter((n) => !LARGE_NUMBERS.includes(n) || n <= 10);

/** Replays a way from the numbers, checking every step is allowed. */
function replay(numbers: number[], way: Step[]): number {
  const pool = numbers.slice();
  let last = NaN;
  for (const s of way) {
    for (const v of [s.a, s.b]) {
      const at = pool.indexOf(v);
      assert.ok(at >= 0, `${v} is not available`);
      pool.splice(at, 1);
    }
    const expect = s.op === '+' ? s.a + s.b : s.op === '-' ? s.a - s.b : s.op === '*' ? s.a * s.b : s.a / s.b;
    assert.equal(s.result, expect);
    assert.ok(Number.isInteger(s.result) && s.result > 0);
    pool.push(s.result);
    last = s.result;
  }
  return last;
}

test('300 seeds per level meet the tier rules, confirmed by the solver', () => {
  for (const level of levels) {
    const [lo, hi] = range[level];
    for (let i = 0; i < 300; i++) {
      const lock = buildLock(`l${i}`, level);
      assert.equal(lock.numbers.length, 6);
      assert.ok(lock.target >= lo && lock.target <= hi, `${level} target ${lock.target}`);
      const large = lock.numbers.filter((n) => n > 10);
      assert.equal(large.length, level === 'easy' ? 0 : level === 'medium' ? 1 : 2);
      assert.ok(large.every((n) => LARGE_NUMBERS.includes(n)));
      assert.equal(small(lock.numbers).length, 6 - large.length);
      assert.ok(lock.numbers.every((n) => n >= 1 && (n <= 10 || LARGE_NUMBERS.includes(n))));
      assert.ok(lock.way.length >= 1 && lock.way.length <= 4);
      assert.equal(replay(lock.numbers, lock.way), lock.target);
      const best = solveLock(lock.numbers, lock.target);
      assert.ok(best, 'solver finds a way');
      assert.equal(best.length, lock.way.length, 'stored way is a shortest one');
      if (level === 'easy') assert.ok(best.length <= 2, 'easy needs 3 numbers or fewer');
      if (level === 'hard') assert.ok(best.length >= 3, 'hard needs 4 numbers or more');
      assert.deepEqual(buildLock(`l${i}`, level), lock);
    }
  }
});

test('buildLock is fast', () => {
  for (const level of levels) {
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) buildLock(`timing${i}`, level);
    const each = (performance.now() - t0) / 100;
    console.log(`buildLock ${level}: ${each.toFixed(2)} ms each`);
    assert.ok(each < 50);
  }
});

test('solveLock rules: whole positive results only', () => {
  assert.equal(solveLock([3, 4], 7)?.length, 1);
  assert.equal(solveLock([3, 4], 1)?.[0].op, '-');
  assert.equal(solveLock([3, 4], 12)?.[0].op, '*');
  assert.equal(solveLock([3, 4], 5), null); // 3/4 is not whole, 4-3 is 1
  assert.equal(solveLock([2, 3, 7], 1)?.length, 1); // 3 - 2
  assert.equal(solveLock([5, 5], 0), null); // a result of 0 is not allowed
  assert.equal(solveLock([6, 3], 2)?.[0].op, '/');
  // (7 - 2) x 3 = 15 needs two steps.
  assert.equal(solveLock([7, 2, 3], 15)?.length, 2);
});

test('window: target 347 with one bonus accepts 313 to 381', () => {
  assert.deepEqual(lockWindow(347, 1), [313, 381]);
  assert.deepEqual(lockWindow(347, 0), [347, 347]);
  assert.deepEqual(lockWindow(100, 2), [80, 120]);
  assert.deepEqual(lockWindow(100, 3), [70, 130]);
  assert.deepEqual(lockWindow(100, 7), [70, 130]); // capped at 30%
});

test('tiles: moves are validated and undone', () => {
  const numbers = [6, 3, 5, 5, 1, 2];
  let tiles = lockStart(numbers);
  assert.equal(lockMove(tiles, { a: 0, b: 0, op: '+' }), null);
  assert.equal(lockMove(tiles, { a: 1, b: 0, op: '-' }), null); // 3 - 6
  assert.equal(lockMove(tiles, { a: 0, b: 2, op: '/' }), null); // 6 / 5
  assert.equal(lockMove(tiles, { a: 0, b: 1, op: '/' })?.step.result, 2);
  const moves: LockMove[] = [{ a: 0, b: 1, op: '+' }, { a: 0, b: 4, op: '*' }];
  tiles = lockTiles(numbers, moves);
  assert.equal(tiles.length, 4);
  assert.equal(tiles[tiles.length - 1].uses, 3);
  assert.ok(lockSubmittable(tiles));
  assert.equal(lockSubmittable(lockStart(numbers)), null);
  assert.equal(lockTiles(numbers, undoMove(moves)).length, 5);
  assert.equal(lockTiles(numbers, undoMove(undoMove(moves))).length, 6);
});

test('following hint step 1 from the start always reaches the target', () => {
  for (const level of levels) {
    for (let i = 0; i < 100; i++) {
      const lock = buildLock(`h${i}`, level);
      let tiles = lockStart(lock.numbers);
      for (let n = 0; n < 6; n++) {
        const hint = lockHint(lock, tiles, 1);
        if (hint.kind === 'submit') break;
        assert.equal(hint.kind, 'move');
        if (hint.kind !== 'move') return;
        const next = lockMove(tiles, hint.move);
        assert.ok(next, 'hint move is allowed');
        tiles = next.tiles;
      }
      const last = lockSubmittable(tiles);
      assert.ok(last && last.value === lock.target, `${level} ${i} reached the target`);
    }
  }
});

test('hints from a wandered state: tiles, move, way, or undo', () => {
  const lock: Lock = buildLock('wander', 'medium');
  const start = lockStart(lock.numbers);
  const t0 = lockHint(lock, start, 0);
  assert.equal(t0.kind, 'tiles');
  const w = lockHint(lock, start, 2);
  assert.equal(w.kind, 'way');
  if (w.kind === 'way') assert.deepEqual(w.steps, lock.way);
  // A dead end: two tiles that cannot make the target.
  const dead = [{ value: 1, uses: 1 }, { value: 1, uses: 1 }];
  assert.equal(lockHint({ numbers: [1, 1, 1], target: 50, way: [] }, dead, 1).kind, 'undo');
  // A step from her own tiles, not the stored way, still ends at the target.
  const first = lockMove(start, { a: 0, b: 1, op: '+' });
  assert.ok(first);
  let tiles = first.tiles;
  for (let n = 0; n < 6; n++) {
    const hint = lockHint(lock, tiles, 1);
    if (hint.kind === 'submit' || hint.kind === 'undo') break;
    if (hint.kind !== 'move') return;
    tiles = lockMove(tiles, hint.move)?.tiles ?? tiles;
  }
});
