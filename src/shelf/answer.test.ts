import assert from 'node:assert/strict';
import { test } from 'node:test';
import { content } from '../content/index.ts';
import { newPlayCase } from '../engine/caseRef.ts';
import { emptyProgress, mentions, reduce, visibleClues } from '../game/state.ts';
import { blanksFilled, canSubmit, emptyBlanks, rankFor, resultLine, rightNowLine, shelfCite, triesList } from './answer.ts';

test('rank comes from the number of accusations only', () => {
  assert.deepEqual([1, 2, 3, 4, 9].map(rankFor), ['Master detective', 'Sharp eye', 'Good nose', 'Dogged', 'Dogged']);
  assert.equal(rightNowLine(0), 'Right now: Master detective');
  assert.equal(rightNowLine(1), 'Right now: Sharp eye');
  assert.equal(rightNowLine(5), 'Right now: Dogged');
});

test('the night replay cite never says she worked it out', () => {
  const { c } = newPlayCase(content, () => 0.5);
  const none = emptyProgress();
  const guest = c.suspects[0];
  assert.equal(shelfCite(c, none, { guest, clueText: null }), 'You never found this out.');
  assert.equal(shelfCite(c, none, { guest, clueText: 'X is in the hall.' }), 'You knew this: X is in the hall.');
  let p = none;
  for (const g of c.games) p = reduce(c, p, { type: 'game-finish', kind: g.kind, status: 'won', data: null });
  const named = c.suspects.map((s) => ({ s, clue: visibleClues(c, p).find((cl) => mentions(cl, { kind: 'suspect', id: s })) })).find((x) => x.clue);
  assert.ok(named?.clue);
  assert.equal(shelfCite(c, p, { guest: named.s, clueText: null }), `Your clue: ${named.clue.text}`);
});

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
