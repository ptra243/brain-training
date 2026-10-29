import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KIND_COLOUR, labelAngle, labelName, starsText } from './labels.ts';

test('stars follow the level, none without one', () => {
  assert.equal(starsText('easy'), '★☆☆');
  assert.equal(starsText('medium'), '★★☆');
  assert.equal(starsText('hard'), '★★★');
  assert.equal(starsText(undefined), '');
});

test('the angle is within two degrees and stable', () => {
  for (const ref of ['K7QF2', 'case-6-easy', 'ABCDE-MN', '']) {
    for (const key of ['wordle', 'sudoku', 'finale', 'x']) {
      const a = labelAngle(ref, key);
      assert.ok(a >= -2 && a <= 2, `${a}`);
      assert.equal(labelAngle(ref, key), a);
    }
  }
});

test('angles differ between games and a salt re-rolls them', () => {
  const kinds = ['wordle', 'crossword', 'wordsearch', 'cats', 'sudoku', 'board'];
  assert.ok(new Set(kinds.map((k) => labelAngle('K7QF2', k))).size > 2);
  assert.ok(kinds.some((k) => labelAngle('K7QF2', k) !== labelAngle('K7QF2', k, '-1')));
});

test('colours by kind and the finale name', () => {
  assert.equal(KIND_COLOUR.words, '#34436a');
  assert.equal(KIND_COLOUR.logic, '#4f7a54');
  assert.equal(KIND_COLOUR.people, '#7b5a78');
  assert.equal(KIND_COLOUR.final, '#b8902f');
  assert.equal(labelName('final', 'Final questioning'), 'Final puzzle');
  assert.equal(labelName('words', 'Wordle'), 'Wordle');
});
