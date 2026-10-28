import assert from 'node:assert/strict';
import { test } from 'node:test';
import { content } from '../content/index.ts';
import { newPlayCase } from '../engine/caseRef.ts';
import { emptyProgress, reduce, visibleClues } from '../game/state.ts';
import { DEFAULT_TAB, parseTab, peekLine, placementLine, subjectClues, subjectTitle } from './notebook.ts';

const { c } = newPlayCase(content, () => 0.5);

test('the peek line counts unused found clues', () => {
  let p = emptyProgress();
  assert.equal(peekLine(c, p), 'Notebook · no clues yet');
  p = reduce(c, p, { type: 'game-finish', kind: c.games[0].kind, status: 'won', data: null });
  const n = visibleClues(c, p).length;
  assert.ok(n > 0);
  assert.equal(peekLine(c, p), `Notebook · ${n} of ${n} to use`);
  p = reduce(c, p, { type: 'toggle-used', clue: visibleClues(c, p)[0].id });
  assert.equal(peekLine(c, p), n === 1 ? 'Notebook · all clues used' : `Notebook · ${n - 1} of ${n} to use`);
});

test('a saved tab that is not ours falls back to Clues', () => {
  assert.equal(parseTab('grid'), 'grid');
  assert.equal(parseTab('map'), DEFAULT_TAB);
  assert.equal(parseTab(null), DEFAULT_TAB);
});

test('a subject page lists only found clues that name it', () => {
  const p = emptyProgress();
  const s = { kind: 'suspect' as const, id: c.suspects[0] };
  assert.deepEqual(subjectClues(c, p, s), []);
  const done = reduce(c, p, { type: 'game-finish', kind: c.games[0].kind, status: 'won', data: null });
  for (const clue of subjectClues(c, done, s)) assert.ok(visibleClues(c, done).includes(clue));
  assert.ok(subjectTitle(c, s).length > 0);
  assert.match(subjectTitle(c, { kind: 'item', id: c.items[0] }), /^The /);
});

test('placement says where she put a guest or weapon', () => {
  let p = emptyProgress();
  const guest = { kind: 'suspect' as const, id: c.suspects[0] };
  const weapon = { kind: 'item' as const, id: c.items[0] };
  assert.equal(placementLine(c, p, guest), 'Not placed yet');
  assert.equal(placementLine(c, p, weapon), 'Not placed yet');
  p = reduce(c, p, { type: 'place', suspect: guest.id, room: c.rooms[0] });
  assert.match(placementLine(c, p, guest), /^You've placed them in the /);
  p = reduce(c, p, { type: 'place-item', item: weapon.id, room: c.rooms[1] });
  assert.match(placementLine(c, p, weapon), /^You've put it in the /);
});
