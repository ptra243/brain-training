import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPEED_SECONDS, speedQuestions, speedReward, type SpeedQuestion } from './speedRound.ts';

const OPS = ['+', '−', '×', '÷'];
const NUMBER = /^(0|[1-9]\d*)$/;

/** Parse `x op y = z` (one `_` in x, op or y) into its parts, checking the grammar. */
function parse(q: SpeedQuestion) {
  assert.equal(q.text.split('_').length, 2, `one blank: ${q.text}`);
  assert.ok(!/ {2}|^ | $/.test(q.text), `single spaces: ${q.text}`);
  const m = /^(\S+) (\S+) (\S+) = (\S+)$/.exec(q.text);
  assert.ok(m, `grammar: ${q.text}`);
  const [, x, op, y, z] = m;
  assert.ok(NUMBER.test(z), `result is shown: ${q.text}`);
  for (const t of [x, y]) assert.ok(t === '_' || NUMBER.test(t), q.text);
  assert.ok(op === '_' || OPS.includes(op), q.text);
  return { x, op, y, z: Number(z) };
}

function holds(x: number, op: string, y: number, z: number): boolean {
  if (op === '+') return x + y === z;
  if (op === '−') return x - y === z;
  if (op === '×') return x * y === z;
  return y !== 0 && x === y * z;
}

/** Why a wrong number card might be there, written independently of the picker. */
function explainable(w: number, trueOp: string, blankLeft: boolean, answer: number, shown: number, result: number): boolean {
  if (w === answer + 10 || w === answer - 10) return true;
  if ((trueOp === '×' || trueOp === '÷') && (w === answer + 1 || w === answer - 1)) return true;
  // What a different operation would need in the blank, shown numbers fixed.
  for (const op of OPS) {
    if (op === trueOp) continue;
    const trial = blankLeft ? (v: number) => holds(v, op, shown, result) : (v: number) => holds(shown, op, v, result);
    if (trial(w)) return true;
  }
  // The last resort: the nearest numbers to the answer.
  return Math.abs(w - answer) <= 3;
}

test('the round is 60 seconds and 40 blank sums, deterministic, true when filled in', () => {
  assert.equal(SPEED_SECONDS, 60);
  const seen = { easyOpBlank: 0, mediumOpBlank: 0, hardOpBlank: 0, mediumDiv: 0, hardDiv: 0 };
  for (const level of ['easy', 'medium', 'hard'] as const) {
    for (let i = 0; i < 100; i++) {
      const qs = speedQuestions(`r${i}`, level);
      assert.equal(qs.length, 40);
      assert.deepEqual(qs, speedQuestions(`r${i}`, level));
      for (const q of qs) {
        assert.ok(!/[{}]|undefined|NaN/.test(q.text), q.text);
        const { x, op, y, z } = parse(q);
        assert.equal(q.cards.length, 4, q.text);
        assert.equal(new Set(q.cards).size, 4, `distinct cards: ${q.text}`);
        assert.ok(q.cards.includes(q.answer), q.text);

        if (op === '_') {
          assert.ok(OPS.includes(q.answer), q.text);
          assert.deepEqual([...q.cards].sort(), [...OPS].sort(), q.text);
          assert.ok(holds(Number(x), q.answer, Number(y), z), `${q.text} with ${q.answer}`);
          if (q.answer === '÷') assert.notEqual(level, 'easy', q.text);
          if (level === 'easy') seen.easyOpBlank++;
          if (level === 'medium') seen.mediumOpBlank++;
          if (level === 'hard') seen.hardOpBlank++;
          if (q.answer === '÷' && level === 'medium') seen.mediumDiv++;
          if (q.answer === '÷' && level === 'hard') seen.hardDiv++;
          continue;
        }

        if (op === '÷') {
          assert.notEqual(level, 'easy', q.text);
          if (level === 'medium') seen.mediumDiv++;
          if (level === 'hard') seen.hardDiv++;
        }
        for (const c of q.cards) {
          assert.ok(NUMBER.test(c), `number card: ${c} in ${q.text}`);
          assert.ok(Number(c) <= 9999, c);
        }
        const blankLeft = x === '_';
        const filled = Number(q.answer);
        const [lhs, rhs] = blankLeft ? [filled, Number(y)] : [Number(x), filled];
        assert.ok(holds(lhs, op, rhs, z), `${q.text} with ${q.answer}`);
        const shown = blankLeft ? Number(y) : Number(x);
        for (const c of q.cards) {
          if (c === q.answer) continue;
          const wrongTrue = blankLeft ? holds(Number(c), op, Number(y), z) : holds(Number(x), op, Number(c), z);
          assert.ok(!wrongTrue, `wrong card is wrong: ${c} in ${q.text}`);
          assert.ok(explainable(Number(c), op, blankLeft, filled, shown, z), `unexplained card ${c} in ${q.text}`);
        }
      }
    }
  }
  assert.ok(seen.easyOpBlank > 0, 'easy has operator blanks');
  assert.ok(seen.mediumOpBlank > 0 && seen.hardOpBlank > 0, 'medium and hard have operator blanks');
  assert.ok(seen.mediumDiv > 0 && seen.hardDiv > 0, 'medium and hard use ÷');
  assert.notDeepEqual(speedQuestions('a', 'easy'), speedQuestions('b', 'easy'));
});

test('tiers: easy 4 / 6 / 9, medium and hard 5 / 8 / 12', () => {
  const none = { bonuses: 0, steps: false };
  const one = { bonuses: 1, steps: false };
  const two = { bonuses: 2, steps: false };
  const more = { bonuses: 2, steps: true };
  const cases = { easy: [4, 6, 9], medium: [5, 8, 12], hard: [5, 8, 12] } as const;
  for (const level of ['easy', 'medium', 'hard'] as const) {
    const [a, b, c] = cases[level];
    assert.deepEqual(speedReward(level, 0), none);
    assert.deepEqual(speedReward(level, a - 1), none);
    assert.deepEqual(speedReward(level, a), one);
    assert.deepEqual(speedReward(level, b - 1), one);
    assert.deepEqual(speedReward(level, b), two);
    assert.deepEqual(speedReward(level, c - 1), two);
    assert.deepEqual(speedReward(level, c), more);
    assert.deepEqual(speedReward(level, 40), more);
  }
});
