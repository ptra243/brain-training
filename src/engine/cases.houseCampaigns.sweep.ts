// Campaign rounds on the other houses: the same walk the manor's campaigns get (walkCampaign), on a sample of each
// layout's variants (every variant with SWEEP_FULL=1). Quick walks one path per house and difficulty, alternating the
// first wrong accusation and the walked-free path across the houses; full walks the first wrong accusation and the
// walked-free path from every round. The cases themselves are checked in cases.houses.sweep.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eachVariant, sampledVariants } from '../content/houseSweeps.ts';
import { FULL } from '../sweep.ts';
import { stats, walkCampaign } from './caseChecks.ts';
import { houseCaseSweep } from './houseCaseSweeps.ts';

let rounds = 0;
let walks = 0;

test('campaign rounds on the other houses', () => {
  const failed: string[] = [];
  let i = 0;
  houseCaseSweep({
    full: FULL,
    check() {}, // make is lazy: no cases get built here
    campaign: (label, ref) => {
      const r = walkCampaign(ref, `house ${label}`, FULL ? 'two' : i++ % 2 ? 'walked' : 'wrong');
      walks++;
      rounds += r.rounds;
      failed.push(...r.problems);
    },
  });
  assert.deepEqual(failed.slice(0, 10), [], `${failed.length} problems`);
});

test('summary', (t) => {
  t.diagnostic(`Other houses (${sampledVariants(FULL).length} of ${eachVariant().length} variants): ${walks} campaigns walked, ${rounds} rounds`);
  t.diagnostic(`Cases counted toward the total (rounds): ${rounds}`);
  t.diagnostic(`Talk: ${stats.talk.guests} guests have a thread; ${stats.talk.short} still have a beat waiting for the solved case once every game is done`);
  t.diagnostic(`Case boards:${stats.boards.puzzles} puzzles and ${stats.boards.ends} end boards built (slowest ${stats.boards.slowest.toFixed(0)} ms)`);
});
