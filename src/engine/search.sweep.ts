// Fast search against the old exhaustive one on random small cases.
// search.test.ts keeps seeds 0-29; this takes 150 more spread over the rest
// (quick) or all 3000 (SWEEP_FULL=1).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seedsOf } from '../sweep.ts';
import { compareSearch, FACT_TYPES } from './searchSweeps.ts';

test('search vs oracle', (t) => {
  const r = compareSearch(seedsOf(30, 3000, 150));
  assert.deepEqual(r.mismatches.slice(0, 5), [], 'fast search disagrees with the old search');
  assert.ok(FACT_TYPES.every((ty) => (r.types.get(ty) ?? 0) > 0), 'some fact type never came up');
  t.diagnostic(`Search vs old search: ${r.instances} random cases, ${r.comparisons} counts agree (${r.none} no answer, ${r.one} one, ${r.many} several; fast ${(r.fastMs / 1000).toFixed(1)}s, old ${(r.oracleMs / 1000).toFixed(1)}s)`);
});
