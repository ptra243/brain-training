import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allSweepFiles } from './sweeps.ts';
import { caseCheckFiles, caseCheckNeeded, closure, sweepsNeeded } from './caseCheckDeps.ts';

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

test('closure of a sweep file holds its game and the sweep helper', () => {
  const files = closure('src/games/lock.sweep.ts');
  for (const f of ['src/games/lock.sweep.ts', 'src/games/lock.ts', 'src/sweep.ts']) assert.ok(files.has(f), f);
  assert.ok(!files.has('src/engine/generate.ts'));
});

test('a changed game picks only the sweeps that import it', () => {
  const sweeps = ['src/games/lock.sweep.ts', 'src/engine/search.sweep.ts'];
  const fake = (s: string) => new Set(s.includes('lock') ? ['src/games/lock.ts'] : ['src/engine/search.ts']);
  assert.deepEqual(sweepsNeeded(sweeps, ['src/games/lock.ts'], fake), ['src/games/lock.sweep.ts']);
  assert.deepEqual(sweepsNeeded(sweeps, ['docs/x.md'], fake), []);
  assert.deepEqual(sweepsNeeded(sweeps, null, fake), sweeps);
  assert.deepEqual(sweepsNeeded(sweeps, ['package.json'], fake), sweeps);
});

test('the real lock.ts change picks lock.sweep.ts, not unrelated sweeps', () => {
  const picked = sweepsNeeded(allSweepFiles(), ['src/games/lock.ts']);
  assert.ok(picked.includes('src/games/lock.sweep.ts'));
  assert.ok(!picked.some((s) => s.includes('search') || s.includes('cases.')));
});
