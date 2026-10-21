import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPEED_SECONDS, speedQuestions, speedReward } from './speedRound.ts';

test('the round is 60 seconds and 40 sums, deterministic, with whole answers', () => {
  assert.equal(SPEED_SECONDS, 60);
  for (const level of ['easy', 'medium', 'hard'] as const) {
    for (let i = 0; i < 100; i++) {
      const qs = speedQuestions(`r${i}`, level);
      assert.equal(qs.length, 40);
      assert.deepEqual(qs, speedQuestions(`r${i}`, level));
      for (const q of qs) {
        assert.ok(Number.isInteger(q.answer) && q.answer > 0 && q.answer <= 9999, q.text);
        assert.ok(!/[{}]|undefined|NaN/.test(q.text));
      }
    }
  }
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
