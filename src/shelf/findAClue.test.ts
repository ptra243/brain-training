import assert from 'node:assert/strict';
import { test } from 'node:test';
import { content } from '../content/index.ts';
import { storyLines } from '../content/storyLines.ts';
import { generateCase } from '../engine/generate.ts';
import type { GameKind } from '../engine/types.ts';
import { emptyProgress } from '../game/state.ts';
import { addedGames, clueRows, hideLabel, openingText, pageNumbers, rowAriaLabel, rowStateText, storyFor, visibleRows } from './findAClue.ts';

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

test('row status, hints and the words under the story', () => {
  const c = generateCase(content, 1, 'medium');
  const p = emptyProgress();
  const [a, b] = c.games;
  p.games[a.kind] = { status: 'won', data: { hints: 2, hintCount: 5 } } as never;
  p.games[b.kind] = { status: 'revealed', data: { hints: 3 } } as never;
  const rows = clueRows(c, p, 'case-1');
  assert.equal(rows[0].status, 'won');
  assert.equal(rows[1].status, 'revealed');
  assert.equal(rows[2].status, undefined);
  assert.equal(rows[2].hints, 0);
  assert.equal(rows[0].hints, a.kind === 'board' ? 5 : ['cats', 'crossword', 'sudoku', 'tarot', 'nosing'].includes(a.kind) ? 2 : 0);
  const base = { status: 'won' as const, hints: 0, clues: 2, locked: false };
  assert.equal(rowStateText(base), '2 clues found');
  assert.equal(rowStateText({ ...base, clues: 1 }), '1 clue found');
  assert.equal(rowStateText({ ...base, clues: 0 }), 'No new clues');
  assert.equal(rowStateText({ ...base, clues: 0, hints: 1 }), 'No new clues · 1 hint');
  assert.equal(rowStateText({ ...base, clues: 0, status: 'revealed' }), 'The cat solved it · no new clues');
  assert.equal(rowStateText({ ...base, hints: 1 }), '2 clues found · 1 hint');
  assert.equal(rowStateText({ ...base, hints: 2 }), '2 clues found · 2 hints');
  assert.equal(rowStateText({ ...base, status: 'revealed', hints: 4 }), 'The cat solved it · 2 clues');
  assert.equal(rowStateText({ ...base, status: undefined }), null);
  assert.equal(rowStateText({ ...base, status: undefined, locked: true }), 'Opens when every other page is done');
  const row = { ...rows[0], page: 34, status: 'won' as const, hints: 2 };
  assert.equal(rowAriaLabel(row, 'Sudoku', 'Medium'), 'Sudoku, medium, page 34, won, 2 hints');
  assert.equal(rowAriaLabel({ ...row, status: undefined, hints: 0 }, 'Sudoku', 'Hard'), 'Sudoku, hard, page 34');
  assert.equal(rowAriaLabel({ ...row, status: 'revealed' }, 'Sudoku', undefined), 'Sudoku, page 34, solved by the cat');
});

test('addedGames: only a picked case has games she did not pick', () => {
  const games = [{ kind: 'wordle' as const }, { kind: 'cats' as const }, { kind: 'sudoku' as const }];
  assert.deepEqual(addedGames(games, { mode: 'play', games: ['wordle', 'cats'] }), ['sudoku']);
  assert.deepEqual(addedGames(games, { mode: 'play', games: ['wordle', 'cats', 'sudoku'] }), []);
  assert.deepEqual(addedGames(games, { mode: 'play' }), []);
  assert.deepEqual(addedGames(games, { mode: 'quick' }), []);
  assert.deepEqual(addedGames(games, null), []);
});
