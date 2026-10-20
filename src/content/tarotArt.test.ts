import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAROT_JOKER_ART, tarotArt } from './tarotArt.ts';

const ids = [
  ...Array.from({ length: 22 }, (_, i) => `major-${i}`),
  ...['cups', 'wands', 'swords', 'pentacles'].flatMap((s) => Array.from({ length: 14 }, (_, i) => `${s}-${i + 1}`)),
];

test('every card id the engine can deal has its own face', () => {
  const seen = new Set<string>();
  for (const id of ids) {
    const a = tarotArt(id);
    assert.notEqual(a.label, 'unknown card', id);
    seen.add(`${a.path}|${a.colour}`);
  }
  assert.equal(seen.size, ids.length);
  assert.ok(!seen.has(`${TAROT_JOKER_ART.path}|${TAROT_JOKER_ART.colour}`));
});

test('unknown ids get a plain fallback', () => {
  assert.equal(tarotArt('nonsense').label, 'unknown card');
  assert.equal(tarotArt('cups-15').label, 'unknown card');
});
