import { test } from 'node:test';
import assert from 'node:assert/strict';
import { housekeeperHour as hour, STAFF_KINDS } from '../content/housekeeperHour.ts';
import { content } from '../content/index.ts';
import { allHouses, houseOf } from '../content/houses.ts';
import { campaignHouseId, campaignRound, type CampaignRef } from '../engine/campaign.ts';
import { codeFor } from '../engine/caseRef.ts';
import { generateCase } from '../engine/generate.ts';
import { Rng, hashSeed } from '../engine/rng.ts';
import type { Case } from '../engine/types.ts';
import { JOBS, ROUNDS, buildEvening, eveningInput, fill, reportFor, statementFor, type Evening, type EveningInput, type Moves } from './housekeeperHour.ts';

/** About 40 real cases where the game is offered: numbered cases and campaign round 1s. */
function offered(): { c: Case; input: EveningInput }[] {
  const out: { c: Case; input: EveningInput }[] = [];
  const add = (c: Case) => {
    const input = eveningInput(c, hour);
    if (input) out.push({ c, input });
  };
  for (let n = 1; out.length < 28 && n < 400; n++) add(generateCase(content, n, n % 2 ? 'easy' : 'medium'));
  for (let i = 1; out.length < 40 && i < 400; i++) {
    const ref: CampaignRef = { mode: 'campaign', code: codeFor(i * 2_654_435), difficulty: 'easy' };
    add(campaignRound(content, { ...ref, houseId: campaignHouseId(ref) }, []));
  }
  return out;
}

const cases = offered();

test('there are enough offered cases to test on', () => {
  assert.ok(cases.length >= 40, `found ${cases.length}`);
});

test('the game is offered exactly when the Housekeeper is seated', () => {
  for (let n = 1; n <= 60; n++) {
    const c = generateCase(content, n, 'easy');
    const input = eveningInput(c, hour);
    assert.equal(input !== null, c.suspects.includes(hour.player), `case ${n}`);
  }
});

test('the game is offered on hard for a case that seats the Housekeeper', () => {
  let found = 0;
  for (let n = 1; n < 200 && found < 3; n++) {
    const c = generateCase(content, n, 'hard');
    if (!c.suspects.includes(hour.player)) continue;
    const input = eveningInput(c, hour);
    assert.ok(input, `hard case ${n}`);
    assert.equal(buildEvening(hour, input).rounds.length, ROUNDS);
    found++;
  }
  assert.ok(found > 0, 'no hard case seats the Housekeeper');
});

test('the evening input cannot see the killer', () => {
  for (const { c, input } of cases.slice(0, 10)) {
    const keys = Object.keys(input);
    for (const bad of ['murderer', 'weapon', 'sceneRoom', 'solution', 'clues']) assert.ok(!keys.includes(bad), bad);
    // Change everything the killer decides: the input, and so the evening, must not move.
    const other = c.suspects.find((s) => s !== c.murderer)!;
    const changed: Case = { ...c, murderer: other, weapon: c.items.find((i) => i !== c.weapon) ?? c.weapon, sceneRoom: c.rooms.find((r) => r !== c.sceneRoom) ?? c.sceneRoom };
    assert.deepEqual(eveningInput(changed, hour), input);
  }
});

test('the same case gives the same evening', () => {
  for (const { c, input } of cases) {
    const again = eveningInput(c, hour)!;
    assert.deepEqual(buildEvening(hour, again), buildEvening(hour, input));
    assert.equal(input.seed, hashSeed('housekeeper-' + c.seed));
  }
});

test('three rounds of three jobs: different guests, never the Housekeeper, rooms in the house and not the base room', () => {
  for (const { c, input } of cases) {
    const ev = buildEvening(hour, input);
    const houseRooms = houseOf(c).rooms.map((r) => r.id);
    assert.equal(ev.rounds.length, ROUNDS);
    const requests = new Set<string>();
    const seen = new Map<string, number>();
    for (const jobs of ev.rounds) {
      assert.equal(jobs.length, JOBS);
      assert.equal(new Set(jobs.map((j) => j.guest)).size, JOBS, 'three different guests');
      for (const j of jobs) {
        assert.notEqual(j.guest, hour.player);
        assert.ok(c.guests.includes(j.guest));
        assert.ok(houseRooms.includes(j.room), `${j.room} is in the house`);
        if (houseRooms.includes(hour.baseRoom)) assert.notEqual(j.room, hour.baseRoom);
        const def = hour.requests.find((d) => d.id === j.request)!;
        assert.ok(def.rooms === 'any' || def.rooms.includes(j.room));
        assert.ok(def.askers === 'any' || def.askers.includes(j.guest));
        assert.ok(!requests.has(j.request), 'no request twice');
        requests.add(j.request);
        seen.set(j.guest, (seen.get(j.guest) ?? 0) + 1);
        // {other}: in the case, not the subject, not the Housekeeper.
        assert.ok(c.guests.includes(j.other));
        assert.notEqual(j.other, j.guest);
        assert.notEqual(j.other, hour.player);
      }
    }
    assert.ok(ev.askJob >= 0 && ev.askJob < JOBS);
    // Nobody three times while another guest has not appeared at all.
    const askers = c.guests.filter((g) => g !== hour.player);
    if (askers.some((g) => !seen.has(g))) assert.ok([...seen.values()].every((n) => n < 3), `${c.code}: spread`);
  }
});

/** A seeded set of complete moves. */
function playOf(ev: Evening, seed: number, ticksEvery = true): Moves {
  const rng = new Rng(hashSeed('test-play-' + seed));
  const sends = ev.rounds.map(() => rng.shuffle(hour.staff.map((s) => s.id)));
  const ticks = ev.rounds.map(() => (ticksEvery ? rng.int(JOBS) : null));
  return { sends, ticks, answers: [] };
}

test('the statement asks the round-1 send and the ticked beats', () => {
  for (const { input } of cases) {
    const ev = buildEvening(hour, input);
    for (let seed = 0; seed < 6; seed++) {
      const moves = playOf(ev, seed, seed % 3 !== 2);
      const lines = statementFor(hour, ev, moves);
      assert.equal(lines[0].kind, 'send');
      assert.equal(lines[0].answer, hour.staff.find((s) => s.id === moves.sends[0][ev.askJob])!.name);
      assert.equal(lines[0].job, ev.askJob);
      assert.ok(lines[0].after.includes(ev.roomNames[ev.rounds[0][ev.askJob].room].toLowerCase()));
      // Beat lines are exactly the ticks that landed on a real report, in round order.
      const expected: number[] = [];
      moves.ticks.forEach((t, r) => {
        if (t !== null && reportFor(hour, ev, r, t, moves.sends[r][t], moves.sends.slice(0, r)).tickable) expected.push(r);
      });
      const beatLines = lines.filter((l) => l.kind === 'beat');
      assert.deepEqual(beatLines.map((l) => l.round), expected);
      assert.equal(lines.length, 1 + beatLines.length);
      for (const l of beatLines) {
        assert.equal(l.job, moves.ticks[l.round!]);
        const sentStaff = hour.staff.find((s) => s.id === moves.sends[l.round!][l.job!])!;
        assert.ok(l.before.startsWith(`I sent ${sentStaff.name} to `));
      }
    }
  }
});

test('every answer is among its options, options are distinct, nothing is left in braces', () => {
  for (const { input } of cases) {
    const ev = buildEvening(hour, input);
    for (let seed = 0; seed < 6; seed++) {
      for (const l of statementFor(hour, ev, playOf(ev, seed))) {
        assert.ok(!/[{}]/.test(l.before + l.after), `${l.before}${l.after}`);
        assert.equal(l.options.length, 3);
        assert.equal(new Set(l.options).size, 3);
        assert.ok(l.options.includes(l.answer));
      }
    }
  }
});

test('a repeat visit by the same kind to the same guest gives the fallback, and cannot be ticked', () => {
  let repeats = 0;
  for (const { input } of cases) {
    const ev = buildEvening(hour, input);
    for (let seed = 0; seed < 20; seed++) {
      const moves = playOf(ev, seed);
      for (let r = 0; r < ROUNDS; r++) {
        moves.sends[r].forEach((id, k) => {
          const rep = reportFor(hour, ev, r, k, id, moves.sends.slice(0, r));
          const kind = hour.staff.find((s) => s.id === id)!.kind;
          const before = moves.sends.slice(0, r).some((row, r2) => row.some((id2, k2) => id2 === id && ev.rounds[r2][k2].guest === ev.rounds[r][k].guest));
          assert.equal(rep.beat === null, before);
          assert.equal(rep.tickable, !before);
          if (before) {
            repeats++;
            assert.equal(rep.line, fill(hour.fallback[kind], ev, ev.rounds[r][k]));
          }
        });
      }
    }
  }
  assert.ok(repeats > 0, 'some repeat visits happen');
});

test('a mismatch line appears only when the staff member is not a fit', () => {
  for (const { input } of cases.slice(0, 10)) {
    const ev = buildEvening(hour, input);
    ev.rounds.forEach((jobs, r) => {
      jobs.forEach((j, k) => {
        const def = hour.requests.find((d) => d.id === j.request)!;
        for (const s of hour.staff) {
          const rep = reportFor(hour, ev, r, k, s.id, []);
          assert.equal(rep.mismatch, def.fits.includes(s.kind) ? null : def.mismatch[s.kind]);
        }
      });
    });
  }
});

test('names in text: capital at the start of a sentence, lower-case "the" inside one', () => {
  const names = { a: 'The Host', b: 'The Elder heir' };
  const job = { guest: 'a', other: 'b', room: 'x', request: 'y' };
  assert.equal(fill('{guest} told {other} a joke.', { names }, job), 'The Host told the Elder heir a joke.');
  assert.equal(fill("Nothing new. {guest}'s hat.", { names }, job), "Nothing new. The Host's hat.");
});

// ---------- Content ----------

const everyone = content.suspects.filter((s) => s.id !== hour.player).map((s) => s.id);

test('content: every guest has a beat of every kind, well formed', () => {
  assert.equal(hour.staff.length, 3);
  assert.deepEqual([...hour.staff.map((s) => s.kind)].sort(), [...STAFF_KINDS].sort());
  assert.equal(everyone.length, 9);
  assert.deepEqual(Object.keys(hour.beats).sort(), [...everyone].sort());
  for (const g of everyone) {
    for (const kind of STAFF_KINDS) {
      const b = hour.beats[g][kind];
      assert.ok(b, `${g} ${kind}`);
      assert.ok(b.line.length < 60, `${g} ${kind} line is ${b.line.length} characters`);
      assert.equal(new Set([b.answer, ...b.decoys]).size, 3, `${g} ${kind} options`);
      for (const text of [b.line, b.pre, b.post]) {
        const marks = text.match(/\{[^}]*\}/g) ?? [];
        for (const m of marks) assert.ok(m === '{guest}' || m === '{other}', `${g} ${kind}: ${m}`);
      }
      if (kind !== 'gossip') assert.ok(![b.line, b.pre, b.post].some((t) => t.includes('{other}')), `${g} ${kind}: {other} is gossip only`);
    }
  }
  for (const kind of STAFF_KINDS) assert.ok(hour.fallback[kind].length > 0);
});

test('content: requests are well formed and every one has a mismatch line for each kind that is not a fit', () => {
  const ids = new Set<string>();
  for (const d of hour.requests) {
    assert.ok(!ids.has(d.id));
    ids.add(d.id);
    const words = d.words.split(/\s+/).length;
    assert.ok(words >= 2 && words <= 4, `${d.id}: ${words} words`);
    assert.ok(d.fits.length >= 1 && d.fits.length <= 2, d.id);
    for (const kind of STAFF_KINDS) {
      if (d.fits.includes(kind)) assert.equal(d.mismatch[kind], undefined, `${d.id}: ${kind} fits, so no mismatch line`);
      else assert.ok(d.mismatch[kind], `${d.id}: missing mismatch for ${kind}`);
    }
    if (d.askers !== 'any') for (const a of d.askers) assert.ok(everyone.includes(a), `${d.id}: asker ${a}`);
  }
  assert.ok(hour.requests.length >= 9 * 2, 'enough requests');
});

test('content: no beat, request or mismatch text names a room, an item or a guest', () => {
  const banned = new Set<string>();
  for (const h of allHouses) for (const r of h.rooms) banned.add(r.name.toLowerCase());
  for (const i of content.items) banned.add(i.name.toLowerCase());
  for (const s of content.suspects) {
    banned.add(s.name.replace(/^The /, '').toLowerCase());
    if (s.alone) banned.add(s.alone.name.replace(/^The /, '').toLowerCase());
  }
  const texts: string[] = [Object.values(hour.fallback)].flat();
  for (const g of Object.values(hour.beats)) for (const b of Object.values(g)) texts.push(b.line, b.pre, b.post, b.answer, ...b.decoys);
  for (const d of hour.requests) texts.push(d.words, ...Object.values(d.mismatch));
  for (const t of texts) {
    for (const name of banned) {
      assert.ok(!new RegExp(`\\b${name}\\b`, 'i').test(t), `"${t}" names "${name}"`);
    }
  }
});
