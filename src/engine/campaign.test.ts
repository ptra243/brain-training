import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { BUDGET, ROUNDS, ROUND_PUZZLES, campaignCast, campaignRound, roundBudget, roundProblems, roundSuspects, type CampaignRef } from './campaign.ts';
import { codeFor } from './caseRef.ts';

const ref = (n: number, difficulty: CampaignRef['difficulty']): CampaignRef => ({ mode: 'campaign', code: codeFor(n * 104_729), difficulty });

test('a campaign has 7 guests, 5 rooms, 5 weapons and one killer, the same every time', () => {
  const r = ref(1, 'medium');
  const cast = campaignCast(content, r);
  assert.equal(cast.suspects.length, 7);
  assert.equal(cast.rooms.length, 5);
  assert.equal(cast.items.length, 5);
  assert.ok(cast.suspects.includes(cast.killer));
  assert.deepEqual(campaignCast(content, r), cast);
});

test('each round is fair down a path of wrong accusations, on every difficulty', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const r = ref(2, difficulty);
    const cast = campaignCast(content, r);
    let victims: string[] = [];
    for (let round = 0; round < ROUNDS; round++) {
      const c = campaignRound(content, r, victims);
      assert.equal(c.suspects.length, 7 - round);
      assert.equal(c.murderer, cast.killer, 'same killer every round');
      assert.ok(victims.every((v) => !c.suspects.includes(v)), 'the dead are gone');
      assert.deepEqual(c.campaign, { round, rounds: ROUNDS, budget: BUDGET[difficulty], last: round === ROUNDS - 1, victims });
      assert.deepEqual(roundProblems(c), [], `${difficulty} round ${round + 1}`);
      // A wrong accusation: someone her clues still allow, if there is one.
      const wrong = roundSuspects(c, c.clues.map((cl) => cl.fact)).find((s) => s !== cast.killer) ?? c.suspects.find((s) => s !== cast.killer)!;
      victims = [...victims, wrong];
    }
  }
});

test('the next round depends on who she wrongly accused', () => {
  const r = ref(3, 'easy');
  const cast = campaignCast(content, r);
  const [a, b] = cast.suspects.filter((s) => s !== cast.killer);
  const afterA = campaignRound(content, r, [a]);
  const afterB = campaignRound(content, r, [b]);
  assert.notEqual(afterA.seed, afterB.seed);
  assert.ok(!afterA.suspects.includes(a) && afterA.suspects.includes(b));
  assert.deepEqual(campaignRound(content, r, [a]), afterA, 'same victims, same round');
});

test('no round after the killer is caught or gets away', () => {
  const r = ref(4, 'easy');
  const cast = campaignCast(content, r);
  const innocent = cast.suspects.filter((s) => s !== cast.killer);
  assert.throws(() => campaignRound(content, r, [cast.killer]));
  assert.throws(() => campaignRound(content, r, innocent.slice(0, ROUNDS)));
});

test('fewer clues per puzzle: more puzzles of the right kinds, each holding at most that many clues', () => {
  for (const perPuzzle of [1, 2] as const) {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (const n of [4, 5]) {
        const r: CampaignRef = { ...ref(n, difficulty), perPuzzle };
        const c = campaignRound(content, r, []);
        const puzzles = c.games.filter((g) => !g.unlocksScene);
        assert.deepEqual(puzzles.map((g) => g.kind).sort(), [...ROUND_PUZZLES[perPuzzle]].sort(), `${perPuzzle} ${difficulty}`);
        for (const g of puzzles) assert.ok(g.clues.length >= 1 && g.clues.length <= perPuzzle, `${g.kind} holds ${g.clues.length}`);
        assert.equal(c.campaign!.budget, roundBudget(r));
        assert.deepEqual(roundProblems(c), [], `${perPuzzle} ${difficulty} ${n}`);
      }
    }
  }
});
