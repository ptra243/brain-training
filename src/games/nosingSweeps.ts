import assert from 'node:assert/strict';
import { Rng, hashSeed } from '../engine/rng.ts';
import { house } from '../content/index.ts';
import type { House } from '../engine/types.ts';
import { nosingLadders, nosingSnakes } from '../content/nosing.ts';
import { BONUS_KINDS, nosingSpec, type NosingLevel } from './nosingBoard.ts';
import { allSlots, getSlot, gridValues, type GridFill } from './numberGrid.ts';
import {
  buildNosing,
  nosingHint,
  nosingInitial,
  nosingStep,
  nosingView,
  dogReward,
  type NosingMove,
  type NosingPuzzle,
  type NosingState,
  type NosingView,
} from './nosing.ts';

export const LEVELS: NosingLevel[] = ['easy', 'medium', 'hard'];

export function make(level: NosingLevel, i: number, share = 5, at: House = house): NosingPuzzle {
  const rooms = at.rooms.map((r) => r.id);
  return buildNosing({
    house: at,
    seed: at === house ? `test-${i}-${level}` : `test-${i}-${level}-${at.id}`,
    level,
    sceneRoom: rooms[i % rooms.length],
    clues: Array.from({ length: share }, (_, k) => `c${k + 1}`),
    ladders: nosingLadders,
    snakes: nosingSnakes,
  });
}

export type Policy = 'hints' | 'wrong' | 'mixed';

const targetCache = new Map<string, GridFill>();

/**
 * The grid a non-hint bot wants this dog turn: its smallest (wrong bot) or a random
 * (random bot) submittable value, picked once per turn from the fight's hand.
 */
function dogTarget(p: NosingPuzzle, v: NosingView, policy: Policy): GridFill {
  const key = `${p.seed}|${policy}|${v.dog!.turn}|${v.dog!.numbers.map((c) => c.value)}|${v.dog!.ops.map((o) => o.op)}`;
  let fill = targetCache.get(key);
  if (!fill) {
    const vals = gridValues({ numbers: v.dog!.numbers.map((c) => c.value), ops: v.dog!.ops.map((o) => o.op) });
    const keys = [...vals.keys()].sort((a, b) => a - b);
    const value = policy === 'wrong' ? keys[0] : new Rng(hashSeed(key)).pick(keys);
    fill = vals.get(value)!.fill;
    if (targetCache.size > 2000) targetCache.clear();
    targetCache.set(key, fill);
  }
  return fill;
}

/** One step towards the target grid: clear what is wrong, place what is missing, then play. */
function dogMove(p: NosingPuzzle, v: NosingView, policy: Policy): NosingMove {
  const want = dogTarget(p, v, policy);
  const have = v.dog!.fill;
  const off = allSlots().filter((slot) => getSlot(want, slot) !== getSlot(have, slot));
  const wrong = off.find((slot) => getSlot(have, slot) !== null);
  if (wrong) return { t: 'clear', slot: wrong };
  const missing = off[0];
  if (missing) return { t: 'place', slot: missing, card: getSlot(want, missing) as number };
  return { t: 'play' };
}

/** The next move a bot makes, and whether to take a hint first. */
function next(p: NosingPuzzle, s: NosingState, v: NosingView, policy: Policy, rng?: Rng): { move?: NosingMove; hint?: boolean } {
  if (v.phase === 'roll' || v.phase === 'rolled') return { move: { t: 'roll' } };
  if (v.phase === 'speed') return { move: { t: 'speed', right: policy === 'hints' ? 40 : policy === 'wrong' ? 0 : rng!.int(41) } };
  if (v.phase === 'question') {
    const q = v.question!.q;
    if (policy === 'wrong' || (policy === 'mixed' && rng!.int(2) === 0)) return { move: { t: 'answer', value: q.answer + 1 } };
    if (v.hintStep < 3) return { hint: true };
    return { move: { t: 'answer', value: q.answer } };
  }
  if (v.phase === 'dog') {
    if (policy === 'hints') return v.dog!.hintsThisTurn < 3 ? { hint: true } : { move: { t: 'play' } };
    return { move: dogMove(p, v, policy) };
  }
  // The lock.
  if (policy !== 'hints') return v.evaluation.submittable ? { move: { t: 'try' } } : { move: fillNext(p, s) };
  // A hint fills the grid with more of the way; try once it holds the target.
  if (v.evaluation.submittable && v.evaluation.answer === p.lock.target) return { move: { t: 'try' } };
  return { hint: true };
}

/** The next card to place: the first empty slot, in reading order, that takes one (any unused number, or +). */
export function fillNext(p: NosingPuzzle, s: NosingState): NosingMove {
  const v = nosingView(p, s);
  for (const slot of allSlots()) {
    if (getSlot(v.grid, slot) !== null) continue;
    const cards: (number | '+')[] = slot.kind === 'num' ? p.lock.numbers.map((_, i) => i) : ['+'];
    for (const card of cards) {
      const move: NosingMove = { t: 'place', slot, card };
      if (nosingStep(p, s, move) !== s) return move;
    }
  }
  throw new Error('nothing to place');
}

/** Her grid made submittable by placing cards. */
export function fillUntilSubmittable(p: NosingPuzzle, s: NosingState): NosingState {
  for (let n = 0; n < 20 && !nosingView(p, s).evaluation.submittable; n++) s = nosingStep(p, s, fillNext(p, s));
  return s;
}

/** `salt` changes what the random ('mixed') bot does, so a caller can look for a run that reaches some phase. */
export function drive(p: NosingPuzzle, policy: Policy, stop?: (v: NosingView) => boolean, salt = ''): { s: NosingState; v: NosingView; dog: 'won' | 'lost' | null; sawDog: boolean } {
  let s = nosingInitial();
  let dog: 'won' | 'lost' | null = null;
  let sawDog = false;
  const rng = new Rng(hashSeed(`${p.seed}-bot${salt}`));
  for (let n = 0; n < 2000; n++) {
    const v = nosingView(p, s);
    for (const m of v.messages) assert.ok(!/\b[A-Z]{3,}\b/.test(m), `${p.seed}: all-caps word in "${m}"`);
    if (v.phase === 'dog') sawDog = true;
    if (v.dog?.over) dog = v.dog.over;
    if (v.finished || stop?.(v)) return { s, v, dog, sawDog };
    const a = next(p, s, v, policy, rng);
    if (a.hint) {
      const h = nosingHint(p, s);
      assert.ok(h, 'a hint was expected');
      s = h.state;
      // At the lock, a 'tiles' hint is followed by the 'move' hint, which is then played.
      continue;
    }
    const after = nosingStep(p, s, a.move!);
    assert.notEqual(after, s, `illegal bot move ${JSON.stringify(a.move)} in ${v.phase}`);
    s = after;
  }
  throw new Error('the bot did not finish');
}

/**
 * The per-seed sweeps behind the slow Nosing tests. `npm test` runs a few fixed seeds of each;
 * `scripts/check-cases.ts` runs a sample (quick) or all of them (--full). A failed assertion throws.
 */

/** Hints win with every clue; the always-wrong and random bots finish within the turn bounds. Returns whether the always-wrong bot lost its dog fight. */
export function botSeed(level: NosingLevel, i: number, at: House = house): { lostFight: boolean } {
  const share = 1 + (i % 7);
  const p = make(level, i, share, at);
  const lv = nosingSpec(p.house, level);
  const all = p.clues.slice().sort();

  const good = drive(p, 'hints');
  assert.equal(good.v.finished, 'won', `${p.seed}: hints win`);
  assert.ok(good.sawDog, `${p.seed}: the hint bot meets the dog`);
  assert.equal(good.dog, 'won', `${p.seed}: the hint bot wins the dog fight`);
  assert.deepEqual(good.v.found.slice().sort(), all, `${p.seed}: every clue found`);
  assert.ok(good.s.hints > 0);

  const bad = drive(p, 'wrong');
  assert.ok(bad.sawDog, `${p.seed}: the always-wrong bot meets the dog`);
  assert.ok(bad.dog, `${p.seed}: the fight ends`);
  assert.ok(bad.v.finished === 'revealed' || bad.v.finished === 'won', `${p.seed}: wrong bot finishes`);
  assert.deepEqual(bad.v.found.slice().sort(), all, `${p.seed}: every clue found even when wrong`);
  const mixed = drive(p, 'mixed');
  assert.ok(mixed.sawDog && mixed.dog, `${p.seed}: the random bot meets the dog and the fight ends`);
  assert.ok(mixed.v.finished === 'revealed' || mixed.v.finished === 'won', `${p.seed}: mixed bot finishes`);
  for (const [name, run] of [['hints', good], ['wrong', bad], ['mixed', mixed]] as const) {
    const turns = run.v.turn - 1;
    assert.ok(turns <= lv.turns[1] && turns >= lv.turns[0], `${p.seed}: ${name} bot took ${turns} turns`);
  }
  return { lostFight: bad.dog === 'lost' };
}

/** The dog waits on a snake head, which has no question, and never pays out steps. */
export function dogSquareSeed(level: NosingLevel, i: number): void {
  const p = make(level, i);
  assert.equal(p.board.squares[p.dogSquare].kind, 'snake', `${p.seed}: the dog sits on a snake head`);
  assert.equal(p.questions[p.dogSquare], undefined, 'no question on the dog square');
  const reward = dogReward(p.seed);
  assert.equal(reward.length, 2);
  assert.ok(reward.every((k) => BONUS_KINDS.includes(k) && k !== 'steps'), `${p.seed}: reward ${reward}`);
}
