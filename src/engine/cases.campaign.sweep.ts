// Campaigns: every path of wrong accusations (quick: the first wrong accusation and the walked-free path), each round
// fair for any puzzles she picks. 1 campaign per difficulty and clues per puzzle (3 each with SWEEP_FULL=1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FULL, sweep } from '../sweep.ts';
import { stats, walkCampaign } from './caseChecks.ts';
import type { CampaignRef } from './campaign.ts';
import { codeFor } from './caseRef.ts';
import { DIFFICULTIES } from './settings.ts';

const PER_DIFFICULTY = FULL ? 3 : 1;
let campaigns = 0;
let rounds = 0;
const started = performance.now();

for (const perPuzzle of [3, 2, 1] as const) {
  for (const difficulty of DIFFICULTIES) {
    sweep(`campaigns, ${difficulty}, ${perPuzzle} clues per puzzle`, Array.from({ length: PER_DIFFICULTY }, (_, i) => i + 1), (i) => {
      campaigns++;
      const ref: CampaignRef = { mode: 'campaign', code: codeFor(i * 2_654_435), difficulty, ...(perPuzzle !== 3 && { perPuzzle }) };
      const r = walkCampaign(ref, `campaign ${ref.code}-${difficulty}`, FULL);
      rounds += r.rounds;
      assert.deepEqual(r.problems, []);
    });
  }
}

test('summary', (t) => {
  t.diagnostic(`${campaigns} campaigns (1, 2 and 3 clues per puzzle), ${FULL ? 'every wrong-guess path' : 'one wrong-guess path each'}: ${rounds} rounds (${((performance.now() - started) / rounds).toFixed(0)} ms per round)`);
  t.diagnostic(`Cases counted toward the total (rounds): ${rounds}`);
  t.diagnostic(`Talk: ${stats.talk.guests} guests have a thread; ${stats.talk.short} still have a beat waiting for the solved case once every game is done`);
  t.diagnostic(`Case boards:${stats.boards.puzzles} puzzles and ${stats.boards.ends} end boards built (slowest ${stats.boards.slowest.toFixed(0)} ms)`);
});
