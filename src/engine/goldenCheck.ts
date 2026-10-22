// Shared body of golden.test.ts, golden-2.test.ts and golden-3.test.ts: each checks a third of the labels,
// so node runs them on separate workers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { goldenHashes, goldenLabels } from './golden.ts';

const PARTS = 3;

export function goldenPartTest(index: number) {
  const expectedAll = (): Record<string, string> => JSON.parse(readFileSync(new URL('./golden.json', import.meta.url), 'utf8'));
  const mine = (label: string) => goldenLabels({ index, of: PARTS }).includes(label);

  test(`generated cases match the golden snapshot (part ${index + 1} of ${PARTS})`, () => {
    const expected = expectedAll();
    const actual = goldenHashes({ index, of: PARTS });
    const changed = Object.keys(actual).filter((l) => l in expected && expected[l] !== actual[l]);
    const added = Object.keys(actual).filter((l) => !(l in expected));
    const missing = Object.keys(expected).filter((l) => mine(l) && !(l in actual));
    assert.ok(
      !changed.length && !added.length && !missing.length,
      `Generated cases changed.\n  differ: ${changed.join(', ') || 'none'}\n  new: ${added.join(', ') || 'none'}\n  missing: ${missing.join(', ') || 'none'}\n` +
        'If the change is unintended, fix the code. If intended, run `npm run update-golden` (and bump the storage prefix in src/game/storage.ts if saved progress would break).',
    );
  });

  if (index === 0) {
    // Cheap: nothing is built. Labels that belong to no part's check would otherwise slip through.
    test('the golden snapshot lists exactly the golden refs', () => {
      const all = goldenLabels();
      const keys = Object.keys(expectedAll()).sort();
      assert.deepEqual(keys, all, 'golden.json and goldenRefs() list different labels; run `npm run update-golden` if intended');
    });
  }
}
