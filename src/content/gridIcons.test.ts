import { test } from 'node:test';
import assert from 'node:assert/strict';
import { items } from './index.ts';
import { itemIcons } from './gridIcons.ts';

test('every object has its own icon', () => {
  const seen = new Set<string>();
  for (const item of items) {
    const icon = itemIcons[item.id];
    assert.ok(icon && icon.paths.length > 0, item.id);
    seen.add(icon.paths.join('|'));
  }
  assert.equal(seen.size, items.length);
});
