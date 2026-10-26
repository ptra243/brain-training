import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allSweepFiles } from './sweeps.ts';
import { closure, sweepsNeeded } from './caseCheckDeps.ts';

test('closure of a case file covers the engine, games, content and game imports', () => {
  const files = closure('src/engine/cases.quick.sweep.ts');
  for (const f of ['src/engine/caseChecks.ts', 'src/engine/generate.ts', 'src/games/tarot.ts', 'src/content/index.ts', 'src/game/talk.ts']) {
    assert.ok(files.has(f), f);
  }
});

test('UI and doc changes pick no sweep, engine and package changes pick the case files', () => {
  const all = allSweepFiles();
  assert.deepEqual(sweepsNeeded(all, ['docs/next-sessions.md', 'src/game/ExploreMap.tsx', 'e2e/previews.spec.ts']), []);
  assert.deepEqual(sweepsNeeded(all, []), []);
  const cases = all.filter((s) => s.includes('/cases.'));
  assert.equal(cases.length, 4);
  for (const s of cases) assert.ok(sweepsNeeded(all, ['src/engine/sets.ts']).includes(s), s);
  assert.deepEqual(sweepsNeeded(all, ['package-lock.json']), all);
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

test('the real lock.ts change picks lock.sweep.ts, not the search sweep (the case files do import it, through nosing)', () => {
  const picked = sweepsNeeded(allSweepFiles(), ['src/games/lock.ts']);
  assert.ok(picked.includes('src/games/lock.sweep.ts'));
  assert.ok(!picked.some((s) => s.includes('search')));
});
