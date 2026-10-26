import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { clueWords } from '../content/words.ts';
import { Rng } from '../engine/rng.ts';
import { crosswordWords, themeWords } from '../game/sceneGames.ts';
import { generateCrossword } from './crossword.ts';
import { MAX_SIDE_BY_SIDE, everyWordOnce, generateWordSearch, leftovers, longestSideBySide, wordSearchStats } from './wordsearch.ts';
import { oracleCrossword, oracleWordSearch } from './wordBuildersOracle.ts';

/**
 * The fast crossword and word search builders against `wordBuildersOracle.ts` (today's builders): same seed, same
 * puzzle, field for field and in the same order. `npm test` checks a few seeds per size and level;
 * `wordBuilders.sweep.ts` samples (quick) or takes every room thing at every size and level for 2 seeds (--full).
 * It also builds word searches (no oracle) and checks they have no blank squares.
 */

export const CROSSWORD_BUILD_SIZES: readonly number[] = [7, 9, 11];
export const WORDSEARCH_LEVELS: readonly (1 | 2 | 3)[] = [1, 2, 3];
const exclude = themeWords(content);
const searchWords = clueWords.map((w) => w.word);

/** One room thing in a crossword of this size: the fast builder and the oracle make the same grid. */
export function crosswordSameSeed(answer: string, size: number, seed: number): void {
  const words = crosswordWords(size);
  const fast = generateCrossword(answer, words, exclude, new Rng(seed), size);
  const old = oracleCrossword(answer, words, exclude, new Rng(seed), size);
  assert.deepStrictEqual(fast, old);
}

/** One room thing in a word search of this level (at the size the game uses): same puzzle from both builders. */
export function wordSearchSameSeed(answer: string, level: 1 | 2 | 3, seed: number, size = 7): void {
  const fast = generateWordSearch(answer, searchWords, exclude, level, new Rng(seed), size);
  const old = oracleWordSearch(answer, searchWords, exclude, level, new Rng(seed), size);
  assert.deepStrictEqual(fast, old);
}

/** Totals over every word search build of a sweep. */
export const searchTotals = { builds: 0, fails: 0, layouts: 0, worst: 0, hidden: 0, together: 0, longest: 0 };

/** One room thing in a word search of this level: it builds, has no blank square, lists each word once, spells the answer, and its hidden letters do not bunch up. */
export function wordSearchBuilds(answer: string, level: 1 | 2 | 3, seed: number, size = 7): void {
  const before = wordSearchStats.layouts;
  searchTotals.builds++;
  try {
    const p = generateWordSearch(answer, searchWords, exclude, level, new Rng(seed), size);
    const layouts = wordSearchStats.layouts - before;
    searchTotals.layouts += layouts;
    searchTotals.worst = Math.max(searchTotals.worst, layouts);
    assert.ok(!p.grid.some((row) => row.includes('.')), 'a blank square');
    assert.ok(everyWordOnce(p), 'a listed word is not there exactly once');
    assert.equal(leftovers(p).map(([r, c]) => p.grid[r][c]).join(''), answer, 'the leftovers do not spell the answer');
    assert.deepEqual(leftovers(p), p.secret, 'secret is not the leftovers');
    const run = longestSideBySide(p.secret);
    assert.ok(run <= MAX_SIDE_BY_SIDE, `${run} hidden letters side by side`);
    searchTotals.longest = Math.max(searchTotals.longest, run);
    searchTotals.hidden += p.secret.length;
    for (let i = 1; i < p.secret.length; i++) {
      if (p.secret[i][0] === p.secret[i - 1][0] && p.secret[i][1] === p.secret[i - 1][1] + 1) searchTotals.together++;
    }
  } catch (e) {
    searchTotals.fails++;
    throw e;
  }
}
