import assert from 'node:assert/strict';
import { LARGE_NUMBERS, buildLock, lockHand, lockHint, lockNote, wayCounts, wayPrefix, type Lock } from './lock.ts';
import { clearAll, evaluateGrid, solveGrid, usedNumbers, type GridFill } from './numberGrid.ts';
import type { Level } from './mentalMaths.ts';

/** Per-seed lock checks. `npm test` runs a few fixed seeds; check-cases runs a sample (quick) or all 100 (--full). A failed assertion throws. */
export const LOCK_LEVELS: Level[] = ['easy', 'medium', 'hard'];
export const LOCK_SEEDS = 100;
const range = { easy: [20, 99], medium: [100, 299], hard: [300, 699] } as const;
const small = (numbers: number[]) => numbers.filter((n) => !LARGE_NUMBERS.includes(n) || n <= 10);
const count = (fill: GridFill) => usedNumbers(fill).length;

/** The tier rules, confirmed by the solver. */
export function lockTierSeed(level: Level, i: number): void {
  const [lo, hi] = range[level];
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

/** The note and the hint steps are prefixes of the way, and never the whole of it before step 2. */
export function lockPrefixSeed(level: Level, i: number): void {
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

/** Following hint step 2 from anywhere reaches the target. */
export function lockHintSeed(level: Level, i: number): void {
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
