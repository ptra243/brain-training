// Scene word games: every room thing hidden in a crossword (the unit test uses
// each at one size; quick takes every other thing at another size, SWEEP_FULL=1
// all), and the word games of cases 1-10 per difficulty (the test builds
// cases 1-2).

import { test } from 'node:test';
import { DIFFICULTIES } from '../engine/settings.ts';
import { CROSSWORD_SIZE } from '../games/crossword.ts';
import { FULL, sweep } from '../sweep.ts';
import { CROSSWORD_SIZES, crosswordSeed, roomThings, sceneCaseSeed } from './sceneGamesSweeps.ts';

const things = roomThings();
const grids: [string, number, number][] = [];
things.forEach((answer, k) => {
  if (!FULL && k % 2) return; // quick: every other thing, at a size the test did not use
  const sizes = FULL ? CROSSWORD_SIZES : [CROSSWORD_SIZES[(k + 1) % CROSSWORD_SIZES.length]];
  for (const [size] of sizes) {
    for (let seed = 1; seed <= (size === CROSSWORD_SIZE ? 2 : 1); seed++) grids.push([answer, size, seed]);
  }
});
sweep('crossword grids', grids, ([answer, size, seed]) => crosswordSeed(answer, size, seed));

const caseRuns: [(typeof DIFFICULTIES)[number], number][] = [];
for (const difficulty of DIFFICULTIES) {
  for (const n of FULL ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [5, 10]) caseRuns.push([difficulty, n]);
}
sweep('scene games in cases', caseRuns, ([difficulty, n]) => sceneCaseSeed(difficulty, n));

test('summary', (t) => {
  t.diagnostic(`Scene games: ${things.length} room things in ${grids.length} crossword grids, ${caseRuns.length} cases' word games`);
});
