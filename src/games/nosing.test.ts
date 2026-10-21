import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng, hashSeed } from '../engine/rng.ts';
import { house } from '../content/index.ts';
import { nosingLadders, nosingSnakes } from '../content/nosing.ts';
import { NOSING_LEVELS, rerollFor, rollFor, nosingRollSeed, type NosingLevel } from './nosingBoard.ts';
import { lockAccepts, lockStart, lockMove } from './lock.ts';
import {
  buildNosing,
  nosingHint,
  nosingInitial,
  nosingSolve,
  nosingSplit,
  nosingStep,
  nosingView,
  type NosingMove,
  type NosingPuzzle,
  type NosingState,
  type NosingView,
} from './nosing.ts';

const LEVELS: NosingLevel[] = ['easy', 'medium', 'hard'];
const roomIds = house.rooms.map((r) => r.id);

function make(level: NosingLevel, i: number, share = 5): NosingPuzzle {
  return buildNosing({
    house,
    seed: `test-${i}-${level}`,
    level,
    sceneRoom: roomIds[i % roomIds.length],
    clues: Array.from({ length: share }, (_, k) => `c${k + 1}`),
    ladders: nosingLadders,
    snakes: nosingSnakes,
  });
}

type Policy = 'hints' | 'wrong' | 'mixed';

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
  // The lock.
  if (policy !== 'hints') return v.submittable ? { move: { t: 'try' } } : { move: { t: 'combine', a: 0, b: 1, op: '+' } };
  const h = nosingHint(p, s)!;
  const hint = h.hint;
  if (hint.kind !== 'lock') throw new Error('expected a lock hint');
  const k = hint.hint;
  if (k.kind === 'submit') return { move: { t: 'try' } };
  if (k.kind === 'undo') return { move: { t: 'undo' } };
  if (k.kind === 'tiles') return { hint: true };
  if (k.kind === 'move') return { move: { t: 'combine', ...k.move } };
  // 'way': follow its first step
  return { hint: true };
}

function drive(p: NosingPuzzle, policy: Policy, stop?: (v: NosingView) => boolean): { s: NosingState; v: NosingView } {
  let s = nosingInitial();
  const rng = new Rng(hashSeed(`${p.seed}-bot`));
  for (let n = 0; n < 2000; n++) {
    const v = nosingView(p, s);
    for (const m of v.messages) assert.ok(!/\b[A-Z]{3,}\b/.test(m), `${p.seed}: all-caps word in "${m}"`);
    if (v.finished || stop?.(v)) return { s, v };
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

test('nosing split of the game clues', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(nosingSplit), [
    { search: 0, lock: 1 },
    { search: 1, lock: 1 },
    { search: 2, lock: 1 },
    { search: 2, lock: 2 },
    { search: 3, lock: 2 },
    { search: 4, lock: 2 },
    { search: 5, lock: 2 },
  ]);
  const p = make('easy', 1, 5);
  assert.deepEqual(p.searchClues, ['c1', 'c2', 'c3']);
  assert.deepEqual(p.lockClues, ['c4', 'c5']);
  const clueSquares = p.board.squares.filter((s) => s.kind === 'search' && s.clueIndex != null);
  assert.deepEqual(clueSquares.map((s) => s.clueIndex).sort(), [0, 1, 2]);
});

test('replay is deterministic and an illegal move changes nothing', () => {
  const p = make('medium', 3);
  const a = drive(p, 'hints');
  const again = drive(make('medium', 3), 'hints');
  assert.deepEqual(a.s, again.s);
  assert.deepEqual(nosingView(p, a.s), nosingView(p, a.s));
  const fresh = nosingInitial();
  assert.equal(nosingStep(p, fresh, { t: 'answer', value: 3 }), fresh);
  assert.equal(nosingStep(p, fresh, { t: 'try' }), fresh);
  assert.equal(nosingStep(p, fresh, { t: 'reroll' }), fresh);
  assert.equal(nosingStep(p, a.s, { t: 'roll' }), a.s, 'nothing moves once the lock is open');
  assert.equal(nosingHint(p, fresh), null, 'no hints before a question');
  // The first roll comes from the seed and the turn.
  const v = nosingView(p, nosingStep(p, fresh, { t: 'roll' }));
  assert.equal(v.lastRoll, rollFor(nosingRollSeed(p.seed, p.board.attempt), p.level, 1));
});

/** Plays right answers until `stop` holds, over many seeds; returns the first hit. */
function find(level: NosingLevel, policy: Policy, stop: (v: NosingView) => boolean): { p: NosingPuzzle; s: NosingState; v: NosingView } {
  for (let i = 0; i < 300; i++) {
    const p = make(level, i);
    const { s, v } = drive(p, policy, stop);
    if (!v.finished && stop(v)) return { p, s, v };
  }
  throw new Error('no seed reached that situation');
}

test('ladder: a right answer climbs, a wrong one walks on', () => {
  for (const level of LEVELS) {
    const { p, s, v } = find(level, 'hints', (x) => x.question?.kind === 'ladder');
    const to = v.question!.climbTo!;
    const right = nosingView(p, nosingStep(p, s, { t: 'answer', value: v.question!.q.answer }));
    assert.equal(right.pos, to);
    assert.deepEqual(right.takenLadders, [v.question!.square]);
    const wrong = nosingView(p, nosingStep(p, s, { t: 'answer', value: v.question!.q.answer + 1 }));
    assert.equal(wrong.pos, v.question!.square);
    assert.ok(wrong.working && wrong.working.length > 0);
    assert.deepEqual(wrong.takenLadders, []);
  }
});

test('snake: a wrong answer slides once and the landing square does not trigger', () => {
  for (const level of LEVELS) {
    const { p, s, v } = find(level, 'hints', (x) => x.question?.kind === 'snake');
    const q = v.question!;
    const right = nosingView(p, nosingStep(p, s, { t: 'answer', value: q.q.answer }));
    assert.equal(right.pos, q.square);
    assert.deepEqual(right.usedSnakes, []);
    const wrong = nosingView(p, nosingStep(p, s, { t: 'answer', value: q.q.answer + 1 }));
    assert.equal(wrong.pos, q.slipTo);
    assert.deepEqual(wrong.usedSnakes, [q.square]);
    assert.equal(wrong.phase, 'roll');
    assert.equal(wrong.question, null);
  }
});

test('a wrong search answer makes the clue wait; the lock gives it with the rest', () => {
  for (const level of LEVELS) {
    const { p, s, v } = find(level, 'hints', (x) => x.question?.kind === 'search' && x.question.clueId !== null);
    const id = v.question!.clueId!;
    const right = nosingView(p, nosingStep(p, s, { t: 'answer', value: v.question!.q.answer }));
    assert.ok(right.found.includes(id));
    const wrong = nosingView(p, nosingStep(p, s, { t: 'answer', value: v.question!.q.answer + 1 }));
    assert.deepEqual(wrong.waiting, [id]);
    assert.ok(!wrong.found.includes(id));
  }
});

test('an obstacle bonus: steps move the cat on at once, capped at the last square', () => {
  const { p, s, v } = find('medium', 'hints', (x) => x.question?.kind === 'obstacle' && x.question.bonus === 'steps');
  const after = nosingView(p, nosingStep(p, s, { t: 'answer', value: v.question!.q.answer }));
  assert.equal(after.pos, Math.min(v.pos + 3, p.board.path.length - 1));
  assert.equal(after.bonuses.steps, 0);
});

test('reroll is held: the roll waits, and a swap uses the reroll roll', () => {
  const { p, s, v } = find('medium', 'hints', (x) => x.phase === 'roll' && x.bonuses.reroll > 0);
  const rolled = nosingView(p, nosingStep(p, s, { t: 'roll' }));
  assert.equal(rolled.phase, 'rolled');
  assert.equal(rolled.pos, v.pos);
  const seed = nosingRollSeed(p.seed, p.board.attempt);
  assert.equal(rolled.pendingRoll, rollFor(seed, p.level, v.turn));
  const swapped = nosingView(p, nosingStep(p, nosingStep(p, s, { t: 'roll' }), { t: 'reroll' }));
  assert.equal(swapped.lastRoll, rerollFor(seed, p.level, v.turn));
  assert.equal(swapped.bonuses.reroll, v.bonuses.reroll - 1);
  const kept = nosingView(p, nosingStep(p, nosingStep(p, s, { t: 'roll' }), { t: 'roll' }));
  assert.equal(kept.lastRoll, rollFor(seed, p.level, v.turn));
  assert.equal(kept.bonuses.reroll, v.bonuses.reroll);
});

test('the lock: tries run out and the way is shown as revealed', () => {
  for (const level of LEVELS) {
    const { p, s, v } = find(level, 'hints', (x) => x.phase === 'lock' && x.bonuses.closeEnough === 0);
    assert.equal(v.triesLeft, 3 + v.bonuses.spareTry);
    let cur = nosingStep(p, s, { t: 'combine', a: 0, b: 1, op: '+' });
    let view = nosingView(p, cur);
    for (let n = 0; n < 10 && !view.finished; n++) {
      cur = nosingStep(p, cur, { t: 'try' });
      view = nosingView(p, cur);
    }
    if (view.finished === 'won') continue; // a lucky sum
    assert.equal(view.finished, 'revealed');
    assert.deepEqual(view.way, p.lock.way);
    assert.deepEqual([...view.found].sort(), p.clues.slice().sort());
  }
});

test('close enough: a near number opens the lock as won, with the way to show', () => {
  const { p, s, v } = find('medium', 'hints', (x) => x.phase === 'lock' && x.bonuses.closeEnough > 0);
  const tiles = lockStart(p.lock.numbers);
  let made: { value: number; move: NosingMove } | null = null;
  for (const op of ['+', '*', '-'] as const) {
    const m = lockMove(tiles, { a: 0, b: 1, op });
    if (m) {
      const value = m.step.result;
      const near = { ...p.lock, target: value + 1 };
      if (lockAccepts(near, value, v.bonuses.closeEnough)) made = { value, move: { t: 'combine', a: 0, b: 1, op } };
    }
  }
  if (!made) return; // these first two numbers were too small to be within 10%
  const near: NosingPuzzle = { ...p, lock: { ...p.lock, target: made.value + 1 } };
  const after = nosingView(near, nosingStep(near, nosingStep(near, s, made.move), { t: 'try' }));
  assert.equal(after.finished, 'won');
  assert.deepEqual(after.inspiration, p.lock.way);
});

test('Solve puts the cat at the end, opens the lock and gives every clue', () => {
  for (const level of LEVELS) {
    const p = make(level, 5, 7);
    const s = nosingSolve(p, nosingStep(p, nosingInitial(), { t: 'roll' }));
    const v = nosingView(p, s);
    assert.equal(v.finished, 'revealed');
    assert.equal(v.pos, p.board.path.length - 1);
    assert.equal(v.phase, 'open');
    assert.deepEqual([...v.found].sort(), p.clues.slice().sort());
    assert.deepEqual(v.way, p.lock.way);
  }
});

for (const level of LEVELS) {
  test(`${level}: following hints always wins with every clue, and and always-wrong and random bots finish within the turn bounds`, () => {
    const lv = NOSING_LEVELS[level];
    for (let i = 0; i < 100; i++) {
      const share = 1 + (i % 7);
      const p = make(level, i, share);
      const all = p.clues.slice().sort();

      const good = drive(p, 'hints');
      assert.equal(good.v.finished, 'won', `${p.seed}: hints win`);
      assert.deepEqual(good.v.found.slice().sort(), all, `${p.seed}: every clue found`);
      assert.ok(good.s.hints > 0);

      const bad = drive(p, 'wrong');
      assert.ok(bad.v.finished === 'revealed' || bad.v.finished === 'won', `${p.seed}: wrong bot finishes`);
      assert.deepEqual(bad.v.found.slice().sort(), all, `${p.seed}: every clue found even when wrong`);
      const mixed = drive(p, 'mixed');
      assert.ok(mixed.v.finished === 'revealed' || mixed.v.finished === 'won', `${p.seed}: mixed bot finishes`);
      for (const [name, run] of [['hints', good], ['wrong', bad], ['mixed', mixed]] as const) {
        const turns = run.v.turn - 1;
        assert.ok(turns <= lv.turns[1] && turns >= lv.turns[0], `${p.seed}: ${name} bot took ${turns} turns`);
      }
    }
  });
}
