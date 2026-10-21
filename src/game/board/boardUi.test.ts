import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardInitial } from './boardSave.ts';
import { boardUiReducer, initialBoardUi, type BoardUi } from './boardUi.ts';

const saveWith = (n: number) => ({ ...boardInitial(), hintCount: n });

test('pushUndo keeps the newest 60 and drops the oldest', () => {
  let s: BoardUi = initialBoardUi;
  for (let i = 0; i < 65; i++) s = boardUiReducer(s, { type: 'pushUndo', save: saveWith(i) });
  assert.equal(s.undo.length, 60);
  assert.equal(s.undo[0].hintCount, 5);
  assert.equal(s.undo[59].hintCount, 64);
});

test('popUndo removes the top, and on empty is a no-op', () => {
  let s = boardUiReducer(initialBoardUi, { type: 'pushUndo', save: saveWith(1) });
  s = boardUiReducer(s, { type: 'pushUndo', save: saveWith(2) });
  s = boardUiReducer(s, { type: 'popUndo' });
  assert.deepEqual(s.undo.map((x) => x.hintCount), [1]);
  s = boardUiReducer(s, { type: 'popUndo' });
  assert.equal(s.undo.length, 0);
  assert.equal(boardUiReducer(s, { type: 'popUndo' }), s);
});

test('say sets and clears the toast', () => {
  const s = boardUiReducer(initialBoardUi, { type: 'say', toast: { kind: 'good', text: 'Hi' } });
  assert.deepEqual(s.toast, { kind: 'good', text: 'Hi' });
  assert.equal(boardUiReducer(s, { type: 'say', toast: null }).toast, null);
});

test('flag replaces the set, unflag removes one, clearFlags empties it', () => {
  let s = boardUiReducer(initialBoardUi, { type: 'flag', ids: ['a', 'b'] });
  assert.deepEqual([...s.flagged].sort(), ['a', 'b']);
  s = boardUiReducer(s, { type: 'flag', ids: ['c'] });
  assert.deepEqual([...s.flagged], ['c']);
  s = boardUiReducer(s, { type: 'flag', ids: ['a', 'b'] });
  s = boardUiReducer(s, { type: 'unflag', pid: 'a' });
  assert.deepEqual([...s.flagged], ['b']);
  s = boardUiReducer(s, { type: 'clearFlags' });
  assert.equal(s.flagged.size, 0);
});

test('the reducer never mutates the state it is given', () => {
  const s0 = boardUiReducer(boardUiReducer(initialBoardUi, { type: 'pushUndo', save: saveWith(1) }), { type: 'flag', ids: ['a', 'b'] });
  const undo = s0.undo;
  const flagged = s0.flagged;
  boardUiReducer(s0, { type: 'pushUndo', save: saveWith(2) });
  boardUiReducer(s0, { type: 'popUndo' });
  boardUiReducer(s0, { type: 'unflag', pid: 'a' });
  boardUiReducer(s0, { type: 'clearFlags' });
  boardUiReducer(s0, { type: 'say', toast: null });
  assert.equal(s0.undo, undo);
  assert.equal(s0.undo.length, 1);
  assert.equal(s0.flagged, flagged);
  assert.deepEqual([...s0.flagged].sort(), ['a', 'b']);
  assert.equal(initialBoardUi.undo.length, 0);
  assert.equal(initialBoardUi.flagged.size, 0);
});
