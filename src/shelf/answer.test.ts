import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blanksFilled, canSubmit, emptyBlanks, resultLine, triesList } from './answer.ts';

test('wrong tries are crossed out, the right one is not', () => {
  const tries = triesList({
    accusations: [
      { suspect: 'a', item: 'x', correct: 1 },
      { suspect: 'b', item: 'y', correct: 0 },
      { suspect: 'c', item: 'z', correct: 2 },
    ],
  });
  assert.deepEqual(tries.map((t) => t.crossed), [true, true, false]);
  assert.equal(triesList({ accusations: [] }).length, 0);
});

test('a line can be handed in only with both blanks written', () => {
  assert.equal(blanksFilled(emptyBlanks), 0);
  assert.equal(canSubmit({ suspect: 'a', item: '' }, false), false);
  assert.equal(canSubmit({ suspect: 'a', item: 'x' }, false), true);
  assert.equal(canSubmit({ suspect: 'a', item: 'x' }, true), false);
});

test('the result slip counts parts but never says which', () => {
  assert.equal(resultLine(undefined), '');
  assert.equal(resultLine({ correct: 0 }), 'Neither of those was right.');
  assert.equal(resultLine({ correct: 1 }), '1 of 2 right. Keep digging.');
});
