import assert from 'node:assert/strict';
import { test } from 'node:test';
import { content } from '../content/index.ts';
import { storyLines } from '../content/storyLines.ts';
import { generateCase } from '../engine/generate.ts';
import type { GameKind } from '../engine/types.ts';
import { emptyProgress } from '../game/state.ts';
import { clueRows, hideLabel, openingText, pageNumbers, storyFor, visibleRows } from './findAClue.ts';

const KINDS: GameKind[] = ['wordle', 'crossword', 'wordsearch', 'cats', 'sudoku', 'interrogation', 'board', 'tarot', 'nosing', 'finale'];

test('page numbers are 10 to 99 and distinct, and stable', () => {
  for (const ref of ['K7QF2', 'ABCDE-MN', 'ZZZZZ+WCK', 'x', '']) {
    const pages = pageNumbers(ref, KINDS);
    const all = Object.values(pages);
    assert.equal(new Set(all).size, KINDS.length);
    for (const p of all) assert.ok(p >= 10 && p <= 99, `${p}`);
    assert.deepEqual(pageNumbers(ref, KINDS), pages);
  }
});

test('a story line is one of the game three, the same each time', () => {
  for (const kind of KINDS) {
    assert.equal(storyLines[kind].length, 3);
    const line = storyFor('K7QF2', kind);
    assert.ok(storyLines[kind].includes(line));
    assert.equal(storyFor('K7QF2', kind), line);
  }
});

test('rows follow the case, with finished and locked lines', () => {
  const c = generateCase(content, 1, 'medium');
  const p = emptyProgress();
  let rows = clueRows(c, p, 'case-1');
  assert.equal(rows.length, c.games.length);
  assert.equal(hideLabel(rows, false), null);
  assert.deepEqual(visibleRows(rows, true), rows);
  p.games[c.games[0].kind] = { status: 'won' } as never;
  rows = clueRows(c, p, 'case-1');
  assert.equal(rows[0].done, true);
  assert.equal(hideLabel(rows, false), 'Hide finished (1)');
  assert.equal(hideLabel(rows, true), 'Show finished (1)');
  assert.equal(visibleRows(rows, true).length, rows.length - 1);
  assert.equal(visibleRows(rows, false).length, rows.length);
  const finale = rows.find((r) => r.kind === 'finale');
  if (finale) assert.equal(finale.locked, true);
});

test('the opening is filled in', () => {
  const c = generateCase(content, 1, 'medium');
  assert.ok(!openingText(c).includes('{count}'));
});
