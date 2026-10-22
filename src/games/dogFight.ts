// The dog fight: the cat and a dog take turns building one number on the number
// grid from tarot-number cards and operator cards. Pure and seeded. The saved
// state is only her moves; every deal, the dog's hand and the dog's play are
// replayed from the seed (the same way `nosing.ts` replays a run).

import { hashSeed, Rng } from '../engine/rng.ts';
import type { Difficulty } from '../engine/types.ts';
import { dogDeck, dogOpDeck, type DogCard } from '../content/dogCards.ts';
import {
  allSlots,
  clear,
  clearAll,
  emptyFill,
  evaluateGrid,
  getSlot,
  gridLines,
  gridValues,
  place,
  usedNumbers,
  usedOpCards,
  type GridEval,
  type GridFill,
  type GridNeed,
  type GridWay,
  type Hand,
  type Op,
  type Slot,
} from './numberGrid.ts';

export const CAT_LIVES = 3;
export const DOG_LIVES = 3;
export const HAND_NUMBERS = 5;
export const HAND_OPS = 3;
/** A bonus turn adds one number card and one operator card. */
export const BONUS_NUMBERS = HAND_NUMBERS + 1;
export const BONUS_OPS = HAND_OPS + 1;
/** How many times the dog's hand is redealt before the fallback play. */
export const MAX_REDEALS = 20;

export type DogRole = 'attack' | 'defend';

export interface DogFight {
  seed: string;
  level: Difficulty;
  cards: readonly DogCard[];
  opCards: readonly Op[];
}

export function buildDogFight(seed: string, level: Difficulty): DogFight {
  return { seed, level, cards: dogDeck(level), opCards: dogOpDeck(level) };
}

// ---------- moves and state ----------

export type DogMove =
  /** `card`: an index into her hand's numbers (number slots) or operator cards (operator slots). */
  | { t: 'place'; slot: Slot; card: number }
  | { t: 'clear'; slot: Slot }
  | { t: 'clearAll' }
  | { t: 'play' }
  | { t: 'hint' }
  /** Once per fight: send 1 or 2 cards (indexes into her hand's numbers and operators) back and draw as many. Clears the grid. */
  | { t: 'swap'; nums: number[]; ops: number[] };

export interface DogState {
  moves: DogMove[];
  hints: number;
}

export const dogInitial = (): DogState => ({ moves: [], hints: 0 });

// ---------- decks ----------

/** A draw pile of card indexes plus the spent ones, reshuffled from the next seed when it runs dry. */
class Pile {
  pile: number[];
  spent: number[] = [];
  private gen = 0;
  private readonly text: string;
  constructor(text: string, size: number) {
    this.text = text;
    this.pile = new Rng(hashSeed(`${text}-0`)).shuffle(Array.from({ length: size }, (_, i) => i));
  }

  draw(n: number): number[] {
    while (this.pile.length < n && this.spent.length > 0) {
      this.gen++;
      this.pile.push(...new Rng(hashSeed(`${this.text}-${this.gen}`)).shuffle(this.spent));
      this.spent = [];
    }
    return this.pile.splice(0, n);
  }

  /**
   * A fresh draw of `n` for this turn, from everything but the other cards in
   * play: `current` (the hand held so far) goes back into the pool, nothing is spent.
   */
  redeal(current: number[], n: number, text: string): number[] {
    const pool = [...this.pile, ...this.spent, ...current];
    const hand = new Rng(hashSeed(text)).shuffle(pool).slice(0, n);
    const taken = new Set(hand);
    this.pile = [...this.pile.filter((c) => !taken.has(c)), ...current.filter((c) => !taken.has(c))];
    this.spent = this.spent.filter((c) => !taken.has(c));
    return hand;
  }

  /** Cards that can still be drawn (the pile and the spent ones, which are reshuffled in). */
  available(): number {
    return this.pile.length + this.spent.length;
  }

  /** Draws `removed.length` cards, then sends `removed` to the bottom of the pile. */
  swapOut(removed: number[]): number[] {
    const drawn = this.draw(removed.length);
    this.pile.push(...removed);
    return drawn;
  }

  /** The hand's used cards are spent; the rest go to the bottom, in hand order. */
  settle(hand: readonly number[], used: ReadonlySet<number>): void {
    for (const c of hand) {
      if (used.has(c)) this.spent.push(c);
      else this.pile.push(c);
    }
  }
}

interface Side {
  nums: Pile;
  ops: Pile;
}

function newSide(seed: string, who: string, f: DogFight): Side {
  return {
    nums: new Pile(`${seed}-${who}-numbers`, f.cards.length),
    ops: new Pile(`${seed}-${who}-ops`, f.opCards.length),
  };
}

// ---------- grid values, cached ----------

const valuesCache = new Map<string, Map<number, GridWay>>();

function cachedValues(hand: Hand, need?: GridNeed): Map<number, GridWay> {
  const key = `${hand.numbers.join(',')}|${(hand.ops as readonly Op[]).join('')}|${need ? `${need.minNumbers ?? ''}/${need.opMask ?? ''}` : ''}`;
  let v = valuesCache.get(key);
  if (!v) {
    if (valuesCache.size > 4000) valuesCache.clear();
    v = need ? gridValues(hand, need.minNumbers ?? hand.numbers.length, need) : gridValues(hand);
    valuesCache.set(key, v);
  }
  return v;
}

// ---------- the attack challenge ----------

/** A side goal on an attack turn. Data only; the UI words it. */
export type DogChallenge =
  | { kind: 'even' }
  | { kind: 'multiple'; n: number }
  /** d <= value <= d + n, where d is the dog's number. */
  | { kind: 'within'; n: number }
  | { kind: 'prime' }
  | { kind: 'square' }
  /** Uses a minus or divide card. */
  | { kind: 'minusDivide' }
  /** Uses every operator card in her hand. */
  | { kind: 'allOps' };

export const CHALLENGE_KINDS: readonly DogChallenge['kind'][] = ['even', 'multiple', 'within', 'prime', 'square', 'minusDivide', 'allOps'];

/** The challenges a level can draw from, in a fixed order. */
export function challengeList(level: Difficulty): DogChallenge[] {
  const easy: DogChallenge[] = [{ kind: 'even' }, { kind: 'multiple', n: 5 }, { kind: 'within', n: 10 }];
  if (level === 'easy') return easy;
  return [
    ...easy,
    { kind: 'multiple', n: 6 },
    { kind: 'prime' },
    { kind: 'square' },
    { kind: 'within', n: 5 },
    { kind: 'minusDivide' },
    { kind: 'allOps' },
  ];
}

const isPrime = (v: number): boolean => {
  if (v < 2) return false;
  for (let i = 2; i * i <= v; i++) if (v % i === 0) return false;
  return true;
};

/** The value part of a challenge (the fill part is `fillMeets`). */
function valueMeets(c: DogChallenge, v: number, d: number): boolean {
  switch (c.kind) {
    case 'even':
      return v % 2 === 0;
    case 'multiple':
      return v % c.n === 0;
    case 'within':
      return v >= d && v <= d + c.n;
    case 'prime':
      return isPrime(v);
    case 'square':
      return Number.isInteger(Math.sqrt(v));
    default:
      return true;
  }
}

function fillMeets(c: DogChallenge, hand: Hand, fill: GridFill): boolean {
  const ops = hand.ops as readonly Op[];
  const used = usedOpCards(fill);
  if (c.kind === 'minusDivide') return used.some((i) => ops[i] === '-' || ops[i] === '/');
  if (c.kind === 'allOps') return used.length === ops.length;
  return true;
}

/** Whether this play (value `v` on `fill`) beats the dog (v >= d) and meets the challenge. */
export function challengeMet(c: DogChallenge, hand: Hand, fill: GridFill, v: number, d: number): boolean {
  return v >= d && valueMeets(c, v, d) && fillMeets(c, hand, fill);
}

/** A play of this hand that beats the dog (value >= d) and meets the challenge, or null when there is none. */
export function challengeWay(c: DogChallenge, hand: Hand, d: number): { value: number; fill: GridFill } | null {
  const reach = (vals: Map<number, GridWay>): { value: number; fill: GridFill } | null => {
    for (const [value, way] of vals) if (value >= d && valueMeets(c, value, d)) return { value, fill: way.fill };
    return null;
  };
  const ops = hand.ops as readonly Op[];
  if (c.kind === 'allOps') {
    if (ops.length + 1 > hand.numbers.length) return null;
    return reach(cachedValues(hand, { minNumbers: ops.length + 1, opMask: (1 << ops.length) - 1 }));
  }
  if (c.kind === 'minusDivide') {
    for (const [j, op] of ops.entries()) {
      if (op !== '-' && op !== '/') continue;
      const r = reach(cachedValues(hand, { opMask: 1 << j }));
      if (r) return r;
    }
    return null;
  }
  return reach(cachedValues(hand));
}

/** The challenge for an attack turn: the level's list shuffled from the seed, the first one her hand can meet. Null when none fits. */
function drawChallenge(f: DogFight, turn: number, hand: Hand, d: number): DogChallenge | null {
  const order = new Rng(hashSeed(`${f.seed}-challenge-${turn}`)).shuffle(challengeList(f.level));
  return order.find((c) => challengeWay(c, hand, d) !== null) ?? null;
}

// ---------- the dog's play ----------

export interface DogPlay {
  value: number;
  fill: GridFill;
  lines: string[];
  /** The dog's hand for this play (values and operators; the fill indexes into them). */
  numbers: number[];
  ops: Op[];
  /** The dog's hand ids, for display. */
  cardIds: string[];
  /** How many times its hand was redealt before a play qualified. */
  redeals: number;
  /** No redeal worked: the dog plays the smallest value she can make, with her cards' numbers. */
  fallback: boolean;
}

interface DogPlan extends DogPlay {
  /** Card indexes of the dog's final hand, and the ones its play used. */
  hand: number[];
  opsHand: number[];
  numbersUsed: number[];
  opsUsed: number[];
}

const sortedKeys = (m: Map<number, unknown>): number[] => [...m.keys()].sort((a, b) => a - b);

/**
 * Attack has two strict tiers, chosen once per turn (1/3 "double", else "beat"):
 * the double tier is plays <= floor(best / 2) (she can double them), the beat tier
 * is plays in (floor(best / 2), best] (she can meet them, never double them). A
 * double turn may fall back to the beat tier; a beat turn never falls back to
 * the double tier (the hand is redealt instead).
 */
function pickDogValue(
  role: DogRole,
  doubleTurn: boolean,
  middle: number[],
  herVals: Map<number, GridWay>,
  best: number,
  rng: Rng,
): number | null {
  const tiers: number[][] = [];
  if (role === 'attack') {
    const half = Math.floor(best / 2);
    const double = middle.filter((v) => v <= half);
    const beat = middle.filter((v) => v > half && v <= best);
    tiers.push(...(doubleTurn ? [double, beat] : [beat]));
  } else {
    if (rng.next() < 1 / 2) tiers.push(middle.filter((v) => v <= best && herVals.has(v)));
    tiers.push(middle.filter((v) => v <= best));
  }
  const tier = tiers.find((t) => t.length > 0);
  return tier ? rng.pick(tier) : null;
}

// ---------- the replay ----------

interface Sim {
  f: DogFight;
  cat: Side;
  dog: Side;
  turn: number;
  catLives: number;
  dogLives: number;
  bonus: boolean;
  herNums: number[];
  herOps: number[];
  hand: Hand;
  herVals: Map<number, GridWay>;
  plan: DogPlan;
  fill: GridFill;
  hintRun: number;
  last: DogTurnResult | null;
  over: 'won' | 'lost' | null;
  hints: number;
  /** This attack turn's challenge (null on defence, or when her hand can't meet any). */
  challenge: DogChallenge | null;
  /** The once-per-fight swap has been spent. */
  swapUsed: boolean;
}

export interface DogTurnResult {
  turn: number;
  role: DogRole;
  catValue: number;
  dogValue: number;
  catLines: string[];
  dogLines: string[];
  dogLost: number;
  catLost: number;
  /** She hit the dog's number exactly on a defence, or met the attack challenge: one more number and one more operator next turn. */
  bonusCard: boolean;
  /** The attack challenge this turn had (null on defence or when none was drawn), and whether she met it while beating the dog. */
  challenge: DogChallenge | null;
  challengeMet: boolean;
}

const roleOf = (turn: number): DogRole => (turn % 2 === 1 ? 'attack' : 'defend');

function makePlan(sim: Sim, herVals: Map<number, GridWay>): DogPlan {
  const { f, dog, turn } = sim;
  const role = roleOf(turn);
  const best = Math.max(...herVals.keys());
  const doubleTurn = role === 'attack' && new Rng(hashSeed(`${f.seed}-dog-tier-${turn}`)).next() < 1 / 3;
  let hand = dog.nums.draw(HAND_NUMBERS);
  let opHand = dog.ops.draw(HAND_OPS);
  for (let k = 0; k <= MAX_REDEALS; k++) {
    if (k > 0) {
      hand = dog.nums.redeal(hand, HAND_NUMBERS, `${sim.f.seed}-dog-numbers-${turn}-redeal-${k}`);
      opHand = dog.ops.redeal(opHand, HAND_OPS, `${sim.f.seed}-dog-ops-${turn}-redeal-${k}`);
    }
    const dogHand: Hand = { numbers: hand.map((c) => f.cards[c].value), ops: opHand.map((c) => f.opCards[c]) };
    const vals = sortedKeys(cachedValues(dogHand));
    const middle = vals.slice(1, -1);
    const rng = new Rng(hashSeed(`${f.seed}-dog-play-${turn}-${k}`));
    const value = pickDogValue(role, doubleTurn, middle, herVals, best, rng);
    if (value === null) continue;
    const fill = cachedValues(dogHand).get(value)!.fill;
    return {
      value,
      fill,
      lines: gridLines(dogHand, fill),
      numbers: dogHand.numbers.slice(),
      ops: dogHand.ops as Op[],
      cardIds: hand.map((c) => f.cards[c].id),
      redeals: k,
      fallback: false,
      hand,
      opsHand: opHand,
      numbersUsed: usedNumbers(fill).map((i) => hand[i]),
      opsUsed: usedOpCards(fill).map((i) => opHand[i]),
    };
  }
  // Fallback, shown on a copy of her cards (the dog's own cards go back unused): on a beat turn
  // the smallest value she can make above half her best, else her best; otherwise her smallest.
  const half = Math.floor(best / 2);
  const above = sortedKeys(herVals).filter((v) => v > half);
  const value = role === 'attack' && !doubleTurn ? (above[0] ?? best) : Math.min(...herVals.keys());
  const fill = herVals.get(value)!.fill;
  return {
    value,
    fill,
    lines: gridLines(sim.hand, fill),
    numbers: sim.hand.numbers.slice(),
    ops: sim.hand.ops as Op[],
    cardIds: sim.herNums.map((c) => f.cards[c].id),
    redeals: MAX_REDEALS,
    fallback: true,
    hand,
    opsHand: opHand,
    numbersUsed: [],
    opsUsed: [],
  };
}

/** Her hand and what it can make, from the cards she holds now. */
function setHand(sim: Sim): void {
  const { f } = sim;
  sim.hand = { numbers: sim.herNums.map((c) => f.cards[c].value), ops: sim.herOps.map((c) => f.opCards[c]) };
  sim.herVals = cachedValues(sim.hand);
}

function startTurn(sim: Sim): void {
  const { f } = sim;
  sim.herNums = sim.cat.nums.draw(sim.bonus ? BONUS_NUMBERS : HAND_NUMBERS);
  sim.herOps = sim.cat.ops.draw(sim.bonus ? BONUS_OPS : HAND_OPS);
  sim.bonus = false;
  setHand(sim);
  sim.plan = makePlan(sim, sim.herVals);
  sim.challenge = roleOf(sim.turn) === 'attack' ? drawChallenge(f, sim.turn, sim.hand, sim.plan.value) : null;
  sim.fill = emptyFill();
  sim.hintRun = 0;
}

function newSim(f: DogFight): Sim {
  const sim = {
    f,
    cat: newSide(f.seed, 'cat', f),
    dog: newSide(f.seed, 'dog', f),
    turn: 1,
    catLives: CAT_LIVES,
    dogLives: DOG_LIVES,
    bonus: false,
    fill: emptyFill(),
    hintRun: 0,
    last: null,
    over: null,
    hints: 0,
    challenge: null,
    swapUsed: false,
  } as unknown as Sim;
  startTurn(sim);
  return sim;
}

export interface DogHint {
  /** 0 asks a question, 1 and 2 fill her grid. */
  step: number;
  topic: 'double' | 'exact';
  /** Step 0: whether a double (attack) or an exact hit (defend) is possible. */
  possible: boolean | null;
  /** Steps 1 and 2: the value of the play now on her grid. */
  value: number | null;
}

function hintFor(sim: Sim): DogHint {
  const d = sim.plan.value;
  const keys = sortedKeys(sim.herVals);
  const step = Math.min(sim.hintRun, 2);
  const role = roleOf(sim.turn);
  const topic = role === 'attack' ? 'double' : 'exact';
  if (step === 0) {
    const possible = role === 'attack' ? keys.some((v) => v >= 2 * d) : sim.herVals.has(d);
    return { step, topic, possible, value: null };
  }
  let value: number;
  // After a swap her hand may not reach d at all: then the hint shows her best play.
  const best = keys[keys.length - 1];
  if (role === 'attack') value = step === 1 ? (keys.find((v) => v >= d) ?? best) : best;
  else value = sim.herVals.has(d) ? d : (keys.find((v) => v > d) ?? best);
  sim.fill = sim.herVals.get(value)!.fill;
  return { step, topic, possible: null, value };
}

const validSlot = (slot: Slot): boolean =>
  allSlots().some((s) => s.row === slot.row && s.kind === slot.kind && (s as { i?: number }).i === (slot as { i?: number }).i);

function resolve(sim: Sim, ev: GridEval): void {
  const role = roleOf(sim.turn);
  const v = ev.answer!;
  const d = sim.plan.value;
  let dogLost = 0;
  let catLost = 0;
  let bonusCard = false;
  const met = role === 'attack' && sim.challenge !== null && challengeMet(sim.challenge, sim.hand, sim.fill, v, d);
  if (role === 'attack') {
    dogLost = v >= 2 * d ? 2 : v >= d ? 1 : 0;
    bonusCard = met;
  } else if (v < d) catLost = 1;
  else if (v === d) bonusCard = true;
  sim.last = {
    turn: sim.turn,
    role,
    catValue: v,
    dogValue: d,
    catLines: gridLines(sim.hand, sim.fill),
    dogLines: sim.plan.lines,
    dogLost,
    catLost,
    bonusCard,
    challenge: role === 'attack' ? sim.challenge : null,
    challengeMet: met,
  };
  sim.dogLives -= dogLost;
  sim.catLives -= catLost;
  sim.bonus = bonusCard;
  // Spend the cards that were played; the rest go back.
  sim.cat.nums.settle(sim.herNums, new Set(usedNumbers(sim.fill).map((i) => sim.herNums[i])));
  sim.cat.ops.settle(sim.herOps, new Set(usedOpCards(sim.fill).map((i) => sim.herOps[i])));
  sim.dog.nums.settle(sim.plan.hand, new Set(sim.plan.numbersUsed));
  sim.dog.ops.settle(sim.plan.opsHand, new Set(sim.plan.opsUsed));
  if (sim.dogLives <= 0) sim.over = 'won';
  else if (sim.catLives <= 0) sim.over = 'lost';
  else {
    sim.turn++;
    startTurn(sim);
  }
}

/** Applies one move. Returns false (and changes nothing) when it is invalid. */
function apply(sim: Sim, move: DogMove): { ok: boolean; hint?: DogHint } {
  if (sim.over) return { ok: false };
  if (move.t === 'hint') {
    const hint = hintFor(sim);
    sim.hintRun++;
    sim.hints++;
    return { ok: true, hint };
  }
  if (move.t === 'swap') {
    const { nums, ops } = move;
    if (sim.swapUsed || !Array.isArray(nums) || !Array.isArray(ops)) return { ok: false };
    const total = nums.length + ops.length;
    const good = (idx: number[], len: number): boolean =>
      idx.every((i) => Number.isInteger(i) && i >= 0 && i < len) && new Set(idx).size === idx.length;
    if (total < 1 || total > 2 || !good(nums, sim.herNums.length) || !good(ops, sim.herOps.length)) return { ok: false };
    if (sim.cat.nums.available() < nums.length || sim.cat.ops.available() < ops.length) return { ok: false };
    const newNums = sim.cat.nums.swapOut(nums.map((i) => sim.herNums[i]));
    const newOps = sim.cat.ops.swapOut(ops.map((i) => sim.herOps[i]));
    nums.forEach((hi, k) => (sim.herNums[hi] = newNums[k]));
    ops.forEach((hi, k) => (sim.herOps[hi] = newOps[k]));
    setHand(sim);
    sim.fill = emptyFill();
    sim.hintRun = 0;
    sim.swapUsed = true;
    return { ok: true };
  }
  if (move.t === 'clearAll') {
    if (evaluateGrid(sim.hand, sim.fill).rows.every((r) => !r.used)) return { ok: false };
    sim.fill = clearAll();
    return { ok: true };
  }
  if (move.t === 'clear') {
    if (!validSlot(move.slot) || getSlot(sim.fill, move.slot) === null) return { ok: false };
    sim.fill = clear(sim.fill, move.slot);
    return { ok: true };
  }
  if (move.t === 'place') {
    const { slot, card } = move;
    if (!validSlot(slot) || !Number.isInteger(card) || card < 0) return { ok: false };
    const limit = slot.kind === 'num' ? sim.hand.numbers.length : sim.hand.ops.length;
    if (card >= limit || getSlot(sim.fill, slot) === card) return { ok: false };
    const next = place(sim.fill, slot, card);
    if (next === sim.fill) return { ok: false };
    sim.fill = next;
    return { ok: true };
  }
  if (move.t === 'play') {
    const ev = evaluateGrid(sim.hand, sim.fill);
    if (!ev.submittable) return { ok: false };
    resolve(sim, ev);
    return { ok: true };
  }
  return { ok: false };
}

function replay(f: DogFight, state: DogState): Sim {
  const sim = newSim(f);
  for (const m of state.moves) apply(sim, m);
  return sim;
}

// ---------- a fight run move by move ----------
// Nosing around keeps one running fight and feeds it her moves, so replaying a
// whole run replays each fight once instead of once per move.

/** A fight in progress (opaque): start it, apply her moves, read its view. */
export type DogSim = Sim;

export const dogStart = (f: DogFight): DogSim => newSim(f);

/** Applies one move to a running fight; false (and nothing changes) when it is invalid. A hint comes back with its ladder step. */
export const dogApply = (sim: DogSim, move: DogMove): { ok: boolean; hint?: DogHint } => apply(sim, move);

// ---------- the view ----------

export interface DogNumberCard {
  index: number;
  id: string;
  value: number;
  name: string;
  /** Placed on the grid now. */
  used: boolean;
}

export interface DogOpCard {
  index: number;
  op: Op;
  used: boolean;
}

export interface DogView {
  turn: number;
  role: DogRole;
  catLives: number;
  dogLives: number;
  numbers: DogNumberCard[];
  ops: DogOpCard[];
  /** What the dog plays this turn, shown to her before she places anything. */
  dog: DogPlay;
  fill: GridFill;
  eval: GridEval;
  /** The turn before this one (or the final turn once the fight is over). */
  last: DogTurnResult | null;
  over: 'won' | 'lost' | null;
  hints: number;
  /** How many hints she has taken this turn. */
  hintsThisTurn: number;
  /** This attack turn's challenge; null on defence or when her hand can't meet any. */
  challenge: DogChallenge | null;
  /** The once-per-fight swap is still available. */
  swapAvailable: boolean;
}

export const dogView = (f: DogFight, state: DogState): DogView => dogSimView(f, replay(f, state));

/** The view of a running fight. */
export function dogSimView(f: DogFight, sim: DogSim): DogView {
  const usedN = new Set(usedNumbers(sim.fill));
  const usedO = new Set(usedOpCards(sim.fill));
  const p = sim.plan;
  return {
    turn: sim.turn,
    role: roleOf(sim.turn),
    catLives: sim.catLives,
    dogLives: sim.dogLives,
    numbers: sim.herNums.map((c, index) => ({
      index,
      id: f.cards[c].id,
      value: f.cards[c].value,
      name: f.cards[c].name,
      used: usedN.has(index),
    })),
    ops: (sim.hand.ops as readonly Op[]).map((op, index) => ({ index, op, used: usedO.has(index) })),
    dog: {
      value: p.value,
      fill: p.fill,
      lines: p.lines,
      numbers: p.numbers,
      ops: p.ops,
      cardIds: p.cardIds,
      redeals: p.redeals,
      fallback: p.fallback,
    },
    fill: sim.fill,
    eval: evaluateGrid(sim.hand, sim.fill),
    last: sim.last,
    over: sim.over,
    hints: sim.hints,
    hintsThisTurn: sim.hintRun,
    challenge: sim.over ? null : sim.challenge,
    swapAvailable: !sim.swapUsed && !sim.over,
  };
}

/** One move. An invalid move (or any move after the fight is over) gives back the same state. */
export function dogStep(f: DogFight, state: DogState, move: DogMove): DogState {
  if (move.t === 'hint') return state; // hints go through `dogHint`
  if (!apply(replay(f, state), move).ok) return state;
  return { ...state, moves: [...state.moves, move] };
}

/** A cat hint for this turn, with its grid fill applied, and the state with the hint counted. Null once the fight is over. */
export function dogHint(f: DogFight, state: DogState): { hint: DogHint; state: DogState } | null {
  const r = apply(replay(f, state), { t: 'hint' });
  if (!r.ok || !r.hint) return null;
  return { hint: r.hint, state: { moves: [...state.moves, { t: 'hint' }], hints: state.hints + 1 } };
}
