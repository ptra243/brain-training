// Nosing around: the walkers (right, wrong, random answers meet the dog, stay in the turn window, reach the lock),
// the dog square, and a board forced for every scene room x level x clue share, each run through nosingProblems.
// nosingProblems checks the board, the lock, the questions and that a run meets the dog; it does not play the fight.
// nosing.test.ts keeps seeds 0-6 per level for the walkers; this takes 6 more spread over the rest (quick) or all 100 (SWEEP_FULL=1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { house } from '../content/index.ts';
import { nosingLadders, nosingSnakes } from '../content/nosing.ts';
import { FULL, seedsOf, sweep } from '../sweep.ts';
import { buildNosing } from './nosing.ts';
import { LEVELS, botSeed, dogSquareSeed, nosingProblems } from './nosingSweeps.ts';

for (const level of LEVELS) {
  sweep(`nosing bots, ${level}`, seedsOf(7, 100, 6), (i) => botSeed(level, i));
  sweep(`nosing dog square, ${level}`, seedsOf(10, 100, 20), (i) => dogSquareSeed(level, i));
}

// Forced boards: every scene room at every level, with the clue share cycling (quick) or all of 3-7 (full).
let forced = 0;
for (const level of LEVELS) {
  const cases: [string, number][] = house.rooms.flatMap((room, r) => (FULL ? [3, 4, 5, 6, 7] : [3 + (r % 5)]).map((share): [string, number] => [room.id, share]));
  sweep(`nosing forced boards, ${level}`, cases, ([roomId, share]) => {
    forced++;
    const seed = `check-${level}-${roomId}-${share}`;
    const p = buildNosing({ house, seed, level, sceneRoom: roomId, clues: Array.from({ length: share }, (_, k) => `c${k + 1}`), ladders: nosingLadders, snakes: nosingSnakes });
    const problems = nosingProblems(p, roomId, share);
    assert.deepEqual(problems, [], `nosing ${seed}`);
  });
}

test('summary', (t) => {
  const per = LEVELS.map((l) => `${l} 6 seeds`.replace('6', FULL ? '100' : '6'));
  t.diagnostic(`Nosing bots: ${per.join(', ')}; dog square ${FULL ? 100 : 20} seeds per level`);
  t.diagnostic(`Nosing forced boards: ${forced} (every scene room at every level)`);
});
