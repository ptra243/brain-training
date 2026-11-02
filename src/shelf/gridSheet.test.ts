import assert from 'node:assert/strict';
import { test } from 'node:test';
import { content } from '../content/index.ts';
import { newPlayCase } from '../engine/caseRef.ts';
import { emptyProgress, reduce, visibleClues } from '../game/state.ts';
import { sheetClues, sheetStrip, sheetSubjectName } from './gridSheet.ts';

const { c } = newPlayCase(content, () => 0.5);

test('the strip counts clues still to use, or says none are found', () => {
  let p = emptyProgress();
  assert.equal(sheetStrip(c, p, null), 'Clues · None found yet');
  p = reduce(c, p, { type: 'game-finish', kind: c.games[0].kind, status: 'won', data: null });
  const n = visibleClues(c, p).length;
  assert.ok(n > 0);
  assert.equal(sheetStrip(c, p, null), `Clues · ${n} of ${n} to use`);
  p = reduce(c, p, { type: 'toggle-used', clue: visibleClues(c, p)[0].id });
  assert.equal(sheetStrip(c, p, null), `Clues · ${n - 1} of ${n} to use`);
});

test('a filtered strip counts the clues about the subject, for a room too', () => {
  let p = emptyProgress();
  for (const g of c.games.slice(0, 3)) p = reduce(c, p, { type: 'game-finish', kind: g.kind, status: 'won', data: null });
  for (const s of [{ kind: 'room' as const, id: c.rooms[0] }, { kind: 'suspect' as const, id: c.suspects[0] }, { kind: 'item' as const, id: c.items[0] }]) {
    const shown = sheetClues(c, p, s);
    assert.equal(sheetStrip(c, p, s), `Clues · ${shown.length} about ${sheetSubjectName(c, s)}`);
    for (const clue of shown) assert.ok(visibleClues(c, p).includes(clue));
  }
  assert.match(sheetSubjectName(c, { kind: 'room', id: c.rooms[0] }), /^the /);
});
