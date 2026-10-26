// Nosing around boards: every rule over seeds on the manor, every other house and each turned or mirrored variant,
// plus the walkers on those houses. nosingBoard.test.ts keeps seeds 0-35 per level on the manor.

import { test } from 'node:test';
import { eachVariant } from '../content/houseSweeps.ts';
import { FULL, seedsOf, sweep } from '../sweep.ts';
import { BOARD_SEEDS, boardSeed } from './nosingBoardSweeps.ts';
import { LEVELS, botSeed } from './nosingSweeps.ts';

let built = 0;
let variantBoards = 0;

for (const level of LEVELS) {
  const seeds = seedsOf(36, BOARD_SEEDS, 24);
  sweep(`nosing boards, manor ${level}`, seeds, (i) => boardSeed(level, i));
  built += seeds.length;
}

// Every other house at every level: builds within the attempt cap, turn bounds hold, doors respected.
for (const { house } of eachVariant().filter((x) => x.v === 0)) {
  for (const level of LEVELS) {
    const seeds = seedsOf(0, BOARD_SEEDS, 24);
    sweep(`nosing boards, ${house.id} ${level}`, seeds, (i) => boardSeed(level, i, house));
    built += seeds.length;
    sweep(`nosing bots, ${house.id} ${level}`, seedsOf(0, 100, 3), (i) => botSeed(level, i, house));
  }
}

// ...and each turned or mirrored variant of every other house (the manor is never turned).
for (const { v, house } of eachVariant().filter((x) => x.v > 0)) {
  for (const level of LEVELS) {
    const seeds = seedsOf(v, 10, 2);
    sweep(`nosing boards, ${house.id} ${level}`, seeds, (i) => boardSeed(level, i, house));
    variantBoards += seeds.length;
    sweep(`nosing bots, ${house.id} ${level}`, seedsOf(v, 3, 1), (i) => botSeed(level, i, house));
  }
}

test('summary', (t) => {
  t.diagnostic(`Nosing boards: ${built} boards satisfy every rule (${FULL ? BOARD_SEEDS : 24} seeds per level and house; bots on ${FULL ? 100 : 3} seeds per other house and level); ${variantBoards} more on the 7 variants of each (${FULL ? 10 : 2} seeds per level, bots on ${FULL ? 3 : 1})`);
});
