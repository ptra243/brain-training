import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nosingSpec, rerollFor, rollFor, nosingRollSeed, type NosingLevel } from './nosingBoard.ts';
import { lockAccepts, lockNote } from './lock.ts';
import { wordingPairs } from './mentalMaths.ts';
import { usedNumbers } from './numberGrid.ts';
import { NOSING_LEVELS } from './nosingBoard.ts';
import {
  nosingHint,
  nosingInitial,
  nosingLanding,
  nosingSolve,
  nosingSolveKind,
  nosingSolveStep,
  nosingSplit,
  nosingStep,
  nosingUpgrade,
  nosingView,
  NOSING_VERSION,
  dogReward,
  type NosingMove,
  type NosingPuzzle,
  type NosingState,
  type NosingView,
} from './nosing.ts';
import { LEVELS, botSeed, dogSquareSeed, drive, fillUntilSubmittable, make, type Policy } from './nosingSweeps.ts';

// The seed sweeps (bots over 100 seeds per level, the dog square) live in nosingSweeps.ts and run in full
// in scripts/check-cases.ts; here a few fixed seeds per level catch a broken rule.
const BOT_SEEDS = [0, 1, 2, 3, 4, 5, 6]; // seven seeds cover every clue share (1 + i % 7)
const DOG_SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

test('question wordings are dealt from a deck: none repeats until the deck is used up', () => {
  for (const level of LEVELS) {
    const deckSize = wordingPairs(level).length;
    for (const i of [0, 1, 2, 3, 4]) {
      const p = make(level, i);
      const keys = Object.keys(p.questions).map(Number).sort((a, b) => a - b).map((k) => `${p.questions[k].kind}:${p.questions[k].wording}`);
      for (let s = 0; s < keys.length; s += deckSize) {
        const chunk = keys.slice(s, s + deckSize);
        assert.equal(new Set(chunk).size, chunk.length, `${level} seed ${i}: a wording repeats within one deck`);
      }
    }
  }
});

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
  assert.equal(v.lastRoll, rollFor(nosingRollSeed(p.seed, p.board.attempt), nosingSpec(p.house, p.level), 1));
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
    const crosses = v.pos < p.dogSquare && to >= p.dogSquare && !v.usedSnakes.includes(p.dogSquare);
    assert.equal(right.pos, crosses ? p.dogSquare : to, 'a climb past the dog stops on it');
    assert.deepEqual(right.takenLadders, [v.question!.square]);
    const wrong = nosingView(p, nosingStep(p, s, { t: 'answer', value: v.question!.q.answer + 1 }));
    assert.equal(wrong.pos, v.question!.square);
    assert.ok(wrong.working && wrong.working.length > 0);
    assert.deepEqual(wrong.takenLadders, []);
  }
});

test('snake: a wrong answer slides once and the landing square does not trigger', () => {
  for (const level of LEVELS.filter((l) => l !== 'easy')) { // easy has a single snake, and the dog has it
    const { p, s, v } = find(level, 'hints', (x) => x.question?.kind === 'snake');
    const q = v.question!;
    const right = nosingView(p, nosingStep(p, s, { t: 'answer', value: q.q.answer }));
    assert.equal(right.pos, q.square);
    assert.deepEqual(right.usedSnakes.filter((i) => i !== p.dogSquare), []);
    const wrong = nosingView(p, nosingStep(p, s, { t: 'answer', value: q.q.answer + 1 }));
    assert.equal(wrong.pos, q.slipTo);
    assert.deepEqual(wrong.usedSnakes.filter((i) => i !== p.dogSquare), [q.square]);
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

test('an obstacle: a wrong answer sends the cat back two squares, not below the start, and it asks again', () => {
  for (const level of LEVELS) {
    const { p, s, v } = find(level, 'hints', (x) => x.question?.kind === 'obstacle');
    const at = v.question!.square;
    const wrong = nosingView(p, nosingStep(p, s, { t: 'answer', value: v.question!.q.answer + 1 }));
    assert.equal(wrong.pos, Math.max(at - 2, 0));
    assert.equal(wrong.phase, 'roll', 'the square it backs onto does not trigger');
    assert.ok(wrong.messages.includes('The cat backs off two squares.'));
    assert.equal(wrong.bonuses.reroll, v.bonuses.reroll, 'no bonus for a wrong answer');
    assert.ok(!wrong.spent.includes(at), 'a wrong answer does not spend the obstacle');
    const right = nosingView(p, nosingStep(p, s, { t: 'answer', value: v.question!.q.answer }));
    assert.ok(right.spent.includes(at), 'a right answer spends it');
  }
});

test('view.spent: empty at the start; a right search answer spends the square, a wrong one does not', () => {
  const p = make('medium', 0);
  assert.deepEqual(nosingView(p, nosingInitial()).spent, []);
  const { p: sp, s, v } = find('medium', 'hints', (x) => x.question?.kind === 'search');
  const at = v.question!.square;
  assert.ok(!nosingView(sp, nosingStep(sp, s, { t: 'answer', value: v.question!.q.answer + 1 })).spent.includes(at));
  assert.ok(nosingView(sp, nosingStep(sp, s, { t: 'answer', value: v.question!.q.answer })).spent.includes(at));
});

test('every roll stops first (rolled), and nosingLanding says where the cat would stop', () => {
  for (const level of LEVELS) {
    const p = make(level, 2);
    const rolled = nosingView(p, nosingStep(p, nosingInitial(), { t: 'roll' }));
    assert.equal(rolled.phase, 'rolled');
    assert.equal(rolled.pos, 0);
    assert.equal(rolled.bonuses.reroll, 0);
    assert.equal(nosingStep(p, nosingStep(p, nosingInitial(), { t: 'roll' }), { t: 'reroll' }).moves.length, 1, 'no re-roll without the bonus');
    assert.equal(nosingLanding(p, nosingView(p, nosingInitial())), null);
  }
  // On turn k of a hint-following run, the landing is where Move puts the cat (the dog and the end included).
  for (const level of LEVELS) {
    const p = make(level, 4);
    for (let k = 1; k <= 12; k++) {
      const { s, v } = drive(p, 'hints', (x) => x.phase === 'rolled' && x.turn === k);
      if (v.finished || v.phase !== 'rolled') break;
      const land = nosingLanding(p, v)!;
      const after = nosingView(p, nosingStep(p, s, { t: 'roll' }));
      assert.equal(after.trail[after.trail.length - 1], land, `${p.seed} turn ${k}: landing`);
      assert.ok(land <= p.board.path.length - 1);
    }
  }
  // The dog stops a move that reaches or passes its square.
  const p = make('medium', 1);
  const view = { ...nosingView(p, nosingInitial()), phase: 'rolled' as const, pos: p.dogSquare - 1, pendingRoll: 5 };
  assert.equal(nosingLanding(p, view), p.dogSquare);
  assert.equal(nosingLanding(p, { ...view, usedSnakes: [p.dogSquare] }), p.dogSquare + 4);
});

test('reroll is held: the roll waits, and a swap uses the reroll roll', () => {
  const { p, s, v } = find('medium', 'hints', (x) => x.phase === 'roll' && x.bonuses.reroll > 0);
  const rolled = nosingView(p, nosingStep(p, s, { t: 'roll' }));
  assert.equal(rolled.phase, 'rolled');
  assert.equal(rolled.pos, v.pos);
  const seed = nosingRollSeed(p.seed, p.board.attempt);
  assert.equal(rolled.pendingRoll, rollFor(seed, nosingSpec(p.house, p.level), v.turn));
  const swapped = nosingView(p, nosingStep(p, nosingStep(p, s, { t: 'roll' }), { t: 'reroll' }));
  assert.equal(swapped.lastRoll, rerollFor(seed, nosingSpec(p.house, p.level), v.turn));
  assert.equal(swapped.bonuses.reroll, v.bonuses.reroll - 1);
  const kept = nosingView(p, nosingStep(p, nosingStep(p, s, { t: 'roll' }), { t: 'roll' }));
  assert.equal(kept.lastRoll, rollFor(seed, nosingSpec(p.house, p.level), v.turn));
  assert.equal(kept.bonuses.reroll, v.bonuses.reroll);
});

test('the lock: tries run out and the way is shown as revealed', () => {
  for (const level of LEVELS) {
    const { p, s, v } = find(level, 'hints', (x) => x.phase === 'lock' && x.bonuses.closeEnough === 0);
    assert.equal(v.triesLeft, 3 + v.bonuses.spareTry);
    let cur = fillUntilSubmittable(p, s);
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

test('a wrong try costs a try and leaves the grid as it is', () => {
  const { p, s } = find('easy', 'hints', (x) => x.phase === 'lock' && x.bonuses.closeEnough === 0);
  const ready = fillUntilSubmittable(p, s);
  const before = nosingView(p, ready);
  if (before.evaluation.answer === p.lock.target) return; // a lucky sum
  const after = nosingView(p, nosingStep(p, ready, { t: 'try' }));
  assert.equal(after.triesLeft, before.triesLeft - 1);
  assert.deepEqual(after.grid, before.grid);
  assert.ok(after.messages[0].startsWith('Not that number'));
});

test('the dog waits on a snake head, which has no question, and never pays out steps', () => {
  for (const level of LEVELS) for (const i of DOG_SEEDS) dogSquareSeed(level, i);
  assert.equal(make('easy', 3).board.squares.filter((sq) => sq.kind === 'snake').length, 1, 'on easy the dog is the only snake');
});

test('the dog fight: landing starts it, a win keeps the cat and pays two bonuses, a loss slides it, Solve works mid-fight', () => {
  const fresh = nosingInitial();
  const sample = make('easy', 0);
  assert.equal(nosingStep(sample, fresh, { t: 'skipDog', pass: true }), fresh);
  assert.equal(nosingStep(sample, fresh, { t: 'skipDog', pass: false }), fresh);
  for (const level of LEVELS) {
    const lost = find(level, 'hints', (x) => x.phase === 'dog');
    const { p, s, v } = lost;
    assert.equal(v.pos, p.dogSquare);
    assert.equal(v.question, null);
    assert.ok(v.dog && !v.dog.over && v.dog.catLives === 3 && v.dog.dogLives === 3);
    assert.equal(nosingStep(p, s, { t: 'roll' }), s, 'no rolling mid-fight');
    assert.equal(nosingStep(p, s, { t: 'answer', value: 3 }), s);
    assert.equal(nosingStep(p, s, { t: 'try' }), s);
    assert.equal(nosingStep(p, s, { t: 'play' }), s, 'an empty grid can not be played');
    const hinted = nosingHint(p, s)!;
    assert.equal(hinted.hint.kind, 'dog');
    assert.equal(nosingView(p, hinted.state).dog!.hints, 1);
    assert.equal(hinted.state.hints, s.hints + 1);
    // Solve mid-fight.
    const solved = nosingView(p, nosingSolve(p, s));
    assert.equal(solved.finished, 'revealed');
    assert.equal(solved.dog, null);
    assert.deepEqual([...solved.found].sort(), p.clues.slice().sort());

    const won = drive(p, 'hints', (x) => !!x.dog?.over);
    assert.equal(won.v.dog!.over, 'won');
    assert.ok(won.v.pos >= p.dogSquare, 'the cat carries on from the snake head');
    assert.ok(won.v.usedSnakes.includes(p.dogSquare));
    const gained = dogReward(p.seed);
    assert.ok(
      Object.values(won.v.bonuses).reduce((a, b) => a + b, 0) - Object.values(v.bonuses).reduce((a, b) => a + b, 0) >= 2,
      'at least the two bonuses',
    );
    assert.equal(won.v.messages[0], 'The dog runs off.');
    assert.ok(won.v.messages.length >= 3, `${gained}`);
    // The result stays until the next move, which clears it. The cat may have been carried onto a question,
    // a speed round or the lock, so the next move depends on where it stands.
    const onward: NosingMove | null =
      won.v.phase === 'question' ? { t: 'answer', value: won.v.question!.q.answer } : won.v.phase === 'speed' ? { t: 'speed', right: 0 } : won.v.phase === 'lock' ? null : { t: 'roll' };
    if (onward) {
      const next = nosingView(p, nosingStep(p, won.s, onward));
      assert.equal(next.dog, null);
      assert.ok(next.usedSnakes.includes(p.dogSquare));
    }

    const slid = drive(p, 'wrong', (x) => !!x.dog?.over);
    const sq = p.board.squares[p.dogSquare];
    assert.equal(slid.v.dog?.over, 'lost');
    assert.equal(slid.v.pos, sq.to);
    assert.ok(slid.v.usedSnakes.includes(p.dogSquare), 'an earlier wrong snake answer may also be used');
    assert.equal(slid.v.phase, 'roll');
    assert.ok(slid.v.messages[0].startsWith('The dog chases the cat'));
  }
});

test('place, clear and clear all: bad moves change nothing', () => {
  const { p, s, v } = find('easy', 'hints', (x) => x.phase === 'lock' && x.locked.length === 0);
  const n0 = { row: 0, kind: 'num', i: 0 } as const;
  const n1 = { row: 0, kind: 'num', i: 1 } as const;
  const o0 = { row: 0, kind: 'op', i: 0 } as const;
  assert.equal(nosingStep(p, s, { t: 'try' }), s, 'an empty grid can not be tried');
  assert.equal(nosingStep(p, s, { t: 'clear', slot: n0 }), s, 'nothing to clear');
  assert.equal(nosingStep(p, s, { t: 'clearAll' }), s);
  assert.equal(nosingStep(p, s, { t: 'place', slot: n0, card: '+' }), s, 'an operator in a number slot');
  assert.equal(nosingStep(p, s, { t: 'place', slot: o0, card: 0 }), s, 'a number in an operator slot');
  assert.equal(nosingStep(p, s, { t: 'place', slot: n0, card: 6 }), s, 'no such number');
  assert.equal(nosingStep(p, s, { t: 'place', slot: { row: 0, kind: 'rowOp' }, card: '+' }), s, 'row 1 has no row operator');
  const a = nosingStep(p, s, { t: 'place', slot: n0, card: 0 });
  assert.notEqual(a, s);
  assert.equal(nosingStep(p, a, { t: 'place', slot: n1, card: 0 }), a, 'a number is placed once');
  assert.equal(nosingView(p, a).grid[0].nums[0], 0);
  const b = nosingStep(p, nosingStep(p, a, { t: 'place', slot: o0, card: '+' }), { t: 'place', slot: n1, card: 1 });
  const ev = nosingView(p, b).evaluation;
  assert.ok(ev.submittable);
  assert.equal(ev.answer, p.lock.numbers[0] + p.lock.numbers[1]);
  const cleared = nosingView(p, nosingStep(p, b, { t: 'clear', slot: n1 }));
  assert.equal(cleared.grid[0].nums[1], null);
  assert.equal(cleared.evaluation.submittable, false);
  assert.deepEqual(nosingView(p, nosingStep(p, b, { t: 'clearAll' })).grid, v.grid);
});

test('a note from the cat fills the start of the lock, and those slots stay', () => {
  const { p, s, v } = find('medium', 'hints', (x) => x.phase === 'lock' && x.bonuses.note > 0);
  assert.ok(v.messages.includes('The cat filled in the start of the lock for you.'));
  assert.deepEqual(v.grid, lockNote(p.lock));
  assert.ok(v.locked.length > 0 && usedNumbers(v.grid).length < usedNumbers(p.lock.way).length);
  for (const slot of v.locked) {
    assert.equal(nosingStep(p, s, { t: 'clear', slot }), s, 'a noted slot can not be cleared');
  }
  const more = fillUntilSubmittable(p, s);
  assert.deepEqual(nosingView(p, nosingStep(p, more, { t: 'clearAll' })).grid, v.grid, 'clear all leaves the note');
});

test('an old save with combine or undo loses the lock moves and keeps the rest', () => {
  const walk: NosingMove[] = [{ t: 'roll' }, { t: 'answer', value: 4 }];
  const p = make('easy', 2);
  const V = NOSING_VERSION;
  const old = nosingUpgrade({ moves: [...walk, { t: 'combine', a: 0, b: 1, op: '+' }, { t: 'hint' }, { t: 'try' }], hints: 2, v: V }, p);
  assert.deepEqual(old, { moves: walk, hints: 2, v: V });
  const undone = nosingUpgrade({ moves: [...walk, { t: 'hint' }, { t: 'undo' }, { t: 'roll' }], hints: 1, solved: 'revealed', v: V }, p);
  assert.deepEqual(undone, { moves: [...walk, { t: 'hint' }], hints: 1, solved: 'revealed', v: V });
  // A save with nothing old comes back untouched, including a try on the new grid.
  const fresh = { moves: [...walk, { t: 'try' }] as NosingMove[], hints: 0, v: V };
  assert.equal(nosingUpgrade(fresh, p), fresh);
  // A finished game with old lock moves stays open, as revealed.
  assert.equal(nosingUpgrade({ moves: [{ t: 'undo' }], hints: 0, v: V }, p, true).solved, 'revealed');
  // And it plays on: the upgraded save replays.
  const v = nosingView(p, nosingUpgrade({ moves: [{ t: 'roll' }, { t: 'roll' }, { t: 'combine', a: 0, b: 1, op: '+' }], hints: 0, v: V }, p));
  assert.equal(v.turn, 2);
});

test('a save from before the room cap drops the walk', () => {
  const landed = find('medium', 'hints', (x) => x.phase === 'dog');
  const { p } = landed;
  const s: NosingState = { ...landed.s, moves: [...landed.s.moves, { t: 'hint' }] };
  // A current save is left alone, and upgrading it again changes nothing.
  assert.equal(nosingUpgrade(s, p), s);
  assert.deepEqual(nosingUpgrade({ moves: [{ t: 'roll' }], hints: 4, v: 2 }, p), { moves: [], hints: 0, v: 3 });
  // An unversioned save used to keep the walk up to the dog fight. The board changed, so the walk goes.
  const saved = { moves: s.moves, hints: s.hints };
  const up = nosingUpgrade(saved, p);
  assert.deepEqual(up, { moves: [], hints: 0, v: 3 });
  assert.equal(nosingUpgrade(up, p), up);
  const finished = nosingUpgrade(saved, p, true);
  assert.equal(finished.solved, 'revealed');
  assert.deepEqual(finished.moves, []);
  assert.equal(finished.hints, 0);
});

test('the swap move works inside a nosing dog fight', () => {
  const { p, s } = find('easy', 'hints', (x) => x.phase === 'dog' && x.dog!.turn === 1 && x.dog!.swapAvailable);
  const before = nosingView(p, s).dog!;
  const next = nosingStep(p, s, { t: 'swap', nums: [0], ops: [] });
  assert.notEqual(next, s);
  assert.equal(nosingView(p, next).dog!.swapAvailable, false);
  assert.equal(nosingStep(p, next, { t: 'swap', nums: [1], ops: [] }), next, 'once per fight');
  assert.equal(before.turn, 1);
});

test('close enough: a near number opens the lock as won, with the way to show', () => {
  const { p, s, v } = find('medium', 'hints', (x) => x.phase === 'lock' && x.bonuses.closeEnough > 0);
  const ready = fillUntilSubmittable(p, s);
  const value = nosingView(p, ready).evaluation.answer!;
  const near: NosingPuzzle = { ...p, lock: { ...p.lock, target: value + 1 } };
  if (!lockAccepts(near.lock, value, v.bonuses.closeEnough)) return; // too small to be within 10%
  const after = nosingView(near, nosingStep(near, ready, { t: 'try' }));
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
  test(`${level}: right, always-wrong and random walks meet the dog, stay within the turn bounds and reach the lock`, () => {
    for (const i of BOT_SEEDS) botSeed(level, i);
  });
}

test('Solve on a step: a question is answered right with the working shown, as a hint; the game goes on', () => {
  for (const level of LEVELS) {
    const { p, s, v } = find(level, 'hints', (x) => x.question?.kind === 'search' && x.question.clueId !== null);
    assert.equal(nosingSolveKind(v), 'step');
    const next = nosingSolveStep(p, s);
    const after = nosingView(p, next);
    assert.equal(next.hints, s.hints + 1);
    assert.equal(next.solved, undefined);
    assert.equal(after.finished, null);
    assert.ok(after.found.includes(v.question!.clueId!), 'the clue is found');
    assert.deepEqual(after.spent.filter((i) => i === v.question!.square), [v.question!.square]);
    assert.deepEqual(after.working, v.question!.q.working);
    // Same result as typing the right answer, apart from the working.
    const typed = nosingView(p, nosingStep(p, s, { t: 'answer', value: v.question!.q.answer }));
    assert.equal(after.pos, typed.pos);
    assert.deepEqual(after.found, typed.found);
  }
  const { p, s } = find('easy', 'hints', (x) => x.question?.kind === 'ladder');
  const climbed = nosingView(p, nosingSolveStep(p, s));
  assert.equal(climbed.takenLadders.length, 1);
});

test('Solve on the dog fight: the fight is won and the cat carries on; the game goes on', () => {
  for (const level of LEVELS) {
    const { p, s, v } = find(level, 'hints', (x) => x.phase === 'dog');
    assert.equal(nosingSolveKind(v), 'step');
    const next = nosingSolveStep(p, s);
    const after = nosingView(p, next);
    assert.equal(next.hints, s.hints + 1);
    assert.equal(after.finished, null);
    assert.equal(after.dog!.over, 'won');
    assert.ok(after.usedSnakes.includes(p.dogSquare));
    assert.ok(after.pos >= p.dogSquare);
    assert.equal(after.messages[0], 'The dog runs off.');
  }
});

test('Solve step is illegal outside a question or the fight, and nosingStep refuses the move', () => {
  const p = make('easy', 2);
  const fresh = nosingInitial();
  assert.equal(nosingSolveKind(nosingView(p, fresh)), null);
  assert.equal(nosingSolveStep(p, fresh), fresh);
  assert.equal(nosingStep(p, fresh, { t: 'solve' }), fresh);
  const rolled = nosingStep(p, fresh, { t: 'roll' });
  assert.equal(nosingSolveKind(nosingView(p, rolled)), null, 'hidden once rolled');
  assert.equal(nosingSolveStep(p, rolled), rolled);
  const lock = find('easy', 'hints', (x) => x.phase === 'lock');
  assert.equal(nosingSolveKind(lock.v), 'lock');
  assert.equal(nosingSolveStep(lock.p, lock.s), lock.s, 'the lock is solved by nosingSolve, not a step');
  const open = drive(p, 'hints');
  assert.equal(nosingSolveKind(open.v), null);
});

test('a bot that Solves every question and dog step, then opens the lock by hints, wins within the turn bounds', () => {
  for (const level of LEVELS) {
    for (const i of [0, 1, 2]) {
      const p = make(level, i);
      let s = nosingInitial();
      let steps = 0;
      for (let n = 0; n < 2000; n++) {
        const v = nosingView(p, s);
        if (v.finished) break;
        let after: NosingState;
        if (nosingSolveKind(v) === 'step') {
          after = nosingSolveStep(p, s);
          steps++;
        } else if (v.phase === 'lock') {
          after = v.evaluation.submittable && v.evaluation.answer === p.lock.target ? nosingStep(p, s, { t: 'try' }) : nosingHint(p, s)!.state;
        } else if (v.phase === 'speed') after = nosingStep(p, s, { t: 'speed', right: 0 });
        else after = nosingStep(p, s, { t: 'roll' });
        assert.notEqual(after, s, `${level} ${i}: stuck in ${v.phase}`);
        s = after;
      }
      const end = nosingView(p, s);
      assert.equal(end.finished, 'won', `${level} ${i}`);
      assert.ok(steps > 0 && s.hints >= steps);
      assert.deepEqual(end.found.slice().sort(), p.clues.slice().sort());
      const [lo, hi] = NOSING_LEVELS[level].turns;
      assert.ok(end.turn - 1 >= lo && end.turn - 1 <= hi, `${level} ${i}: turn bound`);
    }
  }
});
