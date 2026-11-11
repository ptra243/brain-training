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
import { JOBS, ROUNDS, TIME_WORDS, buildEvening, eveningInput, fill, reportFor, statementFor, type Evening, type EveningInput, type Moves } from './housekeeperHour.ts';

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
    for (const bad of ['murderer', 'weapon', 'sceneRoom', 'solution']) assert.ok(!keys.includes(bad), bad);
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

const guestsIn = (f: object): string[] => ('suspect' in f ? [f.suspect as string] : 'suspects' in f ? [...(f.suspects as string[])] : []);

/** The same input cut to n callers (the victim plus n - 1 seated guests, the player among them). */
function withCallers(input: EveningInput, n: number): EveningInput {
  const rest = input.suspects.filter((g) => g !== hour.player && g !== input.victim);
  return { ...input, suspects: [hour.player, ...rest.slice(0, n - 1)] };
}

test('three rounds of three jobs: the watched guest every round, everyone calls, rooms in the house and not the base room', () => {
  for (const { c, input } of cases) {
    const ev = buildEvening(hour, input);
    const houseRooms = houseOf(c).rooms.map((r) => r.id);
    assert.equal(ev.rounds.length, ROUNDS);
    const requests = new Set<string>();
    assert.ok(ev.callers.length >= 4 && ev.callers.length <= 7);
    assert.equal(ev.callers[0], c.victim);
    assert.ok(!ev.callers.includes(hour.player));
    assert.ok(c.suspects.includes(ev.watched));
    assert.ok(ev.callers.includes(ev.watched));
    assert.notEqual(ev.watched, c.victim);
    assert.notEqual(ev.watched, hour.player);
    const counts = new Map<string, number>();
    for (const jobs of ev.rounds) {
      assert.equal(jobs.length, JOBS);
      assert.equal(new Set(jobs.map((j) => j.guest)).size, JOBS, 'at most one job per guest per round');
      assert.equal(jobs.filter((j) => j.guest === ev.watched).length, 1, 'the watched guest calls every round');
      for (const j of jobs) {
        assert.ok(ev.callers.includes(j.guest));
        assert.equal(j.step, counts.get(j.guest) ?? 0, 'step is the earlier call count');
        counts.set(j.guest, j.step + 1);
        assert.ok(houseRooms.includes(j.room), `${j.room} is in the house`);
        if (houseRooms.includes(hour.baseRoom)) assert.notEqual(j.room, hour.baseRoom);
        const def = hour.requests.find((d) => d.id === j.request)!;
        assert.ok(def.rooms === 'any' || def.rooms.includes(j.room));
        assert.ok(def.askers === 'any' || def.askers.includes(j.guest));
        assert.ok(!requests.has(j.request), 'no request twice');
        requests.add(j.request);
        // {other}: in the case, not the subject, not the Housekeeper.
        assert.ok(c.guests.includes(j.other));
        assert.notEqual(j.other, j.guest);
        assert.notEqual(j.other, hour.player);
      }
    }
    for (const g of ev.callers) assert.ok((counts.get(g) ?? 0) >= 1, 'every caller calls');
    assert.equal(counts.get(ev.watched), 3);
    assert.ok(ev.askJob >= 0 && ev.askJob < JOBS);
  }
});

test('the first stand-in clue naming a guest who can call makes them the watched guest; otherwise it is rolled', () => {
  let named = 0;
  for (const { input } of cases) {
    assert.ok(input.clues.length <= 2);
    for (const cl of input.clues) assert.ok(cl.text.length > 0);
    const ev = buildEvening(hour, input);
    const first = input.clues.flatMap((cl) => guestsIn(cl.fact)).find((g) => g !== hour.player && input.suspects.includes(g));
    if (first) {
      assert.equal(ev.watched, first);
      named++;
    }
    assert.deepEqual(ev.clues, input.clues);
  }
  assert.ok(named > 0, 'some case names a watched guest by clue');
  // No clue: the watched guest is still someone legal.
  const { input } = cases[0];
  const ev = buildEvening(hour, { ...input, clues: [] });
  assert.ok(input.suspects.includes(ev.watched) && ev.watched !== hour.player && ev.watched !== input.victim);
});

test('call counts: 4 callers 2 each, 5: 2,2,1,1, 6: 2,1,1,1,1, 7: 1 each (besides the watched guest)', () => {
  const want: Record<number, number[]> = { 4: [2, 2, 2], 5: [2, 2, 1, 1], 6: [2, 1, 1, 1, 1], 7: [1, 1, 1, 1, 1, 1] };
  for (const { input } of cases.slice(0, 20)) {
    for (const n of [4, 5, 6, 7]) {
      const small = withCallers(input, n);
      const ev = buildEvening(hour, { ...small, clues: input.clues.filter((cl) => guestsIn(cl.fact).every((g) => small.suspects.includes(g))) });
      if (ev.callers.length !== n) continue;
      const counts = new Map<string, number>();
      for (const j of ev.rounds.flat()) counts.set(j.guest, (counts.get(j.guest) ?? 0) + 1);
      assert.equal(counts.get(ev.watched), 3);
      const rest = ev.callers.filter((g) => g !== ev.watched).map((g) => counts.get(g)!).sort((x, y) => y - x);
      assert.deepEqual(rest, want[n]);
    }
  }
});

test('too few callers: no evening', () => {
  const small = withCallers(cases[0].input, 3);
  assert.throws(() => buildEvening(hour, small));
});

/** A seeded set of complete moves. */
function playOf(ev: Evening, seed: number, ticksEvery = true): Moves {
  const rng = new Rng(hashSeed('test-play-' + seed));
  const sends = ev.rounds.map(() => rng.shuffle(hour.staff.map((s) => s.id)));
  const ticks = ev.rounds.map(() => (ticksEvery ? rng.int(JOBS) : null));
  return { sends, ticks, answers: [] };
}

test('the statement is the send line, one beat line per tick, and the where line last', () => {
  const banned = new Set<string>();
  for (const h of allHouses) for (const r of h.rooms) banned.add(r.name.toLowerCase());
  for (const { input } of cases) {
    const ev = buildEvening(hour, input);
    for (let seed = 0; seed < 6; seed++) {
      const moves = playOf(ev, seed, seed % 3 !== 2);
      const lines = statementFor(hour, ev, moves);
      assert.equal(lines[0].kind, 'send');
      // The send question never asks about the job she ticked in round 1 (its line would give the answer away).
      const askJob = lines[0].job!;
      assert.notEqual(askJob, moves.ticks[0]);
      if (moves.ticks[0] !== ev.askJob) assert.equal(askJob, ev.askJob);
      assert.equal(lines[0].answer, hour.staff.find((s) => s.id === moves.sends[0][askJob])!.name);
      const room = ev.roomNames[ev.rounds[0][askJob].room].toLowerCase();
      assert.ok(lines[0].after.includes(room));
      assert.ok(lines[0].question.includes(room));
      // Beat lines are exactly the ticks, in round order.
      const expected: number[] = [];
      moves.ticks.forEach((t, r) => {
        if (t !== null) expected.push(r);
      });
      const beatLines = lines.filter((l) => l.kind === 'beat');
      assert.deepEqual(beatLines.map((l) => l.round), expected);
      assert.equal(lines.length, 2 + beatLines.length);
      for (const l of beatLines) {
        assert.equal(l.job, moves.ticks[l.round!]);
        const j = ev.rounds[l.round!][l.job!];
        const kind = hour.staff.find((s) => s.id === moves.sends[l.round!][l.job!])!.kind;
        assert.equal(l.answer, hour.threads[j.guest][j.step][kind].answer);
        for (const name of banned) assert.ok(!new RegExp(`\\b${name}\\b`, 'i').test(l.question + l.before + l.after), `beat line names "${name}"`);
      }
      const where = lines[lines.length - 1];
      assert.equal(where.kind, 'where');
      const wj = ev.rounds[ROUNDS - 1].find((j) => j.guest === ev.watched)!;
      assert.equal(where.answer, ev.roomNames[wj.room].toLowerCase());
      assert.ok(where.options.includes(where.answer));
      assert.equal(new Set(where.options).size, 3);
      assert.ok(where.follow);
      assert.ok(where.question.includes(TIME_WORDS[ROUNDS - 1]));
    }
  }
});

test('every answer is among its options, options are distinct, nothing is left in braces', () => {
  for (const { input } of cases) {
    const ev = buildEvening(hour, input);
    for (let seed = 0; seed < 6; seed++) {
      for (const l of statementFor(hour, ev, playOf(ev, seed))) {
        assert.ok(!/[{}]/.test(l.question + l.before + l.after), `${l.before}${l.after}`);
        assert.equal(l.options.length, 3);
        assert.equal(new Set(l.options).size, 3);
        assert.ok(l.options.includes(l.answer));
      }
    }
  }
});

test("a report is the guest's thread step for the round, with the scene filled in", () => {
  for (const { input } of cases.slice(0, 10)) {
    const ev = buildEvening(hour, input);
    ev.rounds.forEach((jobs, r) => {
      jobs.forEach((j, k) => {
        const def = hour.requests.find((d) => d.id === j.request)!;
        for (const s of hour.staff) {
          const rep = reportFor(hour, ev, r, k, s.id);
          assert.equal(rep.beat, hour.threads[j.guest][j.step][s.kind]);
          assert.equal(rep.scene, fill(def.scene, ev, j));
          assert.ok(!/[{}]/.test(rep.scene + rep.line), rep.scene + rep.line);
          assert.ok(rep.scene.includes(input.names[j.guest].replace(/^The /, '')));
        }
      });
    });
  }
});

test('a mismatch line appears only when the staff member is not a fit', () => {
  for (const { input } of cases.slice(0, 10)) {
    const ev = buildEvening(hour, input);
    ev.rounds.forEach((jobs, r) => {
      jobs.forEach((j, k) => {
        const def = hour.requests.find((d) => d.id === j.request)!;
        for (const s of hour.staff) {
          const rep = reportFor(hour, ev, r, k, s.id);
          assert.equal(rep.mismatch, def.fits.includes(s.kind) ? null : def.mismatch[s.kind]);
        }
      });
    });
  }
});

test('names in text: capital at the start of a sentence, lower-case "the" inside one', () => {
  const names = { a: 'The Host', b: 'The Elder heir' };
  const job = { guest: 'a', other: 'b', room: 'x', request: 'y', step: 0 };
  assert.equal(fill('{victim} in the {room}.', { names, victim: 'b', roomNames: { x: 'Old Library' } }, job), 'The Elder heir in the old library.');
  assert.equal(fill('{guest} told {other} a joke.', { names }, job), 'The Host told the Elder heir a joke.');
  assert.equal(fill("Nothing new. {guest}'s hat.", { names }, job), "Nothing new. The Host's hat.");
});

// ---------- Content ----------

const everyone = content.suspects.filter((s) => s.id !== hour.player).map((s) => s.id);

test('content: every guest has a thread of ROUNDS steps with all three kinds, well formed', () => {
  assert.equal(hour.staff.length, 3);
  assert.deepEqual([...hour.staff.map((s) => s.kind)].sort(), [...STAFF_KINDS].sort());
  assert.equal(everyone.length, 9);
  assert.deepEqual(Object.keys(hour.threads).sort(), [...everyone].sort());
  for (const g of everyone) {
    const thread = hour.threads[g];
    assert.equal(thread.length, ROUNDS, g);
    const answers = new Set<string>();
    thread.forEach((step, n) => {
      assert.deepEqual(Object.keys(step).sort(), [...STAFF_KINDS].sort(), `${g} step ${n}`);
      for (const kind of STAFF_KINDS) {
        const b = step[kind];
        const where = `${g} step ${n} ${kind}`;
        assert.ok(b.line.length < 60, `${where} line is ${b.line.length} characters`);
        assert.equal(new Set([b.answer, ...b.decoys]).size, 3, `${where} options (answer is not among its decoys)`);
        assert.ok(!answers.has(b.answer), `${where}: answer "${b.answer}" repeats within the thread`);
        answers.add(b.answer);
        for (const text of [b.line, b.pre, b.post]) {
          const marks = text.match(/{[^}]*}/g) ?? [];
          for (const m of marks) assert.ok(m === '{guest}' || m === '{other}', `${where}: ${m}`);
        }
        if (kind !== 'gossip') assert.ok(![b.line, b.pre, b.post].some((t) => t.includes('{other}')), `${where}: {other} is gossip only`);
      }
    });
  }
});

test('content: requests are well formed and every one has a mismatch line for each kind that is not a fit', () => {
  const ids = new Set<string>();
  for (const d of hour.requests) {
    assert.ok(!ids.has(d.id));
    assert.ok(d.scene.length < 60 && d.scene.startsWith('{guest} '), `${d.id}: scene`);
    assert.ok(!/\b(he|she|they|his|her|their)\b/i.test(d.scene), `${d.id}: scene has a gender`);
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
  const texts: string[] = [];
  for (const g of Object.values(hour.threads)) for (const step of g) for (const b of Object.values(step)) texts.push(b.line, b.pre, b.post, b.answer, ...b.decoys);
  for (const d of hour.requests) texts.push(d.words, d.scene, ...Object.values(d.mismatch));
  for (const t of texts) {
    for (const name of banned) {
      assert.ok(!new RegExp(`\\b${name}\\b`, 'i').test(t), `"${t}" names "${name}"`);
    }
  }
});

test('no job puts a guest in a room a clue of the case rules out for them', () => {
  let denials = 0;
  for (const { input } of cases) {
    denials += input.denied.length;
    const ev = buildEvening(hour, input);
    for (const j of ev.rounds.flat()) {
      assert.ok(!input.denied.some((d) => d.guest === j.guest && d.room === j.room), `${j.guest} in ${j.room}`);
    }
  }
  assert.ok(denials > 0, 'the sample cases have some "was not in" clues');
});
