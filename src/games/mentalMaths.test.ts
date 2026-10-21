import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_KINDS, question, questionHint, type Level } from './mentalMaths.ts';

const levels: Level[] = ['easy', 'medium', 'hard'];

test('answers, working, choices and wording hold for 500 seeds per level and kind', () => {
  for (const level of levels) {
    for (const kind of LEVEL_KINDS[level]) {
      for (let i = 0; i < 500; i++) {
        const q = question(`s${i}`, level, kind);
        assert.equal(q.kind, kind);
        assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 9999, `${kind} answer ${q.answer}`);
        assert.ok(q.working.length >= 2 && q.working.length <= 3);
        const last = q.working[q.working.length - 1].match(/(\d+)$/);
        assert.equal(Number(last?.[1]), q.answer, `${kind} working ${q.working.join(' | ')}`);
        assert.equal(new Set(q.choices).size, 3);
        assert.ok(q.choices.includes(q.answer));
        assert.ok(q.choices.every((c) => Number.isInteger(c) && c >= 0 && c <= 9999));
        assert.ok(!/[{}]/.test(q.text) && !q.text.includes('undefined') && !q.text.includes('NaN'), q.text);
        assert.deepEqual(question(`s${i}`, level, kind), q);
      }
    }
  }
});

test('without a kind, the level decides and every kind turns up', () => {
  for (const level of levels) {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(question(`k${i}`, level).kind);
    assert.deepEqual([...seen].sort(), [...LEVEL_KINDS[level]].sort());
  }
});

test('hints go working, choices, answer', () => {
  const q = question('h', 'medium');
  assert.equal(questionHint(q, 0), q.working[0]);
  assert.equal(questionHint(q, 1), q.choices.join(', '));
  assert.equal(questionHint(q, 2), String(q.answer));
});
