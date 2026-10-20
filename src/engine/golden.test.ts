import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { goldenHashes } from './golden.ts';

test('generated cases match the golden snapshot', () => {
  const expected: Record<string, string> = JSON.parse(readFileSync(new URL('./golden.json', import.meta.url), 'utf8'));
  const actual = goldenHashes();
  const changed = Object.keys(actual).filter((l) => l in expected && expected[l] !== actual[l]);
  const added = Object.keys(actual).filter((l) => !(l in expected));
  const missing = Object.keys(expected).filter((l) => !(l in actual));
  assert.ok(
    !changed.length && !added.length && !missing.length,
    `Generated cases changed.\n  differ: ${changed.join(', ') || 'none'}\n  new: ${added.join(', ') || 'none'}\n  missing: ${missing.join(', ') || 'none'}\n` +
      'If the change is unintended, fix the code. If intended, run `npm run update-golden` (and bump the storage prefix in src/game/storage.ts if saved progress would break).',
  );
});
