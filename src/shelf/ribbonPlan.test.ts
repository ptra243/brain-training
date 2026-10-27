import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOTION, SECTIONS, dropOrder, flickCount, tuckStep, turnDirection } from './ribbonPlan.ts';

test('sections run in book order', () => {
  assert.deepEqual([...SECTIONS], ['Case', 'Map', 'Puzzles', 'Answer']);
});

test('turn direction follows book order', () => {
  assert.equal(turnDirection(0, 2), 'forward');
  assert.equal(turnDirection(3, 1), 'back');
  assert.equal(turnDirection(1, 1), 'stay');
});

test('blank leaves flick only when skipping a section', () => {
  assert.equal(flickCount(0, 1, MOTION.flicks), 0);
  assert.equal(flickCount(2, 1, MOTION.flicks), 0);
  assert.equal(flickCount(0, 2, MOTION.flicks), 2);
  assert.equal(flickCount(3, 0, MOTION.flicks), 2);
  assert.equal(flickCount(0, 0, MOTION.flicks), 0);
});

test('the current ribbon leaves a gap in the drop order', () => {
  assert.deepEqual(dropOrder(4, 0), [1, 2, 3]);
  assert.deepEqual(dropOrder(4, 2), [0, 1, 3]);
  assert.deepEqual(dropOrder(4, 3), [0, 1, 2]);
});

test('tucking starts from the last ribbon', () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => tuckStep(4, i)), [3, 2, 1, 0]);
});
