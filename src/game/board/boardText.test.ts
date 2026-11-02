import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content, houseDetails } from '../../content/index.ts';
import { houseById } from '../../content/houses.ts';
import { boardLevel, boardPuzzle } from '../../engine/caseBoard.ts';
import { caseFor } from '../../engine/caseRef.ts';
import { UNKNOWN } from '../../engine/boardTypes.ts';
import { makeRules } from './boardSave.ts';
import { pieceName, rulesOf } from './boardText.ts';

test('loose Noticed pieces name their room, or "somewhere", and say where they go', () => {
  const c = caseFor(content, { mode: 'play', code: 'BKVNS', games: ['wordsearch', 'cats', 'sudoku', 'interrogation', 'board', 'tarot'] } as never);
  const g = c.games.find((x) => x.kind === 'board')!;
  const level = boardLevel(c.levels);
  const board = boardPuzzle({ ...content, house: houseById(c.houseId!) }, c, g, level)!;
  const loose = board.pieces.filter((p) => p.loose);
  const rules = makeRules(board, level, false, c.guests);
  rules.labels = { noticed: Object.fromEntries(loose.map((p, i) => [p.id, houseDetails[i]])), hunchFor: {} };
  assert.ok(loose.some((p) => p.marks.only) && loose.some((p) => !p.marks.only), 'a room group and an Unknown group');
  for (const p of loose) {
    const name = pieceName(rules, p.id);
    const lines = rulesOf(rules, p.id, false);
    if (p.marks.only) {
      assert.match(name, /^Noticed in the \w[\w ]*: /);
      assert.match(lines[0], /^Something you noticed in the .+ it goes in the .+, touching the others you noticed there\.$/);
    } else {
      assert.match(name, /^Noticed somewhere: /);
      assert.match(lines[0], /goes in Unknown, touching the others like it\.$/);
    }
    assert.ok(lines.length > 1 && lines.slice(1).every((l) => /^Its .+ has to touch the .+ on “.+”\.$/.test(l)));
    assert.ok(!lines.join(' ').includes('never moves'));
  }
  assert.ok(!loose.some((p) => p.marks.only?.includes(UNKNOWN)));
});

test('house details read after "Noticed in the <room>:" and are unique', () => {
  assert.ok(houseDetails.length >= 25);
  assert.equal(new Set(houseDetails).size, houseDetails.length);
});
