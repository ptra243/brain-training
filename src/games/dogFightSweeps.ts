import assert from 'node:assert/strict';
import type { Difficulty } from '../engine/types.ts';
import { buildDogFight, CAT_LIVES, challengeMet, challengeWay, dogHint, dogInitial, dogStep, dogView, type DogFight, type DogState, type DogView } from './dogFight.ts';
import { allSlots, getSlot, gridValues, type GridFill, type Hand } from './numberGrid.ts';

/**
 * Shared by dogFight.test.ts and the seed sweeps below. `npm test` runs a few fixed seeds of each sweep;
 * `scripts/check-cases.ts` runs a sample (quick) or all of them (--full). A failed assertion throws.
 */
export const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
export const handOf = (v: DogView): Hand => ({ numbers: v.numbers.map((c) => c.value), ops: v.ops.map((o) => o.op) });

/** Moves that build `fill` from an empty grid. */
function movesFor(fill: GridFill): DogState['moves'] {
  const out: DogState['moves'] = [];
  for (const slot of allSlots()) {
    const card = getSlot(fill, slot);
    if (card !== null) out.push({ t: 'place', slot, card: card as number });
  }
  return out;
}

export function placeFill(f: DogFight, state: DogState, fill: GridFill): DogState {
  let s = dogStep(f, state, { t: 'clearAll' });
  for (const m of movesFor(fill)) s = dogStep(f, s, m);
  return s;
}

export interface Run {
  turns: number;
  view: DogView;
  state: DogState;
  trace: DogView[];
}

/** Plays a fight with a strategy until it ends or the turn cap is hit. */
export function fight(f: DogFight, pick: (v: DogView, s: DogState) => DogState, cap = 400): Run {
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

export const hintBot = (f: DogFight) => (_v: DogView, s: DogState): DogState => {
  let state = s;
  for (let i = 0; i < 3; i++) state = dogHint(f, state)!.state;
  return state;
};

export const smallestBot = (f: DogFight) => (v: DogView, s: DogState): DogState => {
  const vals = gridValues(handOf(v));
  const min = Math.min(...vals.keys());
  return placeFill(f, s, vals.get(min)!.fill);
};

/** The seed of the nth fight in the "dog-test" sweeps. */
export const testSeed = (i: number): string => `dog-test-${i}`;

/** The hint bot wins within 6 turns and never costs a life; returns its turns. */
export function hintBotSeed(level: Difficulty, i: number): number {
  const seed = testSeed(i);
  const f = buildDogFight(seed, level);
  const r = fight(f, hintBot(f), 20);
  assert.equal(r.view.over, 'won', `${level} ${seed}`);
  assert.equal(r.view.catLives, CAT_LIVES, 'following hints never costs a life');
  assert.ok(r.turns <= 6, `${level} ${seed}: ${r.turns} turns`);
  return r.turns;
}

/** A bot that plays its smallest value: the fight ends. Returns whether it lost. */
export function smallestBotSeed(level: Difficulty, i: number): boolean {
  const seed = testSeed(i);
  const f = buildDogFight(seed, level);
  const r = fight(f, smallestBot(f), 300);
  assert.ok(r.view.over, `${level} ${seed} ended`);
  return r.view.over === 'lost';
}

/** The dog never plays its own best or worst, and never more than her best. Returns the dog plays, fallbacks and redeals seen. */
export function dogPlaysSeed(level: Difficulty, i: number): { plays: number; fallbacks: number; redeals: number } {
  const out = { plays: 0, fallbacks: 0, redeals: 0 };
  const f = buildDogFight(testSeed(i), level);
  // Mix of play styles so both roles come up for many turns.
  const r = fight(f, smallestBot(f), 60);
  for (const v of r.trace) {
    out.plays++;
    out.redeals += v.dog.redeals;
    const best = Math.max(...gridValues(handOf(v)).keys());
    assert.ok(v.dog.value <= best, 'dog play within her best');
    if (v.dog.fallback) {
      out.fallbacks++;
      continue;
    }
    const dogVals = [...gridValues({ numbers: v.dog.numbers, ops: v.dog.ops }).keys()];
    assert.ok(v.dog.value > Math.min(...dogVals), 'not its worst');
    assert.ok(v.dog.value < Math.max(...dogVals), 'not its best');
  }
  return out;
}

/** The hint bot's first five turns: how many dog plays, redeals and fallbacks. */
export function redealSeed(level: Difficulty, i: number): { plays: number; redealed: number; fallbacks: number } {
  const out = { plays: 0, redealed: 0, fallbacks: 0 };
  const f = buildDogFight(`dog-count-${i}`, level);
  const r = fight(f, hintBot(f), 5);
  for (const v of r.trace.concat(r.view.over ? [] : [r.view])) {
    out.plays++;
    if (v.dog.redeals > 0) out.redealed++;
    if (v.dog.fallback) out.fallbacks++;
  }
  return out;
}

/**
 * The hint bot's first five turns: every attack challenge drawn is one her hand can meet while beating the dog
 * (checked by playing the meeting fill: it is met and gives the bonus hand). Returns the attacks, how many had a
 * challenge and the count per kind.
 */
export function challengeSeed(level: Difficulty, i: number): { attacks: number; drawn: number; kinds: Record<string, number> } {
  const out = { attacks: 0, drawn: 0, kinds: {} as Record<string, number> };
  const f = buildDogFight(`dog-challenge-${i}`, level);
  const r = fight(f, hintBot(f), 5);
  for (const v of r.trace.concat(r.view.over ? [] : [r.view])) {
    if (v.role !== 'attack') {
      assert.equal(v.challenge, null, 'no challenge on defence');
      continue;
    }
    out.attacks++;
    if (!v.challenge) continue;
    out.drawn++;
    out.kinds[v.challenge.kind] = (out.kinds[v.challenge.kind] ?? 0) + 1;
    const way = challengeWay(v.challenge, handOf(v), v.dog.value);
    assert.ok(way, `${level} dog-challenge-${i} turn ${v.turn}: ${v.challenge.kind} can be met`);
    assert.ok(way.value >= v.dog.value && challengeMet(v.challenge, handOf(v), way.fill, way.value, v.dog.value));
  }
  return out;
}

/** On attack, whether a double of the dog's play is possible with her first hand (about a third of the time). */
export function doubleSeed(level: Difficulty, i: number): boolean {
  const f = buildDogFight(`dog-double-${i}`, level);
  const v = dogView(f, dogInitial());
  return Math.max(...gridValues(handOf(v)).keys()) >= 2 * v.dog.value;
}
