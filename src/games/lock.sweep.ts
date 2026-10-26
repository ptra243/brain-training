// Locks: tier rules (confirmed by the solver), the note and hint prefixes, and
// hints reaching the target. lock.test.ts keeps seeds 0-11 per level; this
// takes 12 more spread over the rest (quick) or all LOCK_SEEDS (SWEEP_FULL=1).
// This file is the template for the other *.sweep.ts files.

import { test } from 'node:test';
import { FULL, seedsOf, sweep } from '../sweep.ts';
import { LOCK_LEVELS, LOCK_SEEDS, lockHintSeed, lockPrefixSeed, lockTierSeed } from './lockSweeps.ts';

let checked = 0;
for (const level of LOCK_LEVELS) {
  const seeds = seedsOf(12, LOCK_SEEDS, 12);
  sweep(`lock tier rules, ${level}`, seeds, (i) => lockTierSeed(level, i));
  sweep(`lock prefixes, ${level}`, seeds, (i) => lockPrefixSeed(level, i));
  sweep(`lock hints, ${level}`, seeds, (i) => lockHintSeed(level, i));
  checked += seeds.length;
}

test('summary', (t) => {
  t.diagnostic(`Locks: ${checked} seeds checked for the tier rules, the hint prefixes and the hint path (${FULL ? LOCK_SEEDS : 12} per level)`);
});
