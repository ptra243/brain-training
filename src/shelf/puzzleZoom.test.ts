import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitFrame, FULL_FRAME } from './puzzleZoom.ts';

test('fits the paper to the rect: uniform scale, moved to the corner, cropped to the rect height', () => {
  const paper = { left: 0, top: 0, width: 360, height: 650 };
  const rect = { left: 20, top: 90, width: 324, height: 480 };
  const f = fitFrame(rect, paper);
  assert.equal(f.transform, 'translate(20px, 90px) scale(0.9)');
  // 480 / 0.9 = 533.333 visible paper pixels, so 116.667 are cropped.
  assert.equal(f.clipPath, 'inset(0px 0px 116.667px 0px)');
});

test('a paper centred on a wide screen moves from its own left, not the screen edge', () => {
  const paper = { left: 60, top: 0, width: 480, height: 800 };
  const rect = { left: 100, top: 50, width: 240, height: 400 };
  assert.equal(fitFrame(rect, paper).transform, 'translate(40px, 50px) scale(0.5)');
});

test('never crops a negative amount when the rect is taller than the scaled paper', () => {
  const f = fitFrame({ left: 0, top: 0, width: 180, height: 900 }, { left: 0, top: 0, width: 360, height: 650 });
  assert.equal(f.clipPath, 'inset(0px 0px 0px 0px)');
});

test('the full frame uses the same functions so the two interpolate', () => {
  assert.match(FULL_FRAME.transform, /^translate\(.*\) scale\(/);
  assert.match(FULL_FRAME.clipPath, /^inset\(/);
});
