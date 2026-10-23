import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { faceLines } from '../content/talk.ts';
import { campaignCast, type CampaignRef } from '../engine/campaign.ts';
import { codeFor } from '../engine/caseRef.ts';
import { currentRound, newCampaign, roundCase, updateRound } from './campaign.ts';
import { endingKind, faceLine, holdRound, pendingAccusation, resolveHeld } from './face.ts';
import { reduce } from './state.ts';

const ref: CampaignRef = { mode: 'campaign', code: codeFor(31_337), difficulty: 'medium' };
const cast = campaignCast(content, ref);
const innocent = cast.suspects.find((s) => s !== cast.killer)!;

test('a held accusation resolves to what updateRound gives, and nothing is pending before it', () => {
  const save = newCampaign(ref);
  assert.equal(pendingAccusation(save), null);
  const c = roundCase(content, save, 0);
  for (const [suspect, item] of [
    [innocent, c.weapon],
    [cast.killer, c.weapon],
    [cast.killer, c.items.find((i) => i !== c.weapon)!],
  ] as const) {
    const progress = reduce(c, save.rounds[0], { type: 'accuse', suspect, item });
    const direct = updateRound(content, save, c, progress);
    const held = holdRound(save, progress);
    assert.deepEqual(pendingAccusation(held), { accused: suspect });
    assert.equal(held.victims.length, 0, 'the verdict is not applied yet');
    assert.equal(currentRound(held), 0);
    assert.deepEqual(resolveHeld(content, held, c), direct);
  }
});

test('ending lines follow the verdict and are seeded picks', () => {
  assert.equal(endingKind(false, false, undefined), 'innocent');
  assert.equal(endingKind(true, true, false), 'confession');
  assert.equal(endingKind(true, false, false), 'dodge');
  assert.equal(endingKind(true, false, true), 'confession');
  assert.equal(faceLine('dodge', 'seed-a'), faceLine('dodge', 'seed-a'));
  const seen = new Set(Array.from({ length: 40 }, (_, i) => faceLine('retort', `s${i}`)));
  assert.ok(seen.size > 1);
  for (const l of seen) assert.ok(faceLines.retort.includes(l));
});
