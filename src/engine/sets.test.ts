import { test } from 'node:test';
import assert from 'node:assert/strict';
import { talk } from '../content/talk.ts';
import { content } from '../content/index.ts';
import { characterSets } from './sets.ts';

const everyone = content.suspects.map((s) => s.id);
const seeds = Array.from({ length: 500 }, (_, i) => `seed-${i}`);

test('placeholder talk content covers every suspect and card reading', () => {
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
