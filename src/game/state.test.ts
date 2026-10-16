import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { generateCase } from '../engine/generate.ts';
import { cellState, emptyProgress, heldItem, markKey, placedRoom, reduce, type Action, type Progress } from './state.ts';

const c = generateCase(content, 5);
const [s1, s2] = c.suspects;
const [r1, r2] = c.rooms;
const run = (...actions: Action[]) => actions.reduce<Progress>((p, a) => reduce(c, p, a), emptyProgress());

test('tapping a cell cycles blank, cross, tick, blank', () => {
  const tap: Action = { type: 'cycle', kind: 'suspect-room', row: s1, col: r1 };
  const key = markKey('suspect-room', s1, r1);
  assert.equal(run(tap).marks[key], 'x');
  assert.equal(run(tap, tap).marks[key], 'o');
  assert.equal(run(tap, tap, tap).marks[key], undefined);
});

test('a tick crosses the rest of its row and column without storing those crosses', () => {
  const p = run({ type: 'place', suspect: s1, room: r1 });
  assert.equal(cellState(c, p, 'suspect-room', s1, r2), 'auto-x');
  assert.equal(cellState(c, p, 'suspect-room', s2, r1), 'auto-x');
  assert.equal(cellState(c, p, 'suspect-room', s2, r2), null);
  assert.equal(Object.keys(p.marks).length, 1);
});

test('placing a token on the map ticks the grid, and moving it moves the tick', () => {
  let p = run({ type: 'place', suspect: s1, room: r1 });
  assert.equal(placedRoom(c, p, s1), r1);
  p = reduce(c, p, { type: 'place', suspect: s1, room: r2 });
  assert.equal(placedRoom(c, p, s1), r2);
  assert.equal(p.marks[markKey('suspect-room', s1, r1)], undefined);
  p = reduce(c, p, { type: 'place', suspect: s1, room: null });
  assert.equal(placedRoom(c, p, s1), null);
});

test('two suspects cannot both be ticked into the same room', () => {
  const p = run({ type: 'place', suspect: s1, room: r1 }, { type: 'place', suspect: s2, room: r1 });
  assert.equal(placedRoom(c, p, s1), null);
  assert.equal(placedRoom(c, p, s2), r1);
});

test('placing a token over her own cross replaces it with a tick, other crosses stay', () => {
  const p = run(
    { type: 'cycle', kind: 'suspect-room', row: s1, col: r1 },
    { type: 'cycle', kind: 'suspect-room', row: s1, col: r2 },
    { type: 'place', suspect: s1, room: r1 },
  );
  assert.equal(p.marks[markKey('suspect-room', s1, r1)], 'o');
  assert.equal(p.marks[markKey('suspect-room', s1, r2)], 'x');
});

test('held item comes from the suspect×item grid', () => {
  const item = c.items[0];
  const p = run(
    { type: 'cycle', kind: 'suspect-item', row: s1, col: item },
    { type: 'cycle', kind: 'suspect-item', row: s1, col: item },
  );
  assert.equal(heldItem(c, p, s1), item);
});

test('accusations count correct parts and only all three solves it', () => {
  const wrongSuspect = c.suspects.find((s) => s !== c.murderer)!;
  let p = run({ type: 'accuse', suspect: wrongSuspect, room: c.sceneRoom, item: c.weapon });
  assert.equal(p.accusations[0].correct, 2);
  assert.equal(p.solved, false);
  p = reduce(c, p, { type: 'accuse', suspect: c.murderer, room: c.sceneRoom, item: c.weapon });
  assert.equal(p.solved, true);
  assert.equal(p.accusations.length, 2);
});

test('struck-through clues toggle', () => {
  const id = c.clues[0].id;
  assert.deepEqual(run({ type: 'toggle-used', clue: id }).used, [id]);
  assert.deepEqual(run({ type: 'toggle-used', clue: id }, { type: 'toggle-used', clue: id }).used, []);
});
