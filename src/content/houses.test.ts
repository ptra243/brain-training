import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCaseIn } from '../engine/generate.ts';
import { PRESETS } from '../engine/settings.ts';
import { allHouses, chooseHouse, houseById, houseOf, lodge, playableHouses } from './houses.ts';
import { content, house as manor } from './index.ts';

test('houseById and houseOf round trip, unknown ids throw', () => {
  for (const h of allHouses) {
    assert.equal(houseById(h.id), h);
    assert.equal(houseOf({ houseId: h.id }), h);
  }
  assert.throws(() => houseById('nowhere'), /Unknown house/);
  assert.throws(() => houseOf({ houseId: 'nowhere' }));
});

test('only the manor is playable for now', () => {
  assert.deepEqual(playableHouses, [manor]);
  assert.equal(chooseHouse('anything'), manor);
  assert.equal(allHouses.length, 6);
});

test('a case built in the lodge has its houseId and lodge rooms', () => {
  const c = buildCaseIn({ ...content, house: lodge }, 'lodge-test', 1, 'T', PRESETS.easy);
  assert.equal(c.houseId, 'lodge');
  assert.equal(houseOf(c), lodge);
  const ids = new Set(lodge.rooms.map((r) => r.id));
  assert.ok(c.rooms.length > 0 && c.rooms.every((r) => ids.has(r)));
  assert.ok(ids.has(c.sceneRoom));
});

test('the default build is in the manor', async () => {
  const { buildCase } = await import('../engine/generate.ts');
  assert.equal(buildCase(content, 'case-1-easy', 1, '1', PRESETS.easy).houseId, manor.id);
});

test('a campaign keeps its house for every round, and without one means the manor', async () => {
  const { campaignRound } = await import('../engine/campaign.ts');
  const lodgeRound = campaignRound(content, { mode: 'campaign', code: 'AB2CD', difficulty: 'easy', houseId: 'lodge' }, []);
  assert.equal(lodgeRound.houseId, 'lodge');
  const plain = campaignRound(content, { mode: 'campaign', code: 'AB2CD', difficulty: 'easy' }, []);
  assert.equal(plain.houseId, manor.id);
});
