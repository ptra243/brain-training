// Cases on the other houses: the same checks the manor's cases get (problems, puzzleProblems), built through the *In
// variants on a sample of each layout's variants (every variant with SWEEP_FULL=1). The campaign rounds on these houses
// are walked in cases.houseCampaigns.sweep.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eachVariant, sampledVariants } from '../content/houseSweeps.ts';
import { FULL } from '../sweep.ts';
import { problems, stats } from './caseChecks.ts';
import { houseCaseSweep, type HouseCaseCounts } from './houseCaseSweeps.ts';

let counts: HouseCaseCounts = {};

test('cases on the other houses', () => {
  const failed: string[] = [];
  counts = houseCaseSweep({
    full: FULL,
    check(label, make) {
      try {
        for (const p of problems(make())) failed.push(`house ${label}: ${p}`);
      } catch (err) {
        failed.push(`house ${label}: ${(err as Error).message}`);
      }
    },
    campaign: () => {},
  });
  assert.deepEqual(failed.slice(0, 10), [], `${failed.length} problems`);
});

test('summary', (t) => {
  t.diagnostic(`Other houses (${sampledVariants(FULL).length} of ${eachVariant().length} variants): ${Object.entries(counts).map(([d, c]) => `${d} ${c.cases} cases on ${c.houses} houses`).join(', ')}`);
  t.diagnostic(`Talk: ${stats.talk.guests} guests have a thread; ${stats.talk.short} still have a beat waiting for the solved case once every game is done`);
  t.diagnostic(`Case boards:${stats.boards.puzzles} puzzles and ${stats.boards.ends} end boards built (slowest ${stats.boards.slowest.toFixed(0)} ms)`);
});
