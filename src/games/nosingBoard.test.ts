import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOSING_LEVELS, nosingSpec, rerollFor, rollFor } from './nosingBoard.ts';
import { house as manor } from '../content/index.ts';
import { lodge, otherHouses, tLodge } from '../content/houses.ts';
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
    const spec = NOSING_LEVELS[level];
    const dice = spec.dice;
    for (let t = 1; t <= 30; t++) {
      const r = rollFor('x', spec, t);
      assert.equal(r, rollFor('x', spec, t));
      assert.ok(r >= dice && r <= dice * 6);
      const rr = rerollFor('x', spec, t);
      assert.ok(rr >= dice && rr <= dice * 6);
    }
  }
});

// Seeds of every other house at every level; check-cases runs 300 of them plus the bots.
const HOUSE_SEEDS = 12;
for (const house of otherHouses) {
  for (const level of BOARD_LEVELS) {
    test(`nosing board on ${house.id} (${level}): ${HOUSE_SEEDS} seeds build within the cap and satisfy every rule`, () => {
      for (let i = 0; i < HOUSE_SEEDS; i++) boardSeed(level, i, house);
    });
  }
}

test('nosingSpec: the manor gets the stock level, other houses their overrides', () => {
  for (const level of BOARD_LEVELS) {
    assert.equal(nosingSpec(manor, level), NOSING_LEVELS[level]);
    for (const house of otherHouses) {
      const spec = nosingSpec(house, level);
      assert.equal(spec.n, 1, `${house.id} ${level} squares are cells`);
      assert.ok(spec.minEndRoom !== undefined);
      assert.equal(spec.enterExtra !== undefined, level === 'easy' || (house === lodge || house === tLodge), `${house.id} ${level} room limit`);
    }
  }
  assert.deepEqual(nosingSpec(lodge, 'easy').len, NOSING_LEVELS.easy.len);
  assert.deepEqual(nosingSpec(lodge, 'medium').len, [92, 100]);
});
