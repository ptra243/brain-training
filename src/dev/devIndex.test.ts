import assert from 'node:assert/strict';
import { test } from 'node:test';
import { devSections } from './devIndex.ts';
import { DEV_PAGES } from './previews.ts';
import { SCENARIOS } from './scenarios.ts';

test('every dev page and scenario lands in exactly one section', () => {
  const rows = devSections('').flatMap((s) => s.rows.map((r) => r.href));
  assert.equal(rows.length, DEV_PAGES.length + SCENARIOS.length);
  assert.equal(new Set(rows).size, rows.length);
  for (const p of DEV_PAGES) assert.ok(rows.includes(`#dev/${p.id}`), p.id);
  for (const s of SCENARIOS) assert.ok(rows.includes(`#dev/load/${s.id}`), s.id);
});

test('sections come in the agreed order', () => {
  assert.deepEqual(
    devSections('').map((s) => s.title),
    [
      'Tools',
      'Load a game state',
      'Classic: opening',
      'Classic: a round',
      'Classic: accusing and endings',
      'Classic: puzzles and houses',
      'Shelf: case book',
      'Shelf: notebook',
      'Shelf: campaign book',
      'Shelf: shelf and extras',
    ],
  );
  assert.deepEqual(devSections('')[0].rows.map((r) => r.id), ['cases', 'motives', 'portraits', 'dogfight']);
});

test('the filter matches the id or the text, ignoring case and spaces round it', () => {
  const byId = devSections('  SHELF-TIN ');
  assert.deepEqual(byId.flatMap((s) => s.rows.map((r) => r.id)), ['shelf-tin']);
  const text = DEV_PAGES.find((p) => p.id === 'escaped')!.about;
  const byAbout = devSections(text.slice(4, 20).toUpperCase());
  assert.ok(byAbout.some((s) => s.rows.some((r) => r.id === 'escaped')));
  assert.ok(byAbout.every((s) => s.rows.length > 0));
});

test('a filter with no match gives no sections', () => {
  assert.deepEqual(devSections('zzz-no-such-page'), []);
});
