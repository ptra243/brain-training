import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stepIndex, swipeDirection } from './swipe.ts';

test('a quick, long, mostly sideways move is a swipe', () => {
  assert.equal(swipeDirection(-80, 10, 200), 'left');
  assert.equal(swipeDirection(80, -10, 200), 'right');
  assert.equal(swipeDirection(60, 0, 599), 'right');
});

test('too short, too slow or too diagonal is not', () => {
  assert.equal(swipeDirection(59, 0, 100), null);
  assert.equal(swipeDirection(-80, 10, 600), null);
  assert.equal(swipeDirection(-80, 60, 200), null);
  assert.equal(swipeDirection(-90, 60, 200), null); // exactly 1.5x is not enough
  assert.equal(swipeDirection(-91, 60, 200), 'left');
  assert.equal(swipeDirection(0, 100, 200), null);
});

test('left is next, right is previous, and neither wraps', () => {
  assert.equal(stepIndex(0, 3, 'left'), 1);
  assert.equal(stepIndex(1, 3, 'right'), 0);
  assert.equal(stepIndex(0, 3, 'right'), null);
  assert.equal(stepIndex(2, 3, 'left'), null);
  assert.equal(stepIndex(-1, 3, 'left'), null);
});
