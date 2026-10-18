import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { generateCase } from '../engine/generate.ts';
import type { Case, Clue } from '../engine/types.ts';
import { afterHint, allCells, gridHint, markActions, newlyWrong, settledSquares, truth, type GridHintState } from './gridHints.ts';
import { cellState, emptyProgress, markKey, reduce, visibleClues, type Progress } from './state.ts';

/** Take hints until the grid is done, checking each one on the way. */
function followHints(c: Case, clues: readonly Clue[], start: Progress = emptyProgress()) {
  let p = start;
  let state: GridHintState = {};
  for (let asks = 0; asks < 400; asks++) {
    const h = gridHint(c, p, clues, state);
    if (h.kind === 'done' || h.kind === 'more-clues') return { p, last: h.kind, asks };
    if (h.kind === 'nudge' || h.kind === 'why') {
      assert.equal(h.value, truth(c, h.cell), 'only ever points at the right mark');
      assert.equal(cellState(c, p, h.cell.kind, h.cell.row, h.cell.col), null, 'only at a blank square');
      if (h.reason.type === 'clues') for (const id of h.reason.clues) assert.ok(clues.some((cl) => cl.id === id), 'only clues she has');
    }
    if (h.kind === 'fill') for (const a of markActions(h.cell, h.value)) p = reduce(c, p, a);
    state = afterHint(state, h);
  }
  assert.fail('hints went round in circles');
}

test('grid hints with every clue lead to a full, right grid', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    for (const n of [1, 2]) {
      const c = generateCase(content, n, difficulty);
      const { p, last } = followHints(c, c.clues);
      assert.equal(last, 'done', `${difficulty} case ${n}`);
      for (const cell of allCells(c)) {
        const shown = cellState(c, p, cell.kind, cell.row, cell.col);
        assert.equal(shown === 'o' ? 'o' : 'x', truth(c, cell), `${difficulty} case ${n}: ${markKey(cell.kind, cell.row, cell.col)}`);
      }
    }
  }
});

test('grid hints work with 7 guests sharing rooms', () => {
  const c = generateCase(content, 2, { suspects: 7, logic: 'easy', minigames: 'easy', length: 'normal' });
  const { last } = followHints(c, c.clues);
  assert.equal(last, 'done');
});

test('with only the free clues, hints stop and ask for more clues', () => {
  const c = generateCase(content, 3, 'medium');
  const free = visibleClues(c, emptyProgress());
  assert.ok(free.length < c.clues.length);
  const { last } = followHints(c, free);
  assert.equal(last, 'more-clues');
});

test('wrong marks are pointed out first, once, and stay out of the reasoning', () => {
  const c = generateCase(content, 4, 'easy');
  const [s] = c.suspects;
  const wrongRoom = c.rooms.find((r) => truth(c, { kind: 'suspect-room', row: s, col: r }) === 'x')!;
  let p = reduce(c, emptyProgress(), { type: 'place', suspect: s, room: wrongRoom });
  const key = markKey('suspect-room', s, wrongRoom);

  const h = gridHint(c, p, c.clues);
  assert.deepEqual(h, { kind: 'wrong', marks: { [key]: 'o' } });
  const state = afterHint({}, h);
  assert.deepEqual(newlyWrong(c, p, state.flagged), {});
  assert.notEqual(gridHint(c, p, c.clues, state).kind, 'wrong');
  // A wrong mark she left there doesn't lead hints astray.
  for (const s2 of settledSquares(c, p, c.clues)) assert.equal(s2.value, truth(c, s2.cell));
  // Changing it to another wrong mark is new.
  p = reduce(c, p, { type: 'cycle', kind: 'suspect-room', row: s, col: wrongRoom });
  p = reduce(c, p, { type: 'cycle', kind: 'suspect-room', row: s, col: wrongRoom });
  assert.equal(p.marks[key], 'x');
  assert.deepEqual(newlyWrong(c, p, state.flagged), {}, 'a cross there is right');
});

test('while clues are still to find, the cat points the way but never fills a square', () => {
  const c = generateCase(content, 6, 'easy');
  const p = emptyProgress();
  let state: GridHintState = {};
  const kinds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const h = gridHint(c, p, c.clues, state, false);
    kinds.push(h.kind);
    state = afterHint(state, h);
  }
  assert.deepEqual(kinds, ['nudge', 'why', 'why', 'why', 'why']);
  const again = gridHint(c, p, c.clues, state, false);
  assert.ok(again.kind === 'why' && again.again);
});

test('each square goes nudge, why, then fill', () => {
  const c = generateCase(content, 6, 'easy');
  const p = emptyProgress();
  const h1 = gridHint(c, p, c.clues);
  assert.equal(h1.kind, 'nudge');
  const s1 = afterHint({}, h1);
  const h2 = gridHint(c, p, c.clues, s1);
  assert.equal(h2.kind, 'why');
  const h3 = gridHint(c, p, c.clues, afterHint(s1, h2));
  assert.equal(h3.kind, 'fill');
  if (h1.kind === 'nudge' && h3.kind === 'fill') assert.deepEqual(h3.cell, h1.cell);
  assert.equal(afterHint(afterHint(s1, h2), h3).count, 3);
});
