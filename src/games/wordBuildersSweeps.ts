import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { clueWords } from '../content/words.ts';
import { Rng } from '../engine/rng.ts';
import { crosswordWords, themeWords } from '../game/sceneGames.ts';
import { generateCrossword } from './crossword.ts';
import { generateWordSearch } from './wordsearch.ts';
import { oracleCrossword, oracleWordSearch } from './wordBuildersOracle.ts';

/**
 * The fast crossword and word search builders against `wordBuildersOracle.ts` (today's builders): same seed, same
 * puzzle, field for field and in the same order. `npm test` checks a few seeds per size and level;
 * `scripts/check-cases.ts` samples (quick) or takes every room thing at every size and level for 2 seeds (--full).
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
