import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DOG_CARDS, dogDeck, dogOpDeck } from '../content/dogCards.ts';
import { buildDogFight, dogHint, dogInitial, dogStep, dogView, HAND_NUMBERS, HAND_OPS } from './dogFight.ts';
import { gridValues } from './numberGrid.ts';
import { LEVELS, dogPlaysSeed, doubleSeed, fight, handOf, hintBot, hintBotSeed, placeFill, redealSeed, smallestBotSeed } from './dogFightSweeps.ts';

// The seed sweeps (dogFightSweeps.ts) run in full in scripts/check-cases.ts; here a few fixed seeds each.
const FEW = [0, 1, 2, 3, 4, 5];
const seeds = (n: number): string[] => Array.from({ length: n }, (_, i) => `dog-test-${i}`);

test('easy deck: 40 cards valued 1-10, no divide', () => {
  const deck = dogDeck('easy');
  assert.equal(deck.length, 40);
  assert.ok(deck.every((c) => c.value >= 1 && c.value <= 10));
  assert.equal(new Set(deck.map((c) => c.id)).size, 40);
  assert.ok(!dogOpDeck('easy').includes('/'));
  assert.equal(dogOpDeck('easy').filter((o) => o === '+').length, 7);
  assert.equal(dogOpDeck('hard').filter((o) => o === '+').length, 6);
  assert.equal(dogOpDeck('hard').filter((o) => o === '*').length, 2);
  assert.equal(dogOpDeck('hard').filter((o) => o === '/').length, 1);
  assert.equal(dogDeck('hard').length, 56);
  assert.equal(DOG_CARDS.find((c) => c.id === 'swords-13')!.name, 'Queen of swords');
  assert.equal(DOG_CARDS.find((c) => c.id === 'cups-1')!.value, 1);
  assert.equal(DOG_CARDS.find((c) => c.id === 'cups-14')!.value, 14);
});

test('hint bot always wins within 6 turns', () => {
  for (const level of LEVELS) for (const i of FEW) hintBotSeed(level, i);
});

test('a bot that plays its smallest value: every fight ends', () => {
  for (const level of LEVELS) for (const i of FEW) smallestBotSeed(level, i);
});

test('the dog never plays its own best or worst, and never more than her best', () => {
  for (const level of LEVELS) for (const i of FEW) dogPlaysSeed(level, i);
});

test('a defence that hits exactly gives 6 number cards next turn', () => {
  let found = 0;
  for (const level of LEVELS) {
    for (const seed of seeds(40)) {
      const f = buildDogFight(seed, level);
      let state = dogInitial();
      let v = dogView(f, state);
      // Turn 1: attack with the hint (best) play; then on turn 2 hit exactly if possible.
      state = hintBot(f)(v, state);
      state = dogStep(f, state, { t: 'play' });
      v = dogView(f, state);
      if (v.over || v.role !== 'defend') continue;
      assert.equal(v.numbers.length, HAND_NUMBERS);
      assert.equal(v.ops.length, HAND_OPS);
      const exact = gridValues(handOf(v)).get(v.dog.value);
      if (!exact) continue;
      state = placeFill(f, state, exact.fill);
      state = dogStep(f, state, { t: 'play' });
      v = dogView(f, state);
      assert.equal(v.last!.bonusCard, true);
      assert.equal(v.numbers.length, HAND_NUMBERS + 1);
      found++;
      // And it is a one-off.
      state = hintBot(f)(v, state);
      state = dogStep(f, state, { t: 'play' });
      v = dogView(f, state);
      if (!v.over) assert.equal(v.numbers.length, HAND_NUMBERS);
    }
  }
  assert.ok(found > 10, `found ${found}`);
});

test('no card repeats within a hand, and decks reshuffle over a long fight', () => {
  const f = buildDogFight('dog-long', 'easy');
  // Play small and never lose: attack only with the smallest value, defend with the hint.
  let state = dogInitial();
  let v = dogView(f, state);
  const seen = new Set<string>();
  for (let i = 0; i < 80 && !v.over; i++) {
    const ids = v.numbers.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, 'no duplicate in hand');
    for (const id of ids) seen.add(id);
    const vals = gridValues(handOf(v));
    const min = Math.min(...vals.keys());
    // Smallest on attack (no damage unless it meets), exact-or-above on defence.
    state = v.role === 'attack' ? placeFill(f, state, vals.get(min)!.fill) : dogHint(f, dogHint(f, state)!.state)!.state;
    state = dogStep(f, state, { t: 'play' });
    v = dogView(f, state);
  }
  assert.ok(seen.size > 30, `saw ${seen.size} distinct cards`);
  // A 40-card deck drawn 5 a turn runs dry in 8 turns: the fight got past that.
  assert.ok(v.over || v.turn > 8);
});

test('long fight replay is quick', () => {
  const f = buildDogFight('dog-long', 'hard');
  let state = dogInitial();
  let v = dogView(f, state);
  let turns = 0;
  while (!v.over && turns < 40) {
    const vals = gridValues(handOf(v));
    state = v.role === 'attack' ? placeFill(f, state, vals.get(Math.min(...vals.keys()))!.fill) : dogHint(f, dogHint(f, dogHint(f, state)!.state)!.state)!.state;
    state = dogStep(f, state, { t: 'play' });
    v = dogView(f, state);
    turns++;
  }
  const t0 = performance.now();
  dogView(f, state);
  console.log(`replay of ${state.moves.length} moves (${turns} turns): ${(performance.now() - t0).toFixed(0)}ms`);
});

test('same seed and moves give the same view', () => {
  for (const level of LEVELS) {
    const f1 = buildDogFight('dog-det', level);
    const f2 = buildDogFight('dog-det', level);
    const r1 = fight(f1, hintBot(f1));
    const r2 = fight(f2, hintBot(f2));
    assert.deepEqual(r1.state, r2.state);
    assert.deepEqual(dogView(f1, r1.state), dogView(f2, r2.state));
  }
  const a = dogView(buildDogFight('dog-det-a', 'hard'), dogInitial());
  const b = dogView(buildDogFight('dog-det-b', 'hard'), dogInitial());
  assert.notDeepEqual(a.numbers, b.numbers);
});

test('invalid moves change nothing', () => {
  const f = buildDogFight('dog-invalid', 'medium');
  const s0 = dogInitial();
  const slot = { row: 0, kind: 'num', i: 0 } as const;
  const slot2 = { row: 0, kind: 'num', i: 1 } as const;
  // Play with nothing placed.
  assert.equal(dogStep(f, s0, { t: 'play' }), s0);
  // Nothing to clear.
  assert.equal(dogStep(f, s0, { t: 'clear', slot }), s0);
  assert.equal(dogStep(f, s0, { t: 'clearAll' }), s0);
  // Out-of-range cards, a number card in an op slot, a row-0 row operator.
  assert.equal(dogStep(f, s0, { t: 'place', slot, card: 9 }), s0);
  assert.equal(dogStep(f, s0, { t: 'place', slot, card: -1 }), s0);
  assert.equal(dogStep(f, s0, { t: 'place', slot: { row: 0, kind: 'op', i: 0 }, card: 3 }), s0);
  assert.equal(dogStep(f, s0, { t: 'place', slot: { row: 0, kind: 'rowOp' }, card: 0 }), s0);
  // A used card can't go in a second slot.
  const s1 = dogStep(f, s0, { t: 'place', slot, card: 0 });
  assert.notEqual(s1, s0);
  assert.equal(dogStep(f, s1, { t: 'place', slot: slot2, card: 0 }), s1);
  // One number is not submittable.
  assert.equal(dogStep(f, s1, { t: 'play' }), s1);
  // Hints go through dogHint.
  assert.equal(dogStep(f, s0, { t: 'hint' }), s0);
  // Moves after the fight is over.
  const done = fight(f, hintBot(f)).state;
  assert.equal(dogView(f, done).over, 'won');
  for (const m of [
    { t: 'play' },
    { t: 'clearAll' },
    { t: 'place', slot, card: 0 },
    { t: 'clear', slot },
    { t: 'hint' },
  ] as const) {
    assert.equal(dogStep(f, done, m), done);
  }
  assert.equal(dogHint(f, done), null);
});

test('hints: question first, then fills; the ladder resets each turn', () => {
  const f = buildDogFight('dog-hints', 'hard');
  let state = dogInitial();
  const h0 = dogHint(f, state)!;
  assert.equal(h0.hint.step, 0);
  assert.equal(h0.hint.topic, 'double');
  assert.equal(typeof h0.hint.possible, 'boolean');
  assert.ok(dogView(f, h0.state).eval.rows.every((r) => !r.used), 'step 0 fills nothing');
  const h1 = dogHint(f, h0.state)!;
  assert.equal(h1.hint.step, 1);
  const v1 = dogView(f, h1.state);
  assert.ok(v1.eval.submittable);
  assert.ok(v1.eval.answer! >= v1.dog.value);
  const h2 = dogHint(f, h1.state)!;
  assert.equal(h2.hint.step, 2);
  const v2 = dogView(f, h2.state);
  assert.equal(v2.eval.answer, Math.max(...gridValues(handOf(v2)).keys()));
  assert.equal(v2.hints, 3);
  state = dogStep(f, h2.state, { t: 'play' });
  const v = dogView(f, state);
  if (!v.over) {
    assert.equal(v.role, 'defend');
    assert.equal(v.hintsThisTurn, 0);
    assert.equal(dogHint(f, state)!.hint.step, 0);
    assert.equal(dogHint(f, state)!.hint.topic, 'exact');
  }
});

test('redeals and the fallback: the counts are consistent', () => {
  for (const level of LEVELS) for (const i of FEW) {
    const r = redealSeed(level, i);
    assert.ok(r.plays >= 1 && r.fallbacks <= r.plays && r.redealed <= r.plays);
  }
});

test('on attack a double is sometimes possible and sometimes not (the rate is checked in check-cases)', () => {
  for (const level of LEVELS) {
    const doubles = Array.from({ length: 60 }, (_, i) => doubleSeed(level, i)).filter(Boolean).length;
    assert.ok(doubles > 0 && doubles < 60, `${level}: ${doubles}/60`);
  }
});
