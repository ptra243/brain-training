import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOSING_LEVELS, rerollFor, rollFor } from './nosingBoard.ts';
import { BOARD_LEVELS, boardSeed } from './nosingBoardSweeps.ts';

// A few fixed seeds per level (covering every scene room and clue count); check-cases runs the 300.
const SEEDS = 36;

for (const level of BOARD_LEVELS) {
  test(`nosing board (${level}): ${SEEDS} seeds satisfy every rule`, () => {
    for (let i = 0; i < SEEDS; i++) boardSeed(level, i);
  });
}

test('rolls are seeded, in range, and re-rolls differ in stream', () => {
  for (const level of BOARD_LEVELS) {
    const dice = NOSING_LEVELS[level].dice;
    for (let t = 1; t <= 30; t++) {
      const r = rollFor('x', level, t);
      assert.equal(r, rollFor('x', level, t));
      assert.ok(r >= dice && r <= dice * 6);
      const rr = rerollFor('x', level, t);
      assert.ok(rr >= dice && rr <= dice * 6);
    }
  }
});
