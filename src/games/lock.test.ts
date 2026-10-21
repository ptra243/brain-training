import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LARGE_NUMBERS, buildLock, lockHand, lockHint, lockNote, lockWindow, wayCounts, wayPrefix, type Lock } from './lock.ts';
import { clearAll, evaluateGrid, solveGrid, usedNumbers, type GridFill } from './numberGrid.ts';
import type { Level } from './mentalMaths.ts';

const levels: Level[] = ['easy', 'medium', 'hard'];
const range = { easy: [20, 99], medium: [100, 299], hard: [300, 699] } as const;
const small = (numbers: number[]) => numbers.filter((n) => !LARGE_NUMBERS.includes(n) || n <= 10);

const count = (fill: GridFill) => usedNumbers(fill).length;

test('100 seeds per level meet the tier rules, confirmed by the solver', () => {
  for (const level of levels) {
    const [lo, hi] = range[level];
    for (let i = 0; i < 100; i++) {
      const lock = buildLock(`l${i}`, level);
      const hand = lockHand(lock);
      assert.equal(lock.numbers.length, 6);
      assert.ok(lock.target >= lo && lock.target <= hi, `${level} target ${lock.target}`);
      assert.ok(!lock.numbers.includes(lock.target));
      const large = lock.numbers.filter((n) => n > 10);
      assert.equal(large.length, level === 'easy' ? 0 : level === 'medium' ? 1 : 2);
      assert.ok(large.every((n) => LARGE_NUMBERS.includes(n)));
      assert.equal(small(lock.numbers).length, 6 - large.length);
      assert.ok(lock.numbers.every((n) => n >= 1 && (n <= 10 || LARGE_NUMBERS.includes(n))));
      // The stored way is a real, complete grid that makes the target.
      const ev = evaluateGrid(hand, lock.way);
      assert.equal(ev.answer, lock.target);
      assert.deepEqual(ev.errors, []);
      assert.ok(ev.submittable);
      assert.ok(ev.numbersUsed >= 2 && ev.numbersUsed <= 4);
      assert.equal(new Set(usedNumbers(lock.way)).size, ev.numbersUsed, 'each number once');
      // It is a shortest way, and the solver agrees the target is reachable.
      const best = solveGrid(hand, lock.target, 4);
      assert.ok(best, 'solver finds a way');
      assert.equal(best.numbersUsed, ev.numbersUsed, 'stored way is a shortest one');
      if (level === 'easy') assert.ok(best.numbersUsed <= 3, 'easy needs 3 numbers or fewer');
      if (level === 'hard') assert.ok(best.numbersUsed >= 4, 'hard needs 4 numbers or more');
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

test('window: target 347 with one bonus accepts 313 to 381', () => {
  assert.deepEqual(lockWindow(347, 1), [313, 381]);
  assert.deepEqual(lockWindow(347, 0), [347, 347]);
  assert.deepEqual(lockWindow(100, 2), [80, 120]);
  assert.deepEqual(lockWindow(100, 3), [70, 130]);
  assert.deepEqual(lockWindow(100, 7), [70, 130]); // capped at 30%
});

test('the note and the hint steps are prefixes of the way, and never the whole of it before step 2', () => {
  for (const level of levels) {
    for (let i = 0; i < 100; i++) {
      const lock = buildLock(`n${i}`, level);
      const [start, most, all] = wayCounts(lock.way);
      assert.equal(all, count(lock.way));
      assert.ok(start >= 1 && start < all, `${level} ${i}: start ${start} of ${all}`);
      assert.ok(most >= start && most < all, `${level} ${i}: most ${most} of ${all}`);
      assert.equal(count(lockNote(lock)), start);
      // The prefix keeps the way's own cards in their own slots.
      const note = lockNote(lock);
      lock.way.forEach((row, r) => {
        note[r].nums.forEach((n, k) => n !== null && assert.equal(n, row.nums[k]));
      });
      assert.deepEqual(wayPrefix(lock.way, all), lock.way);
      // A hint replaces her grid with the prefix for its step.
      const h0 = lockHint(lock, clearAll(), 0);
      assert.equal(h0.kind, 'fill');
      if (h0.kind === 'fill') assert.deepEqual(h0.fill, note);
      for (const step of [0, 1, 2]) {
        const h = lockHint(lock, clearAll(), step);
        if (h.kind === 'fill') assert.equal(count(h.fill), [start, most, all][step]);
      }
      // A number grid holding the answer is told to try it.
      assert.equal(lockHint(lock, lock.way, 0).kind, 'submit');
    }
  }
});

test('following hint step 2 from anywhere reaches the target', () => {
  for (const level of levels) {
    for (let i = 0; i < 100; i++) {
      const lock: Lock = buildLock(`h${i}`, level);
      let fill = clearAll();
      for (let step = 0; step < 4; step++) {
        const hint = lockHint(lock, fill, step);
        if (hint.kind === 'submit') break;
        fill = hint.fill;
      }
      const ev = evaluateGrid(lockHand(lock), fill);
      assert.ok(ev.submittable && ev.answer === lock.target, `${level} ${i} reached the target`);
    }
  }
});
