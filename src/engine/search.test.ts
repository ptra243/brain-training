import { houseOf } from '../content/houses.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { cluePool, compileClue, type ClueContext } from './clues.ts';
import { generateCase } from './generate.ts';
import { roomAdjacency } from './house.ts';
import { Rng } from './rng.ts';
import { allHoldings, allRoomings, countMatching } from './search.ts';
import { compareSearch, FACT_TYPES } from './searchSweeps.ts';
import { allCandidates, countSolutions } from './solver.ts';
import type { ClueFact, Solution } from './types.ts';

const adjacency = roomAdjacency(content.house);

test('search agrees with trying every answer, on classic cases', () => {
  for (let n = 1; n <= 6; n++) {
    const c = generateCase(content, n, n % 2 ? 'easy' : 'hard');
    const ctx = { suspects: c.suspects, adjacency };
    const space = { suspects: c.suspects, rooms: c.rooms, items: c.items, shared: false };
    const all = allCandidates(c.rooms, c.items);
    const facts = c.clues.map((cl) => cl.fact);
    for (let k = 0; k <= facts.length; k += 2) {
      const some = facts.slice(0, k);
      assert.equal(countMatching(space, some, ctx), countSolutions(all, some, ctx), `case ${n}, ${k} clues`);
    }
  }
});

test('search agrees with trying every answer when rooms are shared', () => {
  // A small shared house: 5 guests, 3 rooms, 3 weapons.
  const suspects = content.suspects.slice(0, 5).map((s) => s.id);
  const rooms = content.house.rooms.slice(0, 3).map((r) => r.id);
  const items = content.items.slice(0, 3).map((i) => i.id);
  const ctx: ClueContext = { suspects, adjacency };
  const space = { suspects, rooms, items, shared: true };
  const every: Solution[] = allRoomings(rooms, 5).flatMap((room) => allHoldings(items, 5).map((item) => ({ room, item })));
  assert.equal(every.length, 3 ** 5 * 5 * 4 * 3);
  const rng = new Rng(7);
  for (let trial = 0; trial < 12; trial++) {
    const truth = rng.pick(every);
    const pool = cluePool(truth, ctx, rooms, items, content.house.rooms.map((r) => r.id), rng, true);
    const facts: ClueFact[] = rng.shuffle(pool).slice(0, 2 + trial);
    const brute = every.filter((sol) => facts.every((f) => compileClue(f, ctx)(sol))).length;
    assert.equal(countMatching(space, facts, ctx), brute, `trial ${trial}`);
    assert.ok(brute >= 1, 'true facts always leave the truth');
  }
});

test('the count stops early once it passes the limit', () => {
  const c = generateCase(content, 3, 'medium');
  const space = { suspects: c.suspects, rooms: c.rooms, items: c.items, shared: false };
  assert.equal(countMatching(space, [], { suspects: c.suspects, adjacency }, 2), 3);
});

test('7-guest cases: shared rooms, two empty hands, the killer alone with the weapon, one answer', () => {
  for (let n = 1; n <= 6; n++) {
    const c = generateCase(content, n, { suspects: 7, logic: n % 2 ? 'easy' : 'hard', minigames: 'medium', length: 'long' });
    assert.equal(c.suspects.length, 7);
    assert.equal(c.rooms.length, 5);
    assert.equal(c.items.length, 5);
    assert.equal(c.solution.item.filter((i) => i === null).length, 2);
    assert.ok(new Set(c.solution.room).size < 7, 'someone shares a room');
    const k = c.suspects.indexOf(c.murderer);
    assert.equal(c.solution.room[k], c.sceneRoom);
    assert.equal(c.solution.room.filter((r) => r === c.sceneRoom).length, 1, 'alone at the scene');
    assert.equal(c.solution.item[k], c.weapon);
    const space = { suspects: c.suspects, rooms: c.rooms, items: c.items, shared: true };
    assert.equal(countMatching(space, c.clues.map((cl) => cl.fact), { suspects: c.suspects, adjacency: roomAdjacency(houseOf(c)) }, 2), 1, `case ${n}`);
  }
});

test('the fast search gives the same count as the old exhaustive one on random cases', () => {
  const r = compareSearch(Array.from({ length: 30 }, (_, i) => i));
  assert.deepEqual(r.mismatches, []);
  for (const type of FACT_TYPES) assert.ok((r.types.get(type) ?? 0) > 0, `no ${type} fact tried`);
  assert.ok(r.none > 0 && r.many > 0, 'both empty and crowded fact sets');
});
