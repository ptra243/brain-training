import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { roomAdjacency } from './house.ts';
import { generateCase } from './generate.ts';
import { allCandidates, countSolutions, filterCandidates, sameSolution } from './solver.ts';
import type { Difficulty } from './types.ts';

const ctxFor = (suspects: readonly string[]) => ({ suspects, adjacency: roomAdjacency(content.house) });

test('the house has 6 rooms and every room has a neighbour', () => {
  assert.equal(content.house.rooms.length, 6);
  for (const [room, next] of roomAdjacency(content.house)) assert.ok(next.size > 0, `${room} is isolated`);
});

test('same case number gives the same case', () => {
  assert.deepEqual(generateCase(content, 7), generateCase(content, 7));
});

for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
  test(`${difficulty}: 30 cases each have exactly one solution, and it is the real one`, () => {
    for (let n = 1; n <= 30; n++) {
      const c = generateCase(content, n, difficulty);
      const ctx = ctxFor(c.suspects);
      const facts = c.clues.map((cl) => cl.fact);
      const left = filterCandidates(allCandidates(c.rooms, c.items), facts, ctx);
      assert.equal(left.length, 1, `case ${n} has ${left.length} solutions`);
      assert.ok(sameSolution(left[0], c.solution), `case ${n} solves to the wrong answer`);
    }
  });
}

test('clue sets are minimal: dropping any clue allows a second solution', () => {
  for (let n = 1; n <= 10; n++) {
    const c = generateCase(content, n);
    const ctx = ctxFor(c.suspects);
    const candidates = allCandidates(c.rooms, c.items);
    const facts = c.clues.map((cl) => cl.fact);
    facts.forEach((_, i) => {
      const without = facts.filter((__, j) => j !== i);
      assert.ok(countSolutions(candidates, without, ctx, 1) > 1, `case ${n} clue ${i} is redundant`);
    });
  }
});

test('the murderer is the suspect in the scene room holding the weapon', () => {
  const c = generateCase(content, 12);
  const i = c.suspects.indexOf(c.murderer);
  assert.equal(c.solution.room[i], c.sceneRoom);
  assert.equal(c.solution.item[i], c.weapon);
});
