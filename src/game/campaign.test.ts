import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { ROUNDS, campaignCast, roundSuspects, type CampaignRef } from '../engine/campaign.ts';
import { codeFor } from '../engine/caseRef.ts';
import { canPlay, currentRound, newCampaign, pick, puzzlesLeft, roundCase, stillPossible, updateRound, type CampaignSave } from './campaign.ts';
import { reduce, type Action } from './state.ts';

const ref: CampaignRef = { mode: 'campaign', code: codeFor(31_337), difficulty: 'medium' };
const cast = campaignCast(content, ref);
const innocents = cast.suspects.filter((s) => s !== cast.killer);

/** Play an action in the current round and let the campaign react. */
function act(save: CampaignSave, action: Action) {
  const c = roundCase(content, save, currentRound(save));
  return updateRound(save, c, reduce(c, save.rounds[currentRound(save)], action));
}

test('a wrong person is the next body; the killer gets away after the last round', () => {
  let save = newCampaign(ref);
  for (let round = 0; round < ROUNDS; round++) {
    const c = roundCase(content, save, round);
    const { save: next, verdict } = act(save, { type: 'accuse', suspect: innocents[round], item: c.weapon });
    assert.equal(verdict, round < ROUNDS - 1 ? 'next-body' : 'escaped');
    assert.deepEqual(next.victims, innocents.slice(0, round + 1));
    save = next;
  }
  assert.equal(save.outcome, 'escaped');
  assert.equal(save.rounds.length, ROUNDS, 'no round after the last');
});

test('the right person with the wrong weapon ends the round: a seeded innocent non-decoy is the next body', () => {
  const save = newCampaign(ref);
  const c = roundCase(content, save, 0);
  const wrongWeapon = c.items.find((i) => i !== c.weapon)!;
  const { save: tried, verdict } = act(save, { type: 'accuse', suspect: c.murderer, item: wrongWeapon });
  assert.equal(verdict, 'wrong-weapon');
  assert.equal(tried.outcome, 'playing');
  assert.equal(tried.victims.length, 1);
  assert.equal(tried.rounds.length, 2, 'a new round starts');
  const body = tried.victims[0];
  assert.notEqual(body, cast.killer);
  assert.ok(c.suspects.includes(body));
  const possible = roundSuspects(c, c.clues.map((cl) => cl.fact));
  assert.ok(!possible.includes(body), 'never a decoy');
  assert.equal(act(save, { type: 'accuse', suspect: c.murderer, item: wrongWeapon }).save.victims[0], body, 'same body every time');
  // The round after it is the same one a wrong guess at that body would lead to.
  const next = roundCase(content, tried, 1);
  assert.equal(next.victim, body);
  assert.ok(!next.suspects.includes(body));
  const { save: done, verdict: caught } = act(tried, { type: 'accuse', suspect: next.murderer, item: next.weapon });
  assert.equal(caught, 'caught');
  assert.equal(done.outcome, 'caught');
});

test('wrong weapons use up the three accusations: the killer escapes', () => {
  let save = newCampaign(ref);
  for (let round = 0; round < ROUNDS; round++) {
    const c = roundCase(content, save, round);
    const wrongWeapon = c.items.find((i) => i !== c.weapon)!;
    const { save: next, verdict } = act(save, { type: 'accuse', suspect: c.murderer, item: wrongWeapon });
    assert.equal(verdict, round < ROUNDS - 1 ? 'wrong-weapon' : 'escaped');
    save = next;
  }
  assert.equal(save.outcome, 'escaped');
  assert.equal(new Set(save.victims).size, ROUNDS, 'three different bodies');
});

test('the budget: puzzles she picks count, word games are always free', () => {
  let save = newCampaign(ref);
  const c = roundCase(content, save, 0);
  const puzzles = c.games.filter((g) => !g.unlocksScene).map((g) => g.kind);
  assert.equal(puzzlesLeft(save, c), 2);
  save = pick(save, c, puzzles[0]);
  save = pick(save, c, puzzles[0]);
  assert.equal(puzzlesLeft(save, c), 1, 'picking the same one twice uses one');
  save = pick(save, c, puzzles[1]);
  assert.equal(puzzlesLeft(save, c), 0);
  assert.ok(canPlay(save, c, puzzles[1]));
  assert.ok(!canPlay(save, c, puzzles[2]));
  assert.equal(pick(save, c, puzzles[2]), save, "can't pick past the budget");
  assert.ok(canPlay(save, c, 'wordle'));
});

test('still possible: everyone alive until she knows the scene, then whoever her clues allow', () => {
  let save = newCampaign(ref);
  const c = roundCase(content, save, 0);
  assert.deepEqual(stillPossible(save, [c]), c.suspects);
  // Solve the word game and every puzzle: the round's clues leave 2 or 3, the killer among them.
  for (const g of c.games) save = act(save, { type: 'game-finish', kind: g.kind, status: 'revealed', data: null }).save;
  const left = stillPossible(save, [c]);
  assert.ok(left.includes(c.murderer));
  assert.ok(left.length >= 2 && left.length <= 3, `${left.length} left`);
});

test('the budget with a five-puzzle round (one clue a puzzle, medium: four of five)', () => {
  const wide: CampaignRef = { ...ref, perPuzzle: 1 };
  let save = newCampaign(wide);
  const c = roundCase(content, save, 0);
  const puzzles = c.games.filter((g) => !g.unlocksScene).map((g) => g.kind);
  assert.equal(puzzles.length, 5);
  assert.equal(c.campaign!.budget, 4);
  assert.equal(puzzlesLeft(save, c), 4);
  for (const k of puzzles.slice(0, 4)) save = pick(save, c, k);
  assert.equal(puzzlesLeft(save, c), 0);
  assert.ok(canPlay(save, c, puzzles[3]));
  assert.ok(!canPlay(save, c, puzzles[4]));
  assert.equal(pick(save, c, puzzles[4]), save);
});
