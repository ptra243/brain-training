import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content, houseDetails } from '../content/index.ts';
import { campaignRound, type CampaignRef } from '../engine/campaign.ts';
import type { Case } from '../engine/types.ts';
import { newCampaign } from './campaignSave.ts';
import { openingSeed, type OpeningStats } from './openingSweeps.ts';
import { bodyRoom, roomContents, roomsSeen, whereAmI } from './explore.ts';
import { roomName } from './names.ts';
import { firstSentence, joinNames, openingScript, openingStep, openingSummary, soFarLines, storySoFar, victimLineKey, victimLineText } from './opening.ts';
import { sanitizeCampaign, sanitizeProgress } from './saveGuards.ts';
import { emptyProgress, mentionsSuspect, reduce, sceneText, type Progress } from './state.ts';

const CODES = ['ABCDE', 'K7QF2', 'ZZZZZ', 'M3N4P', 'Q9R8S', 'T2U3V', 'W5X6Y', 'B7C8D', 'F2G3H', 'J4K5L', 'N6P7Q', 'R8S9T'];
const refs: CampaignRef[] = CODES.map((code, i) => ({ mode: 'campaign', code, difficulty: (['easy', 'medium', 'hard'] as const)[i % 3] }));
const firstRounds: Case[] = refs.map((ref) => campaignRound(content, ref, []));
const c0 = firstRounds[0];

const withOpening = (): Progress => ({ ...emptyProgress(), opening: { talked: [] } });

test('newCampaign starts round 1 with an opening and nothing else', () => {
  assert.deepEqual(newCampaign(refs[0]).rounds, [withOpening()]);
});

test('opening-talk records the guest once and hears beat 1', () => {
  const g = c0.suspects[0];
  const p = reduce(c0, withOpening(), { type: 'opening-talk', guest: g });
  assert.deepEqual(p.opening, { talked: [g] });
  assert.equal(p.talk?.[g], 1);
  assert.equal(reduce(c0, p, { type: 'opening-talk', guest: g }), p);
});

test('opening-talk ignores strangers, rounds without an opening, and a finished opening', () => {
  const start = withOpening();
  assert.equal(reduce(c0, start, { type: 'opening-talk', guest: 'nobody' }), start);
  const none = emptyProgress();
  assert.equal(reduce(c0, none, { type: 'opening-talk', guest: c0.suspects[0] }), none);
  assert.equal(reduce(c0, none, { type: 'opening-cat' }), none);
  assert.equal(reduce(c0, none, { type: 'opening-skip' }), none);
  assert.equal(reduce(c0, none, { type: 'opening-finish' }), none);
  const done = reduce(c0, start, { type: 'opening-finish' });
  assert.equal(reduce(c0, done, { type: 'opening-talk', guest: c0.suspects[0] }), done);
});

test('opening-cat, opening-finish and opening-skip set their flags', () => {
  const start = withOpening();
  assert.deepEqual(reduce(c0, start, { type: 'opening-cat' }).opening, { talked: [], cat: true });
  assert.deepEqual(reduce(c0, start, { type: 'opening-finish' }).opening, { talked: [], done: true });
  const skipped = reduce(c0, start, { type: 'opening-skip' });
  assert.deepEqual(skipped.opening, { talked: [], skipped: true, done: true });
  assert.equal(reduce(c0, skipped, { type: 'opening-cat' }), skipped);
});

test('an old save loads with no opening; a bad opening is dropped; a good one survives', () => {
  assert.equal(sanitizeProgress({ marks: {}, used: [], accusations: [], solved: false, games: {}, found: [] }).opening, undefined);
  for (const bad of [5, 'x', null, [], {}, { talked: 'a' }]) assert.equal(sanitizeProgress({ opening: bad }).opening, undefined);
  assert.deepEqual(sanitizeProgress({ opening: { talked: ['a', 3], cat: 'yes', done: true } }).opening, { talked: ['a'], done: true });
  const o = { talked: ['a'], cat: true, done: true, skipped: true };
  assert.deepEqual(sanitizeProgress({ opening: o }).opening, o);
  const save = newCampaign(refs[0]);
  assert.deepEqual(sanitizeCampaign(JSON.parse(JSON.stringify(save)))!.rounds[0].opening, { talked: [] });
});

test('every free clue is delivered exactly once, by its speaker or the cat', () => {
  for (const c of firstRounds) {
    const s = openingScript(c);
    const free = c.clues.filter((x) => x.delivery === 'given');
    const told = [...s.guests.flatMap((g) => g.clues), ...s.catClues];
    assert.deepEqual([...told].sort(), free.map((x) => x.id).sort());
    for (const g of s.guests) {
      for (const id of g.clues) {
        const clue = c.clues.find((x) => x.id === id)!;
        assert.equal(clue.source, 'testimony');
        assert.equal(clue.speaker, g.guest);
        // Talking about themselves is normal (a "together" clue); what they must not do is clear themselves.
        const f = clue.fact;
        assert.ok(!(['suspect-not-room', 'suspect-not-item', 'suspect-empty-handed'].includes(f.type) && mentionsSuspect(clue, g.guest)), 'a witness never vouches for themselves');
      }
    }
    for (const id of s.catClues) {
      const clue = c.clues.find((x) => x.id === id)!;
      assert.ok(!clue.speaker || !c.suspects.includes(clue.speaker));
    }
  }
});

test('the script covers all seated guests once, gathers at the body, and ignores the killer', () => {
  for (const c of firstRounds) {
    const s = openingScript(c);
    assert.deepEqual(s.guests.map((g) => g.guest), [...c.suspects]);
    assert.equal(s.room, bodyRoom(c));
    const other = c.suspects.find((x) => x !== c.murderer)!;
    const changed = { ...c, murderer: other, weapon: c.items.find((i) => i !== c.weapon)!, solution: { ...c.solution } };
    assert.deepEqual(openingScript(changed), s);
  }
});

test('victimLineKey is deterministic, valid, and uses all four types across a sweep', () => {
  const seen = new Set<string>();
  for (const c of firstRounds) {
    for (const g of c.suspects) {
      const k = victimLineKey(c, g);
      assert.deepEqual(victimLineKey(c, g), k);
      assert.ok(k.line === 0 || k.line === 1);
      seen.add(k.type);
    }
  }
  assert.equal(seen.size, 4);
});

test('openingSummary: every free clue is kept, and the guests she did not talk to are listed', () => {
  const free = c0.clues.filter((x) => x.delivery === 'given').length;
  const start = withOpening();
  assert.deepEqual(openingSummary(c0, start), { cluesGot: free, guestsMissed: [...c0.suspects] });
  const p = reduce(c0, start, { type: 'opening-talk', guest: c0.suspects[2] });
  assert.deepEqual(openingSummary(c0, p).guestsMissed, c0.suspects.filter((g) => g !== c0.suspects[2]));
});

// ---------- The moved body ----------

test('bodyRoom is deterministic, in play, and does not read the killer', () => {
  for (const c of firstRounds) {
    const b = bodyRoom(c);
    assert.equal(bodyRoom(c), b);
    assert.ok(c.rooms.includes(b));
    assert.equal(bodyRoom({ ...c, murderer: 'x' }), b);
  }
});

test('the moved-body rate is about 1 in 4 and never the scene room; non-campaign cases never move', () => {
  const base = firstRounds[0];
  let moved = 0;
  const n = 400;
  for (let seed = 1; seed <= n; seed++) {
    const b = bodyRoom({ ...base, seed });
    if (b !== base.sceneRoom) {
      moved++;
      assert.ok(base.rooms.includes(b));
    }
  }
  assert.ok(moved > n * 0.15 && moved < n * 0.35, `moved ${moved}/${n}`);
  const quick: Case = { ...base, campaign: undefined };
  for (let seed = 1; seed <= 50; seed++) assert.equal(bodyRoom({ ...quick, seed }), base.sceneRoom);
});

function movedCase(): Case {
  const base = firstRounds[0];
  for (let seed = 1; seed < 500; seed++) if (bodyRoom({ ...base, seed }) !== base.sceneRoom) return { ...base, seed, explore: true };
  throw new Error('no moved body found');
}

test('she starts at the body, the map shows both rooms, and the scene text names both', () => {
  const m = movedCase();
  assert.equal(whereAmI(m, emptyProgress()), bodyRoom(m));
  assert.deepEqual(roomsSeen(m, emptyProgress()).sort(), [m.sceneRoom, bodyRoom(m)].sort());
  const text = sceneText(m, emptyProgress())!;
  assert.ok(text.includes(roomName(bodyRoom(m))) && text.includes(roomName(m.sceneRoom)) && /drag marks/.test(text));
});

test('a body in the scene room keeps the old scene text and start room', () => {
  for (let seed = 1; seed < 500; seed++) {
    const c: Case = { ...c0, seed, explore: true };
    if (bodyRoom(c) !== c.sceneRoom) continue;
    assert.equal(sceneText(c, emptyProgress()), `The body was found in the ${roomName(c.sceneRoom)}.`);
    assert.equal(whereAmI(c, emptyProgress()), c.sceneRoom);
    return;
  }
  assert.fail('no unmoved body found');
});

// ---------- roomContents ----------

test('gathered puts every living guest in the body room; the default is unchanged', () => {
  for (const c of firstRounds) {
    const g = roomContents(houseDetails, c, { gathered: true });
    assert.deepEqual([...g[bodyRoom(c)].guests].sort(), [...c.suspects].sort());
    for (const r of c.rooms) if (r !== bodyRoom(c)) assert.deepEqual(g[r].guests, []);
    const plain = roomContents(houseDetails, c);
    assert.deepEqual(roomContents(houseDetails, c, {}), plain);
    assert.deepEqual(roomContents(houseDetails, c, { gathered: false }), plain);
    // The default still deals every guest to the room of their own stream.
    assert.deepEqual(Object.values(plain).flatMap((r) => r.guests).sort(), [...c.suspects].sort());
    for (const r of c.rooms) {
      assert.deepEqual(g[r].objects, plain[r].objects);
      assert.deepEqual(g[r].looks, plain[r].looks);
    }
  }
});

test('openingStep goes guests, then the cat only with evidence, then finish', () => {
  for (const c of firstRounds) {
    const script = openingScript(c);
    let p = withOpening();
    assert.equal(openingStep(c, p), 'guests');
    for (const g of c.suspects) p = reduce(c, p, { type: 'opening-talk', guest: g });
    assert.equal(openingStep(c, p), script.catClues.length ? 'cat' : 'finish');
    p = reduce(c, p, { type: 'opening-cat' });
    assert.equal(openingStep(c, p), 'finish');
  }
  assert.equal(openingStep(c0, emptyProgress()), 'finish');
});

test('firstSentence, joinNames and the victim line', () => {
  assert.equal(firstSentence('I saw it. Then I left.'), 'I saw it.');
  assert.equal(firstSentence('No full stop here'), 'No full stop here');
  assert.equal(joinNames(['A', 'B', 'C']), 'A, B and C');
  assert.equal(joinNames(['A']), 'A');
  const line = victimLineText(c0, c0.suspects[0], 'Zed');
  assert.ok(!line.includes('{victim}') && line.includes('Zed'));
});

test('storySoFar says nothing for guests she has not heard, and the first sentence once she has', () => {
  let p = withOpening();
  assert.ok(storySoFar(c0, p).every((r) => r.line === null));
  assert.deepEqual(soFarLines(c0, p, c0.suspects[0]), []);
  p = reduce(c0, p, { type: 'opening-talk', guest: c0.suspects[0] });
  const rows = storySoFar(c0, p);
  assert.ok(rows[0].line && rows[0].line.length > 0);
  assert.equal(rows[1].line, null);
});

test('the opening sweep holds on a few seeds (check-cases runs many)', () => {
  const stats: OpeningStats = { cases: 0, moved: 0 };
  for (let seed = 0; seed < 3; seed++) openingSeed(seed, stats);
  assert.equal(stats.cases, 3);
});
