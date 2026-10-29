import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitScale, MIN_SCALE } from './fitScale.ts';

test('nothing changes when the page already fits', () => {
  assert.equal(fitScale(780, 140, 560), 1);
  assert.equal(fitScale(700, 140, 560), 1);
});

test('scales the bookcase just enough', () => {
  assert.equal(fitScale(650, 140, 560), 510 / 560);
  assert.ok(fitScale(650, 140, 560) < 1);
});

test('never goes below the floor', () => {
  assert.equal(fitScale(400, 140, 560), MIN_SCALE);
  assert.equal(fitScale(400, 140, 560, 0.4), 260 / 560);
});

test('bad measurements leave it alone', () => {
  assert.equal(fitScale(0, 140, 560), 1);
  assert.equal(fitScale(650, 140, 0), 1);
  assert.equal(fitScale(NaN, 140, 560), 1);
});
