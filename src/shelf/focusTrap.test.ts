import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFocus } from './focusTrap.ts';

test('Tab moves on and wraps from the last to the first', () => {
  assert.equal(nextFocus(0, 3, false), 1);
  assert.equal(nextFocus(2, 3, false), 0);
});
test('Shift+Tab moves back and wraps from the first to the last', () => {
  assert.equal(nextFocus(2, 3, true), 1);
  assert.equal(nextFocus(0, 3, true), 2);
});
test('focus outside the layer is pulled in; nothing focusable gives -1', () => {
  assert.equal(nextFocus(-1, 3, false), 0);
  assert.equal(nextFocus(-1, 3, true), 2);
  assert.equal(nextFocus(0, 0, false), -1);
});
