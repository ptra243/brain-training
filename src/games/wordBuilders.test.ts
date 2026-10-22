import { test } from 'node:test';
import { CROSSWORD_BUILD_SIZES, WORDSEARCH_LEVELS, crosswordSameSeed, wordSearchSameSeed } from './wordBuildersSweeps.ts';

// The fast builders against the oracle (today's builders) on a few fixed seeds; check-cases takes many more.
const ANSWERS = ['LAMP', 'PIANO', 'CANDLE', 'KETTLE'];

test('crossword: the fast builder makes the same grids as the oracle', () => {
  for (const size of CROSSWORD_BUILD_SIZES) {
    for (const answer of ANSWERS) crosswordSameSeed(answer, size, 1);
  }
});

test('word search: the fast builder makes the same puzzles as the oracle', () => {
  for (const level of WORDSEARCH_LEVELS) {
    for (const answer of ANSWERS) wordSearchSameSeed(answer, level, 1);
  }
});
