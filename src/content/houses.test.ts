import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCaseIn } from '../engine/generate.ts';
import { PRESETS } from '../engine/settings.ts';
import { allHouses, chooseHouse, houseById, houseOf, lodge, otherHouses, playableHouses } from './houses.ts';
import { content, house as manor } from './index.ts';

test('houseById and houseOf round trip, unknown ids throw', () => {
  for (const h of allHouses) {
    assert.equal(houseById(h.id), h);
    assert.equal(houseOf({ houseId: h.id }), h);
  }
  assert.throws(() => houseById('nowhere'), /Unknown house/);
  assert.throws(() => houseOf({ houseId: 'nowhere' }));
});

test('every layout is playable, and the roll reaches each of them, the manor included', () => {
  assert.deepEqual(playableHouses, [manor, ...otherHouses]);
  assert.equal(allHouses.length, 6);
  const layouts = new Set<string>();
  for (let i = 0; i < 120; i++) layouts.add(chooseHouse(`roll-${i}`).id.split('/')[0]);
  assert.deepEqual([...layouts].sort(), allHouses.map((h) => h.id).sort());
});

test('a case built in the lodge has its houseId and lodge rooms', () => {
  const c = buildCaseIn({ ...content, house: lodge }, 'lodge-test', 1, 'T', PRESETS.easy);
  assert.equal(c.houseId, 'lodge');
  assert.equal(houseOf(c), lodge);
  const ids = new Set(lodge.rooms.map((r) => r.id));
  assert.ok(c.rooms.length > 0 && c.rooms.every((r) => ids.has(r)));
  assert.ok(ids.has(c.sceneRoom));
});

test('the default build is in the house its seed text rolls', async () => {
  const { buildCase } = await import('../engine/generate.ts');
  assert.equal(buildCase(content, 'case-1-easy', 1, '1', PRESETS.easy).houseId, chooseHouse('case-1-easy').id);
});

test('a campaign keeps its house for every round, and without one means the manor', async () => {
  const { campaignRound } = await import('../engine/campaign.ts');
  const lodgeRound = campaignRound(content, { mode: 'campaign', code: 'AB2CD', difficulty: 'easy', houseId: 'lodge' }, []);
  assert.equal(lodgeRound.houseId, 'lodge');
  const plain = campaignRound(content, { mode: 'campaign', code: 'AB2CD', difficulty: 'easy' }, []);
  assert.equal(plain.houseId, manor.id);
});

test('questionings in the lodge name its rooms, never their ids', async () => {
  const { campaignRound } = await import('../engine/campaign.ts');
  const { faceToFace } = await import('../game/caseJobs.ts');
  let mentions = 0;
  for (const code of ['AB2CD', 'EF3GH', 'JK4MN', 'PQ5RS', 'TV6WX', 'YZ7AB']) {
    const ref = { mode: 'campaign', code, difficulty: 'hard', houseId: 'lodge' } as const;
    const round = campaignRound(content, ref, []);
    const rooms = houseOf(round).rooms.filter((r) => r.id !== r.name.toLowerCase());
    for (const accused of round.suspects) {
      const face = faceToFace(content, ref, [], accused, round.clues.map((c) => c.id));
      const text = JSON.stringify(face.questions);
      for (const r of rooms) {
        assert.ok(!new RegExp(`\b${r.id}\b`).test(text), `${code} ${accused}: the id "${r.id}" shows`);
        if (text.includes(r.name)) mentions++;
      }
    }
  }
  assert.ok(mentions > 0, 'some question names a room, so this check is not vacuous');
});
