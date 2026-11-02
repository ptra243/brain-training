import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterTitle, roomLine } from './campaignBook.ts';

test('chapter titles follow the rounds', () => {
  assert.equal(chapterTitle(0), 'Chapter one: 9pm');
  assert.equal(chapterTitle(1), 'Chapter two: Midnight');
  assert.equal(chapterTitle(2), 'Chapter three: 3am');
});

test('a round outside the range is clamped', () => {
  assert.equal(chapterTitle(-1), 'Chapter one: 9pm');
  assert.equal(chapterTitle(7), 'Chapter three: 3am');
});

test('the room line names the room', () => {
  assert.equal(roomLine('Library'), 'You are in the Library.');
});
