import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { WordSearchPuzzle } from '../../games/wordsearch.ts';
import { listedWords } from './wordSearchUi.ts';

const names = ['ANT', 'BEE', 'COW', 'DOG', 'EEL', 'FOX', 'GNU', 'HEN'];
const puzzle = (grid: string[]): WordSearchPuzzle => ({
  size: grid.length,
  grid,
  words: names.map((word) => ({ word, cells: [[0, 0]] })),
  answer: 'X',
  secret: [],
});

test('the word list is the same words, in a shuffled order fixed per puzzle', () => {
  const a = puzzle(['ABCD', 'EFGH', 'IJKL', 'MNOP']);
  const listed = listedWords(a).map((w) => w.word);
  assert.deepEqual([...listed].sort(), names);
  assert.notDeepEqual(listed, names);
  assert.deepEqual(listedWords(a).map((w) => w.word), listed);
  assert.deepEqual(a.words.map((w) => w.word), names, 'the puzzle is not reordered');
  const other = listedWords(puzzle(['PONM', 'LKJI', 'HGFE', 'DCBA'])).map((w) => w.word);
  assert.notDeepEqual(other, listed);
});
