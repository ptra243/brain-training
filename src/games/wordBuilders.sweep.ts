// Fast crossword and word search builders against the oracle (today's
// builders): the same puzzle for the same seed (wordBuilders.test.ts keeps a
// few fixed answers at seed 1). Quick: every other room thing at one
// size/level, seed 3; SWEEP_FULL=1: every room thing at every size and level
// for seeds 1 and 2. Also builds word searches for room things x levels 1-3 x
// seeds (quick: every third thing, 4 seeds; full: 40 seeds): no blanks, each
// word once, leftovers spell the answer, hidden letters not bunched.

import { test } from 'node:test';
import { roomThings } from '../game/sceneGamesSweeps.ts';
import { FULL, seedsOf, sweep } from '../sweep.ts';
import { CROSSWORD_BUILD_SIZES, WORDSEARCH_LEVELS, crosswordSameSeed, searchTotals, wordSearchBuilds, wordSearchSameSeed } from './wordBuildersSweeps.ts';

const crosswords: [string, number, number][] = [];
const searches: [string, 1 | 2 | 3, number][] = [];
roomThings().forEach((answer, k) => {
  if (!FULL && k % 2) return;
  const j = (k >> 1) + 1;
  const sizes = FULL ? CROSSWORD_BUILD_SIZES : [CROSSWORD_BUILD_SIZES[j % CROSSWORD_BUILD_SIZES.length]];
  const levels = FULL ? WORDSEARCH_LEVELS : [WORDSEARCH_LEVELS[j % WORDSEARCH_LEVELS.length]];
  for (const seed of FULL ? [1, 2] : [3]) {
    for (const size of sizes) crosswords.push([answer, size, seed]);
    for (const level of levels) searches.push([answer, level, seed]);
  }
});

sweep('crossword vs oracle', crosswords, ([answer, size, seed]) => crosswordSameSeed(answer, size, seed));
const builds: [string, 1 | 2 | 3, number][] = [];
roomThings().forEach((answer, k) => {
  if (!FULL && k % 3) return;
  for (const level of WORDSEARCH_LEVELS) for (const seed of seedsOf(0, 40, 4)) builds.push([answer, level, seed]);
});

sweep('word search vs oracle', searches, ([answer, level, seed]) => wordSearchSameSeed(answer, level, seed));
sweep('word search builds', builds, ([answer, level, seed]) => wordSearchBuilds(answer, level, seed));

test('summary', (t) => {
  t.diagnostic(`Word builders vs oracle: ${crosswords.length} crosswords and ${searches.length} word searches match the old builders`);
  const n = searchTotals.builds || 1;
  t.diagnostic(
    `Word search builds: ${searchTotals.builds} builds, ${searchTotals.fails} fails, layouts per build mean ${(searchTotals.layouts / n).toFixed(2)} worst ${searchTotals.worst}, ${((100 * searchTotals.together) / (searchTotals.hidden || 1)).toFixed(0)}% of hidden letters side by side, longest run ${searchTotals.longest}`,
  );
});
