import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doorSpots, houseFromLayout, roomAdjacency, sharedWallAdjacency } from './house.ts';
import { buildNosingBoard, NOSING_LEVELS, type NosingLevel } from '../games/nosingBoard.ts';

const meta = (id: string) => ({ id, name: id, tint: '#ccc', objects: [], things: [] });
const legend = (letters: string) => Object.fromEntries(letters.split('').map((l) => [l, meta(l.toLowerCase())]));

// An L footprint: the top-right column (rows 0-3) is void.
const LAYOUT = `
  AAABB.
  AAABB.
  CCCDD.
  CCCDD.
  EEEFFF
  EEEFFF
  GGGHHH
`;
const LETTERS = 'ABCDEFGH';
const CHAIN = 'AB BD DC CE EF FH HG';
const RING = `${CHAIN} GE`;

const sorted = (s: Set<string>) => [...s].sort();

test('void cells belong to no room, and no doors keeps the old shape', () => {
  const house = houseFromLayout('t', 'T', LAYOUT, legend(LETTERS));
  assert.equal(house.rows, 7);
  assert.equal(house.cols, 6);
  assert.equal(house.doors, undefined);
  const owned = house.rooms.reduce((n, r) => n + r.cells.length, 0);
  assert.equal(owned, 42 - 4);
  assert.deepEqual(roomAdjacency(house), sharedWallAdjacency(house));
  assert.deepEqual(sorted(roomAdjacency(house).get('a')!), ['b', 'c']);
});

test('layout errors are clear', () => {
  assert.throws(() => houseFromLayout('t', 'T', 'AA.BB', legend('AB')), /footprint.*not contiguous/);
  assert.throws(() => houseFromLayout('t', 'T', 'AB\nBA', legend('AB')), /not contiguous/);
  assert.throws(() => houseFromLayout('t', 'T', 'AX', legend('A')), /no room in the legend/);
  assert.throws(() => houseFromLayout('t', 'T', 'AA\nA.', legend('AB')), /no cells/);
});

test('door errors are clear', () => {
  const make = (doors: string) => () => houseFromLayout('t', 'T', LAYOUT, legend(LETTERS), doors);
  assert.throws(make('AB BD DC CE EF FH HG A'), /two legend letters/);
  assert.throws(make('AB BD DC CE EF FH HZ'), /not in the legend/);
  assert.throws(make('AA'), /itself/);
  assert.throws(make('AB BD DC CE EF FH HG AD'), /do not share a wall/);
  assert.throws(make('AB BD DC CE EF FH HG BA'), /listed twice/);
  assert.throws(make('AB BD DC CE EF FH'), /unreachable: g/);
  assert.throws(make('AB DC CE EF FH HG'), /unreachable/);
});

test('doors decide adjacency; shared walls are still available', () => {
  const house = houseFromLayout('t', 'T', LAYOUT, legend(LETTERS), CHAIN);
  assert.equal(house.doors!.length, 7);
  const adj = roomAdjacency(house);
  assert.deepEqual(sorted(adj.get('a')!), ['b']);
  assert.deepEqual(sorted(adj.get('d')!), ['b', 'c']);
  assert.deepEqual(sorted(adj.get('g')!), ['h']);
  assert.deepEqual(sorted(sharedWallAdjacency(house).get('a')!), ['b', 'c']);

  const ring = houseFromLayout('t', 'T', LAYOUT, legend(LETTERS), RING);
  assert.deepEqual(sorted(roomAdjacency(ring).get('g')!), ['e', 'h']);
  assert.deepEqual(sorted(roomAdjacency(ring).get('e')!), ['c', 'f', 'g']);
});

test('door spots sit on the middle of the shared wall', () => {
  const house = houseFromLayout('t', 'T', LAYOUT, legend(LETTERS), CHAIN);
  const spots = doorSpots(house);
  assert.equal(spots.length, 7);
  assert.deepEqual(spots[0], { a: 'a', b: 'b', row: 1, col: 2, side: 'right' }); // wall of 2 cells: index 1
  assert.deepEqual(spots[1], { a: 'b', b: 'd', row: 1, col: 4, side: 'bottom' });
  assert.deepEqual(spots[2], { a: 'd', b: 'c', row: 3, col: 2, side: 'right' });
  assert.deepEqual(spots[4], { a: 'e', b: 'f', row: 5, col: 2, side: 'right' }); // 2 cells: index 1
  assert.deepEqual(spots[5], { a: 'f', b: 'h', row: 5, col: 4, side: 'bottom' }); // 3 cells: index 1
  assert.deepEqual(doorSpots(houseFromLayout('t', 'T', LAYOUT, legend(LETTERS))), []);
});

const jumps = ['p', 'q', 'r', 's'].map((id) => ({ id, rooms: 'any' as const }));

for (const [name, doors] of [['chain', CHAIN], ['ring', RING]] as const) {
  // Medium (n = 2) does not build on this small synthetic house in 600 attempts; real houses are tuned later.
  for (const level of ['easy'] as NosingLevel[]) {
    test(`nosing board on a voided house (${name}, ${level}) never steps on a void`, () => {
      const house = houseFromLayout('t', 'T', LAYOUT, legend(LETTERS), doors);
      const n = NOSING_LEVELS[level].n;
      for (let i = 0; i < 4; i++) {
        const board = buildNosingBoard({ house, level, seed: `void-${name}-${i}`, sceneRoom: 'a', searchClues: 2, ladders: jumps, snakes: jumps });
        assert.equal(board.width, house.cols * n);
        const owner = new Map<string, string>();
        for (const r of house.rooms) for (const [y, x] of r.cells) owner.set(`${y},${x}`, r.id);
        board.path.forEach((s, k) => {
          const y = Math.floor(Math.floor(s / board.width) / n);
          const x = Math.floor((s % board.width) / n);
          assert.equal(owner.get(`${y},${x}`), board.roomOf[k], `square ${s} is void or in the wrong room`);
        });
        assert.deepEqual([...new Set(board.roomOf)].sort(), house.rooms.map((r) => r.id).sort(), 'every room is entered');
      }
    });
  }
}
