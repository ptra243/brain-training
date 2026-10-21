import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Difficulty } from '../engine/types.ts';
import { DOG_CARDS, dogDeck, dogOpDeck } from '../content/dogCards.ts';
import {
  buildDogFight,
  CAT_LIVES,
  dogHint,
  dogInitial,
  dogStep,
  dogView,
  HAND_NUMBERS,
  HAND_OPS,
  type DogFight,
  type DogState,
  type DogView,
} from './dogFight.ts';
import { allSlots, getSlot, gridValues, type GridFill, type Hand } from './numberGrid.ts';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const seeds = (n: number): string[] => Array.from({ length: n }, (_, i) => `dog-test-${i}`);
const handOf = (v: DogView): Hand => ({ numbers: v.numbers.map((c) => c.value), ops: v.ops.map((o) => o.op) });

/** Moves that build `fill` from an empty grid. */
function movesFor(fill: GridFill): DogState['moves'] {
  const out: DogState['moves'] = [];
  for (const slot of allSlots()) {
    const card = getSlot(fill, slot);
    if (card !== null) out.push({ t: 'place', slot, card: card as number });
  }
  return out;
}

function placeFill(f: DogFight, state: DogState, fill: GridFill): DogState {
  let s = dogStep(f, state, { t: 'clearAll' });
  for (const m of movesFor(fill)) s = dogStep(f, s, m);
  return s;
}

interface Run {
  turns: number;
  view: DogView;
  state: DogState;
  trace: DogView[];
}

/** Plays a fight with a strategy until it ends or the turn cap is hit. */
function fight(f: DogFight, pick: (v: DogView, s: DogState) => DogState, cap = 400): Run {
  let state = dogInitial();
  let view = dogView(f, state);
  const trace: DogView[] = [];
  while (!view.over && view.turn <= cap) {
    trace.push(view);
    const before = view.turn;
    state = pick(view, state);
    state = dogStep(f, state, { t: 'play' });
    view = dogView(f, state);
    assert.ok(view.over || view.turn === before + 1, 'a play ends the turn');
  }
  return { turns: view.over ? view.last!.turn : view.turn, view, state, trace };
}

const hintBot = (f: DogFight) => (_v: DogView, s: DogState): DogState => {
  let state = s;
  for (let i = 0; i < 3; i++) state = dogHint(f, state)!.state;
  return state;
};

const smallestBot = (f: DogFight) => (v: DogView, s: DogState): DogState => {
  const vals = gridValues(handOf(v));
  const min = Math.min(...vals.keys());
  return placeFill(f, s, vals.get(min)!.fill);
};

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
  for (const level of LEVELS) {
    const turns: number[] = [];
    for (const seed of seeds(100)) {
      const f = buildDogFight(seed, level);
      const r = fight(f, hintBot(f), 20);
      assert.equal(r.view.over, 'won', `${level} ${seed}`);
      assert.equal(r.view.catLives, CAT_LIVES, 'following hints never costs a life');
      turns.push(r.turns);
    }
    const mean = turns.reduce((a, b) => a + b, 0) / turns.length;
    console.log(`hint bot ${level}: mean ${mean.toFixed(2)}, max ${Math.max(...turns)}, one-turn ${turns.filter((t) => t === 1).length}/100`);
    assert.ok(Math.max(...turns) <= 6);
  }
});

test('a bot that plays its smallest value loses sometimes, and every fight ends', () => {
  for (const level of LEVELS) {
    let lost = 0;
    for (const seed of seeds(100)) {
      const f = buildDogFight(seed, level);
      const r = fight(f, smallestBot(f), 300);
      assert.ok(r.view.over, `${level} ${seed} ended`);
      if (r.view.over === 'lost') lost++;
    }
    console.log(`smallest bot ${level}: lost ${lost}/100`);
    assert.ok(lost > 0, level);
  }
});

test('the dog never plays its own best or worst, and never more than her best', () => {
  let fallbacks = 0;
  let plays = 0;
  let redeals = 0;
  for (const level of LEVELS) {
    for (const seed of seeds(100)) {
      const f = buildDogFight(seed, level);
      // Mix of play styles so both roles come up for many turns.
      const r = fight(f, smallestBot(f), 60);
      for (const v of r.trace) {
        plays++;
        redeals += v.dog.redeals;
        const best = Math.max(...gridValues(handOf(v)).keys());
        assert.ok(v.dog.value <= best, 'dog play within her best');
        if (v.dog.fallback) {
          fallbacks++;
          continue;
        }
        const dogVals = [...gridValues({ numbers: v.dog.numbers, ops: v.dog.ops }).keys()];
        assert.ok(v.dog.value > Math.min(...dogVals), 'not its worst');
        assert.ok(v.dog.value < Math.max(...dogVals), 'not its best');
      }
    }
  }
  console.log(`dog plays ${plays}, fallbacks ${fallbacks}, redeals ${redeals}`);
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

test('redeals and the fallback are rare, counted over many seeds', () => {
  for (const level of LEVELS) {
    let plays = 0;
    let redealed = 0;
    let fallbacks = 0;
    for (let i = 0; i < 200; i++) {
      const f = buildDogFight(`dog-count-${i}`, level);
      const r = fight(f, hintBot(f), 5);
      for (const v of r.trace.concat(r.view.over ? [] : [r.view])) {
        plays++;
        if (v.dog.redeals > 0) redealed++;
        if (v.dog.fallback) fallbacks++;
      }
    }
    console.log(`${level}: ${plays} dog plays, ${redealed} needed a redeal, ${fallbacks} fallbacks`);
    assert.ok(fallbacks <= plays / 50);
  }
});

test('on attack a double is possible about a third of the time', () => {
  for (const level of LEVELS) {
    let attacks = 0;
    let doubles = 0;
    for (let i = 0; i < 600; i++) {
      const f = buildDogFight(`dog-double-${i}`, level);
      const v = dogView(f, dogInitial());
      attacks++;
      if (Math.max(...gridValues(handOf(v)).keys()) >= 2 * v.dog.value) doubles++;
    }
    console.log(`${level}: double possible on ${doubles}/${attacks} attacks`);
    assert.ok(doubles > attacks * 0.2 && doubles < attacks * 0.45, `${level}: ${doubles}/${attacks}`);
  }
});
