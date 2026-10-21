import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../../content/index.ts';
import { nosingLadders, nosingSnakes } from '../../content/nosing.ts';
import { buildNosing } from '../../games/nosing.ts';
import { diceFaces, padPress, padValue, pawTrail, roomSquares, squareCentre, wallLines, walkSteps, woolPath } from './nosingUi.ts';

const puzzle = (level: 'easy' | 'medium' | 'hard') =>
  buildNosing({ house: content.house, seed: `ui-${level}`, level, sceneRoom: content.house.rooms[0].id, clues: ['a', 'b', 'c', 'd'], ladders: nosingLadders, snakes: nosingSnakes });

test('the number pad types digits, backs up and stops at four', () => {
  assert.equal(padPress('', '7'), '7');
  assert.equal(padPress('7', '2'), '72');
  assert.equal(padPress('72', 'back'), '7');
  assert.equal(padPress('', 'back'), '');
  assert.equal(padPress('0', '5'), '5');
  assert.equal(padPress('1234', '5'), '1234');
  assert.equal(padPress('12', 'x'), '12');
  assert.equal(padValue(''), null);
  assert.equal(padValue('042'.slice(1)), 42);
});

test('dice faces add up to the roll and stay on a die', () => {
  for (let t = 1; t <= 6; t++) assert.deepEqual(diceFaces(1, t), [t]);
  for (let t = 2; t <= 12; t++) {
    const f = diceFaces(2, t);
    assert.equal(f.length, 2);
    assert.equal(f[0] + f[1], t);
    assert.ok(f.every((n) => n >= 1 && n <= 6));
  }
});

test('the cat walks every square of a roll and jumps on a ladder or a slide', () => {
  const jumps = new Map([[5, 12], [20, 14]]);
  assert.deepEqual(walkSteps([0, 3], jumps), [0, 1, 2, 3]);
  assert.deepEqual(walkSteps([0, 5, 12], jumps), [0, 1, 2, 3, 4, 5, 12]);
  assert.deepEqual(walkSteps([0, 20, 14], jumps), [0, 20, 14]);
  assert.deepEqual(walkSteps([0, 40], jumps), [0, 40]);
  assert.deepEqual(walkSteps([], jumps), [0]);
});

test('board geometry covers the whole board and walls surround the house', () => {
  for (const level of ['easy', 'medium'] as const) {
    const p = puzzle(level);
    const squares = roomSquares(p.house, p.board);
    assert.equal(squares.length, p.board.width * p.board.height);
    // Every square of the path is in a room.
    for (let i = 0; i < p.board.path.length; i++) {
      const s = squares[p.board.path[i]];
      assert.equal(s.room, p.board.roomOf[i]);
      const c = squareCentre(p.board, i);
      assert.ok(c.x > 0 && c.x < p.board.width && c.y > 0 && c.y < p.board.height);
    }
    assert.ok(wallLines(squares, p.board.width, p.board.height).length > 0);
  }
});

test('paw trails and wool strands run from one end to the other', () => {
  const paws = pawTrail({ x: 0.5, y: 0.5 }, { x: 4.5, y: 0.5 }, 0.8);
  assert.ok(paws.length >= 2);
  assert.ok(paws.every((p) => p.x > 0.5 && p.x < 4.5));
  assert.deepEqual(pawTrail({ x: 1, y: 1 }, { x: 1, y: 1 }, 0.8), []);
  assert.match(woolPath({ x: 1, y: 1 }, { x: 5, y: 3 }), /^M1 1 C.* 5 3$/);
});
