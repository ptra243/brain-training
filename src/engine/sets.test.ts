import { test } from 'node:test';
import assert from 'node:assert/strict';
import { talk } from '../content/talk.ts';
import { content } from '../content/index.ts';
import { characterSets } from './sets.ts';

const everyone = content.suspects.map((s) => s.id);
const seeds = Array.from({ length: 500 }, (_, i) => `seed-${i}`);

test('talk content covers every suspect and card reading', () => {
  for (const s of everyone) {
    const me = talk.suspects[s];
    assert.ok(me, `${s} has a card`);
    for (const card of [me.card, ...me.mayAlsoRoll]) {
      for (const r of [talk.cards[card].upright, talk.cards[card].reversed]) {
        assert.ok(r.lines.neutral.length >= 2);
        assert.ok(r.threads.length >= 1);
        for (const t of r.threads) assert.ok(t.length >= 2 && t.length <= 3);
      }
    }
  }
});

test('same seed, same sets', () => {
  assert.deepEqual(characterSets(talk, 'case-6-easy', everyone), characterSets(talk, 'case-6-easy', everyone));
});

test('the sets take only the content, a seed and the suspects, so the killer cannot change them', () => {
  assert.equal(characterSets.length, 3);
});

test('every guest gets a thread, lines and a card of their own', () => {
  for (const seed of seeds.slice(0, 50)) {
    const sets = characterSets(talk, seed, everyone);
    for (const s of everyone) {
      assert.ok(sets[s].thread.length >= 2);
      assert.ok(sets[s].lines.length >= 2);
      assert.equal(sets[s].home, talk.suspects[s].card);
      assert.equal(sets[s].cold, sets[s].reversed);
      if (sets[s].borrowed) assert.ok(talk.suspects[s].mayAlsoRoll.includes(sets[s].borrowed!));
    }
  }
});

test('no line or thread is used twice in a case', () => {
  for (const seed of seeds) {
    const sets = Object.values(characterSets(talk, seed, everyone));
    const lines = sets.flatMap((s) => s.lines);
    assert.equal(new Set(lines).size, lines.length, seed);
    const threads = sets.map((s) => s.thread.join('|'));
    assert.equal(new Set(threads).size, threads.length, seed);
  }
});

test('no guest is an outlier in how often they start cold, and some borrow', () => {
  const cold: Record<string, number> = Object.fromEntries(everyone.map((s) => [s, 0]));
  let borrowed = 0;
  for (const seed of seeds) {
    const sets = characterSets(talk, seed, everyone);
    for (const s of everyone) {
      if (sets[s].reversed) cold[s]++;
      if (sets[s].borrowed) borrowed++;
    }
  }
  const rates = everyone.map((s) => cold[s] / seeds.length);
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  for (const r of rates) assert.ok(Math.abs(r - mean) < 0.08, `rate ${r} vs mean ${mean}`);
  assert.ok(mean > 0.2 && mean < 0.4, `mean ${mean}`);
  const share = borrowed / (seeds.length * everyone.length);
  assert.ok(share > 0.25 && share < 0.45, `borrow share ${share}`);
});

test("each guest's rolled greetings come from the matching pools", () => {
  for (const seed of seeds) {
    const sets = characterSets(talk, seed, everyone);
    for (const s of everyone) {
      const g = sets[s].greetings;
      assert.equal(g.cold.length, 2);
      assert.equal(g.warm.length, 1);
      assert.ok(talk.greetings.firstCold.includes(g.cold[0]), `${seed} ${s} ${g.cold[0]}`);
      assert.ok(talk.greetings.secondCold.includes(g.cold[1]), `${seed} ${s} ${g.cold[1]}`);
      assert.ok(talk.greetings.warm.includes(g.warm[0]), `${seed} ${s} ${g.warm[0]}`);
    }
  }
});

test('a borrowed line is only that guest, and only on that reading', () => {
  const line = 'I run my affairs like a good host runs a table: everyone served, nobody shortchanged.';
  const entry = talk.borrowed.find((e) => e.suspect === 'financier' && e.card === 'emperor' && e.reversed === false);
  assert.equal(entry?.line, line);
  let found = false;
  for (let i = 0; i < seeds.length || !found; i++) {
    const seed = `seed-${i}`;
    const sets = characterSets(talk, seed, everyone);
    const fin = sets.financier;
    if (fin.borrowed === 'emperor' && fin.reversed === false) {
      found = true;
      assert.ok(fin.lines.includes(line), seed);
    }
    if (i >= 4000) break;
  }
  assert.ok(found, 'no seed where the financier borrows the emperor upright');
  for (const seed of seeds) {
    const sets = characterSets(talk, seed, everyone);
    for (const s of everyone) {
      const set = sets[s];
      const match = s === 'financier' && set.borrowed === 'emperor' && set.reversed === false;
      assert.equal(set.lines.includes(line), match, `${seed} ${s}`);
    }
  }
});

test('a motive thread replaces the rolled one for that guest, card and reading only', () => {
  const without = { ...talk, motives: [] };
  let hits = 0;
  for (const seed of seeds) {
    const sets = characterSets(talk, seed, everyone);
    const plain = characterSets(without, seed, everyone);
    for (const s of everyone) {
      const set = sets[s];
      const source = set.borrowed ?? set.home;
      const motive = talk.motives.find((e) => e.suspect === s && e.card === source && e.reversed === set.reversed);
      if (motive) {
        hits++;
        assert.deepEqual(set.thread, motive.thread, `${seed} ${s}`);
        assert.deepEqual({ ...set, thread: [], asks: null }, { ...plain[s], thread: [], asks: null }, `${seed} ${s}`);
        assert.deepEqual(set.asks, motive.asks ?? null, `${seed} ${s} asks`);
        assert.equal(plain[s].asks, null);
      } else {
        assert.deepEqual(set, plain[s], `${seed} ${s}`);
      }
    }
  }
  assert.ok(hits > 0, 'no seed hit a motive');
});

test('only guests on a motive with asks carry asks, one per beat', () => {
  let withAsks = 0;
  for (const seed of seeds) {
    const sets = characterSets(talk, seed, everyone);
    for (const s of everyone) {
      const set = sets[s];
      if (set.asks) {
        withAsks++;
        assert.equal(set.asks.length, set.thread.length, `${seed} ${s}`);
        assert.equal(s, 'butler');
      }
    }
  }
  assert.ok(withAsks > 0, 'no seed gave asks');
});

test('object-thread beats never appear in lines or thread', () => {
  const all = Object.values(talk.cards).flatMap((card) => Object.values(card.objects).flatMap((o) => [...o.upright, ...o.reversed]));
  const beats = new Set(all);
  assert.ok(beats.size > 0);
  assert.equal(beats.size, all.length, 'an object beat is repeated');
  for (const seed of seeds) {
    const sets = characterSets(talk, seed, everyone);
    for (const s of everyone) {
      for (const line of [...sets[s].lines, ...sets[s].thread]) assert.equal(beats.has(line), false, `${seed} ${s}`);
    }
  }
});
