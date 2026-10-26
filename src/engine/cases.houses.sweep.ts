// Cases on the other houses: the same checks the manor's cases get (problems, puzzleProblems, campaign rounds), built
// through the *In variants on a sample of each layout's variants (every variant with SWEEP_FULL=1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eachVariant, sampledVariants } from '../content/houseSweeps.ts';
import { dogPlays } from '../games/nosingSweeps.ts';
import { FULL } from '../sweep.ts';
import { problems, stats, walkCampaign } from './caseChecks.ts';
import { houseCaseSweep, type HouseCaseCounts } from './houseCaseSweeps.ts';

let rounds = 0;
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
    campaign: (label, ref) => {
      const r = walkCampaign(ref, `house ${label}`, false);
      rounds += r.rounds;
      failed.push(...r.problems);
    },
  });
  assert.deepEqual(failed.slice(0, 10), [], `${failed.length} problems`);
});

test('nosing dog fallback is rare in these cases', () => {
  // The same 3% bound as cases.quick.sweep.ts, over the Play and picked cases that hold Nosing on these houses.
  assert.ok(dogPlays.fallbacks <= dogPlays.plays * 0.03, `the dog's fallback play fired ${dogPlays.fallbacks} of ${dogPlays.plays} times (over 3%)`);
});

test('summary', (t) => {
  t.diagnostic(`Nosing dog: ${dogPlays.plays} dog plays across the fights the hint bot won, ${dogPlays.fallbacks} fallbacks`);
  t.diagnostic(`Other houses (${sampledVariants(FULL).length} of ${eachVariant().length} variants): ${Object.entries(counts).map(([d, c]) => `${d} ${c.cases} cases on ${c.houses} houses`).join(', ')}; ${rounds} campaign rounds`);
  t.diagnostic(`Cases counted toward the total (rounds): ${rounds}`);
  t.diagnostic(`Talk: ${stats.talk.guests} guests have a thread; ${stats.talk.short} still have a beat waiting for the solved case once every game is done`);
  t.diagnostic(`Case boards:${stats.boards.puzzles} puzzles and ${stats.boards.ends} end boards built (slowest ${stats.boards.slowest.toFixed(0)} ms)`);
});
