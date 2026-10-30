import { Rng, hashSeed } from '../../engine/rng.ts';
import type { WordSearchPuzzle } from '../../games/wordsearch.ts';

/**
 * The word list in a shuffled order, fixed for a puzzle (seeded from its grid), so the list
 * doesn't read as alphabetical order. Display only: the puzzle itself is untouched.
 */
export function listedWords(puzzle: WordSearchPuzzle): WordSearchPuzzle['words'] {
  return new Rng(hashSeed(puzzle.grid.join(''))).shuffle(puzzle.words);
}
