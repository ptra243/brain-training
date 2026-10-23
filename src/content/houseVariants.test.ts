import assert from 'node:assert/strict';
import { test } from 'node:test';
import { doorSpots, rotateHouse, roomAdjacency, VARIANTS } from '../engine/house.ts';
import type { Cell, House } from '../engine/types.ts';
import { eachVariant } from './houseSweeps.ts';
import { allHouses, chooseHouse, houseById, longHouse, otherHouses, tLodge, variantsOf } from './houses.ts';
import { house as manor } from './index.ts';

const key = (c: Cell) => `${c[0]},${c[1]}`;

function contiguous(cells: readonly Cell[]): boolean {
  const all = new Set(cells.map(key));
  const seen = new Set([key(cells[0])]);
  const queue = [cells[0]];
  while (queue.length) {
    const [r, c] = queue.pop()!;
    for (const n of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as Cell[]) {
      if (all.has(key(n)) && !seen.has(key(n))) {
        seen.add(key(n));
        queue.push(n);
      }
    }
  }
  return seen.size === all.size;
}

test('every house has 8 variants that keep rooms, cells, doors and nosing, and stay connected', () => {
  for (const layout of allHouses) {
    const variants = variantsOf(layout);
    assert.equal(variants.length, 8);
    assert.equal(new Set(variants.map((v) => v.id)).size, 8, `${layout.id}: ids differ`);
    assert.equal(variants[0], layout);
    for (const v of variants) {
      assert.equal(v.rooms.length, layout.rooms.length, v.id);
      assert.deepEqual(v.rooms.map((r) => r.id), layout.rooms.map((r) => r.id), v.id);
      assert.equal(v.rows * v.cols, layout.rows * layout.cols, `${v.id}: grid size`);
      const footprint: Cell[] = [];
      const seen = new Set<string>();
      for (const [i, room] of v.rooms.entries()) {
        assert.equal(room.cells.length, layout.rooms[i].cells.length, `${v.id} ${room.id}: cell count`);
        assert.ok(contiguous(room.cells), `${v.id} ${room.id}: contiguous`);
        for (const c of room.cells) {
          assert.ok(c[0] >= 0 && c[0] < v.rows && c[1] >= 0 && c[1] < v.cols, `${v.id} ${room.id}: in grid`);
          assert.ok(!seen.has(key(c)), `${v.id}: cell owned twice`);
          seen.add(key(c));
          footprint.push(c);
        }
        const sorted = [...room.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        assert.deepEqual(room.cells, sorted, `${v.id} ${room.id}: row-major, first cell is the label cell`);
      }
      assert.ok(contiguous(footprint), `${v.id}: footprint contiguous`);
      assert.deepEqual(v.doors, layout.doors, `${v.id}: doors keep their room pairs`);
      assert.deepEqual(v.nosing, layout.nosing, `${v.id}: nosing overrides`);
      // Every door still sits on a shared wall, and the doors reach every room.
      assert.equal(doorSpots(v).length, (layout.doors ?? []).length, v.id);
      const adj = roomAdjacency(v);
      const reached = new Set([v.rooms[0].id]);
      const queue = [v.rooms[0].id];
      while (queue.length) {
        for (const n of adj.get(queue.pop()!)!) {
          if (reached.has(n)) continue;
          reached.add(n);
          queue.push(n);
        }
      }
      assert.equal(reached.size, v.rooms.length, `${v.id}: doors connect every room`);
    }
  }
});

test('turning four times is the layout, and the variants are 8 different footprints for an uneven house', () => {
  for (const layout of allHouses) {
    let h: House = layout;
    for (let i = 0; i < 4; i++) h = rotateHouse(h, 1, false);
    assert.deepEqual(h.rooms, layout.rooms, `${layout.id}: four quarter turns`);
    assert.deepEqual(rotateHouse(rotateHouse(layout, 0, true), 0, true).rooms, layout.rooms, `${layout.id}: mirror twice`);
  }
  for (const h of [tLodge, longHouse]) {
    const shapes = new Set(variantsOf(h).map((v) => JSON.stringify(v.rooms.map((r) => r.cells))));
    assert.equal(shapes.size, 8, `${h.id}: its rooms are laid out differently in each variant`);
  }
});

test('no plan is much taller than wide: every house and turn fits 10 to 12 squares each way', () => {
  for (const { layout: h, house: v } of eachVariant(allHouses)) {
    if (h === manor) assert.equal(v.rows, v.cols, v.id);
    else assert.ok(v.rows >= 10 && v.rows <= 12 && v.cols >= 10 && v.cols <= 12, `${v.id} is ${v.rows}x${v.cols}`);
  }
});

test('houseById resolves variant ids and round trips; an unknown suffix throws', () => {
  for (const { layout, v: i, house: v } of eachVariant(allHouses)) {
    assert.equal(v.id, i === 0 ? layout.id : `${layout.id}/${VARIANTS[i].suffix}`);
    assert.equal(houseById(v.id), v, 'cached: the same object every time');
  }
  for (const id of ['lodge/m', 'lodge/m90', 'lodge/r180', 'lodge/r270']) assert.equal(houseById(id).id, id);
  for (const id of ['lodge/', 'lodge/r45', 'lodge/r0', 'lodge/r90/r90', 'lodge/x', 'nowhere/r90']) {
    assert.throws(() => houseById(id), /Unknown house/, id);
  }
});

test('the new layouts have rooms at least 2 cells across and sensible sizes', () => {
  for (const h of [longHouse, tLodge]) {
    for (const room of h.rooms) {
      const rows = new Set(room.cells.map((c) => c[0]));
      const cols = new Set(room.cells.map((c) => c[1]));
      assert.ok(rows.size >= 2 && cols.size >= 2, `${h.id} ${room.id} is thinner than 2 cells`);
    }
  }
  const longRows = new Set(longHouse.rooms.flatMap((r) => r.cells.map((c) => c[0])));
  assert.ok(longRows.size >= 3 && longRows.size <= 4, 'the long house is 3 or 4 rows deep');
  assert.equal(longHouse.rooms.length, 8);
  assert.ok(tLodge.rooms.length >= 9 && tLodge.rooms.length <= 10);
  assert.ok(otherHouses.includes(longHouse) && otherHouses.includes(tLodge));
});

test('chooseHouse never turns the manor, and rolls a variant for the others on its own stream', () => {
  assert.equal(chooseHouse('x', [manor]), manor);
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const h = chooseHouse(`seed-${i}`, [tLodge, longHouse]);
    assert.equal(chooseHouse(`seed-${i}`, [tLodge, longHouse]), h, 'same seed, same house');
    assert.ok(h.id.startsWith('tlodge') || h.id.startsWith('long'));
    seen.add(h.id);
  }
  assert.ok(seen.size > 8, `only ${seen.size} different houses in 60 seeds`);
  for (let i = 0; i < 40; i++) {
    const h = chooseHouse(`m-${i}`, [manor, longHouse]);
    if (h.id.startsWith('manor')) assert.equal(h, manor, 'the manor is never turned');
  }
});
