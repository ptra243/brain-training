// Campaign opening: every free clue delivered once, every guest met. The unit
// test keeps seeds 0-2; this takes 80 more spread over the rest (quick) or all 400 (SWEEP_FULL=1).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FULL, seedsOf, sweep } from '../sweep.ts';
import { movedRateOk, openingSeed, type OpeningStats } from './openingSweeps.ts';

const stats: OpeningStats = { cases: 0, moved: 0 };
sweep('opening', seedsOf(3, 400, FULL ? 400 : 80), (seed) => openingSeed(seed, stats));

test('summary', (t) => {
  assert.ok(movedRateOk(stats), `moved-body rate: ${stats.moved} of ${stats.cases} bodies moved`);
  t.diagnostic(`Opening: ${stats.cases} campaigns deliver every free clue once and meet every guest; ${stats.moved} bodies moved`);
});
