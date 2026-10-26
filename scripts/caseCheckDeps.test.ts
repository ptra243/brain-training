import assert from 'node:assert/strict';
import { test } from 'node:test';
import { caseCheckFiles, caseCheckNeeded } from './caseCheckDeps.ts';

test('closure covers the entry and engine, games, content and game imports', () => {
  const files = caseCheckFiles();
  for (const f of ['scripts/check-cases.ts', 'src/engine/generate.ts', 'src/games/tarot.ts', 'src/content/index.ts', 'src/game/talk.ts']) {
    assert.ok(files.has(f), f);
  }
});

test('UI and doc changes skip, dependency and package changes run', () => {
  assert.equal(caseCheckNeeded(['docs/next-sessions.md', 'src/game/ExploreMap.tsx', 'e2e/previews.spec.ts']), false);
  assert.equal(caseCheckNeeded([]), false);
  assert.equal(caseCheckNeeded(['src/engine/sets.ts']), true);
  assert.equal(caseCheckNeeded(['package-lock.json']), true);
});
