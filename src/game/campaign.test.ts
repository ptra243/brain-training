import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { ROUNDS, campaignCast, type CampaignRef } from '../engine/campaign.ts';
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

test('the right person with the wrong weapon costs nothing; both right catches them', () => {
  const save = newCampaign(ref);
  const c = roundCase(content, save, 0);
  const wrongWeapon = c.items.find((i) => i !== c.weapon)!;
  const { save: tried, verdict } = act(save, { type: 'accuse', suspect: c.murderer, item: wrongWeapon });
  assert.equal(verdict, 'wrong-weapon');
  assert.equal(tried.victims.length, 0);
  assert.equal(tried.outcome, 'playing');
  const { save: done, verdict: caught } = act(tried, { type: 'accuse', suspect: c.murderer, item: c.weapon });
  assert.equal(caught, 'caught');
  assert.equal(done.outcome, 'caught');
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
  assert.deepEqual(stillPossible(content, save, [c]), c.suspects);
  // Solve the word game and every puzzle: the round's clues leave 2 or 3, the killer among them.
  for (const g of c.games) save = act(save, { type: 'game-finish', kind: g.kind, status: 'revealed', data: null }).save;
  const left = stillPossible(content, save, [c]);
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
