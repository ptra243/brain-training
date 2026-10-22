import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DOG_CARDS, dogDeck, dogOpDeck } from '../content/dogCards.ts';
import { BONUS_NUMBERS, BONUS_OPS, buildDogFight, challengeList, challengeWay, dogHint, dogInitial, dogStep, dogView, HAND_NUMBERS, HAND_OPS, type DogMove } from './dogFight.ts';
import { gridValues } from './numberGrid.ts';
import { LEVELS, challengeSeed, dogPlaysSeed, doubleSeed, fight, handOf, hintBot, hintBotSeed, placeFill, redealSeed, smallestBotSeed } from './dogFightSweeps.ts';

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

test('a defence that hits exactly gives 6 number cards and 4 operators next turn', () => {
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
      // The best attack may have met its challenge: then this hand is already a bonus hand.
      assert.equal(v.numbers.length, v.last!.bonusCard ? BONUS_NUMBERS : HAND_NUMBERS);
      assert.equal(v.ops.length, v.last!.bonusCard ? BONUS_OPS : HAND_OPS);
      const exact = gridValues(handOf(v)).get(v.dog.value);
      if (!exact) continue;
      state = placeFill(f, state, exact.fill);
      state = dogStep(f, state, { t: 'play' });
      v = dogView(f, state);
      assert.equal(v.last!.bonusCard, true);
      assert.equal(v.numbers.length, HAND_NUMBERS + 1);
      assert.equal(v.ops.length, HAND_OPS + 1);
      found++;
      // And it is a one-off: this attack meets no challenge, or if it does the bonus comes from that.
      state = hintBot(f)(v, state);
      state = dogStep(f, state, { t: 'play' });
      v = dogView(f, state);
      if (!v.over) {
        assert.equal(v.numbers.length, v.last!.bonusCard ? BONUS_NUMBERS : HAND_NUMBERS);
        assert.equal(v.ops.length, v.last!.bonusCard ? BONUS_OPS : HAND_OPS);
      }
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

test('attack challenges: only drawn when her hand can meet them while beating the dog', () => {
  const kinds = new Set<string>();
  for (const level of LEVELS) {
    let drawn = 0;
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const r = challengeSeed(level, i);
      drawn += r.drawn;
      for (const k of Object.keys(r.kinds)) kinds.add(k);
    }
    assert.ok(drawn > 0, `${level} drew no challenge`);
  }
  assert.ok(challengeList('easy').every((c) => ['even', 'multiple', 'within'].includes(c.kind)));
  assert.ok(challengeList('hard').length > challengeList('easy').length);
  assert.ok(kinds.size >= 3);
});

test('meeting the challenge while beating the dog gives the 6/4 hand; missing it does not', () => {
  let met = 0;
  let missed = 0;
  for (const level of LEVELS) {
    for (const seed of seeds(40)) {
      const f = buildDogFight(seed, level);
      const state = dogInitial();
      const v = dogView(f, state);
      if (!v.challenge) continue;
      const way = challengeWay(v.challenge, handOf(v), v.dog.value)!;
      const after = dogView(f, dogStep(f, placeFill(f, state, way.fill), { t: 'play' }));
      assert.equal(after.last!.challengeMet, true);
      assert.equal(after.last!.bonusCard, true);
      assert.equal(after.last!.challenge!.kind, v.challenge.kind);
      if (!after.over) {
        assert.equal(after.numbers.length, BONUS_NUMBERS);
        assert.equal(after.ops.length, BONUS_OPS);
      }
      met++;
      // The smallest play never meets "within"/"allOps" and gives no bonus when it also fails to beat the dog.
      const vals = gridValues(handOf(v));
      const small = vals.get(Math.min(...vals.keys()))!.fill;
      const miss = dogView(f, dogStep(f, placeFill(f, state, small), { t: 'play' }));
      if (!miss.last!.challengeMet) {
        assert.equal(miss.last!.bonusCard, false);
        if (!miss.over) assert.equal(miss.numbers.length, HAND_NUMBERS);
        missed++;
      }
    }
  }
  assert.ok(met > 20 && missed > 5, `met ${met}, missed ${missed}`);
});

test('swap: once per fight, 1 or 2 cards, clears the grid, keeps the dog and the challenge', () => {
  const f = buildDogFight('dog-swap', 'medium');
  const s0 = dogInitial();
  const v0 = dogView(f, s0);
  assert.equal(v0.swapAvailable, true);
  const placed = dogHint(f, dogHint(f, dogHint(f, s0)!.state)!.state)!.state;
  assert.ok(dogView(f, placed).eval.rows.some((r) => r.used));
  const s1 = dogStep(f, placed, { t: 'swap', nums: [0, 3], ops: [] });
  assert.notEqual(s1, placed);
  const v1 = dogView(f, s1);
  assert.equal(v1.swapAvailable, false);
  assert.ok(v1.eval.rows.every((r) => !r.used), 'the grid is cleared');
  assert.equal(v1.numbers.length, HAND_NUMBERS);
  assert.deepEqual([v1.numbers[1].id, v1.numbers[2].id, v1.numbers[4].id], [v0.numbers[1].id, v0.numbers[2].id, v0.numbers[4].id]);
  assert.ok(![v1.numbers[0].id, v1.numbers[3].id].some((id) => v0.numbers.some((c) => c.id === id)), 'new cards');
  assert.deepEqual(v1.dog, v0.dog);
  assert.deepEqual(v1.challenge, v0.challenge);
  assert.equal(v1.turn, 1);
  // Replay is deterministic.
  assert.deepEqual(dogView(f, s1), dogView(f, { ...s1 }));
  // An operator, and a mix.
  const sOp = dogStep(f, s0, { t: 'swap', nums: [], ops: [1] });
  assert.notEqual(sOp, s0);
  assert.equal(dogView(f, sOp).ops.length, HAND_OPS);
  assert.notEqual(dogStep(f, s0, { t: 'swap', nums: [2], ops: [0] }), s0);
  // One swap per fight, even on the next turn.
  const s = hintBotPlay(f, s1);
  assert.equal(dogStep(f, s, { t: 'swap', nums: [0], ops: [] }), s);
});

function hintBotPlay(f: ReturnType<typeof buildDogFight>, s: ReturnType<typeof dogInitial>): ReturnType<typeof dogInitial> {
  const h = hintBot(f)(dogView(f, s), s);
  return dogStep(f, h, { t: 'play' });
}

test('swap: every invalid move changes nothing', () => {
  const f = buildDogFight('dog-swap-bad', 'hard');
  const s0 = dogInitial();
  const bad: DogMove[] = [
    { t: 'swap', nums: [], ops: [] },
    { t: 'swap', nums: [0, 1, 2], ops: [] },
    { t: 'swap', nums: [0, 1], ops: [0] },
    { t: 'swap', nums: [0, 0], ops: [] },
    { t: 'swap', nums: [], ops: [1, 1] },
    { t: 'swap', nums: [5], ops: [] },
    { t: 'swap', nums: [-1], ops: [] },
    { t: 'swap', nums: [0.5], ops: [] },
    { t: 'swap', nums: [], ops: [3] },
  ];
  for (const m of bad) assert.equal(dogStep(f, s0, m), s0, JSON.stringify(m));
  // Used already.
  const s1 = dogStep(f, s0, { t: 'swap', nums: [0], ops: [] });
  assert.notEqual(s1, s0);
  assert.equal(dogStep(f, s1, { t: 'swap', nums: [1], ops: [] }), s1);
  // After the fight ends.
  const done = fight(f, hintBot(f)).state;
  assert.equal(dogView(f, done).swapAvailable, false);
  assert.equal(dogStep(f, done, { t: 'swap', nums: [0], ops: [] }), done);
});

test('hints after a bad swap do not crash and still show her best play', () => {
  let tried = 0;
  for (const level of LEVELS) {
    for (const seed of seeds(40)) {
      const f = buildDogFight(seed, level);
      // Swap away the best cards (the high ones) for whatever comes, then ask for hints.
      const v = dogView(f, dogInitial());
      const order = v.numbers.map((c) => c).sort((a, b) => b.value - a.value);
      const s1 = dogStep(f, dogInitial(), { t: 'swap', nums: [order[0].index, order[1].index], ops: [] });
      let s = s1;
      for (let k = 0; k < 3; k++) {
        const h = dogHint(f, s);
        assert.ok(h);
        s = h.state;
      }
      const after = dogView(f, s);
      assert.ok(after.eval.submittable);
      tried++;
    }
  }
  assert.ok(tried > 50);
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
