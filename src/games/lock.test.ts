import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLock, lockWindow } from './lock.ts';
import { LOCK_LEVELS, lockHintSeed, lockPrefixSeed, lockTierSeed } from './lockSweeps.ts';

// The sweeps over 100 seeds per level live in lockSweeps.ts and run in full in scripts/check-cases.ts.
const FEW = 12;
const levels = LOCK_LEVELS;

test('seeds per level meet the tier rules, confirmed by the solver', () => {
  for (const level of LOCK_LEVELS) for (let i = 0; i < FEW; i++) lockTierSeed(level, i);
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
  for (const level of LOCK_LEVELS) for (let i = 0; i < FEW; i++) lockPrefixSeed(level, i);
});

test('following hint step 2 from anywhere reaches the target', () => {
  for (const level of LOCK_LEVELS) for (let i = 0; i < FEW; i++) lockHintSeed(level, i);
});
