import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../../content/index.ts';
import { nosingLadders, nosingObstacleLines, nosingSnakes } from '../../content/nosing.ts';
import { buildNosing, nosingInitial, nosingStep, nosingView } from '../../games/nosing.ts';
import { emptyFill, place } from '../../games/numberGrid.ts';
import { hasClearable, rowCaption, slotLabel } from './numberGridUi.ts';
import { diceFaces, distanceWords, markKinds, markLine, nearestMark, obstacleReason, padPress, padValue, pawTrail, roomSquares, searchReason, spentSquares, squareCentre, wallLines, walkSteps, woolPath } from './nosingUi.ts';

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

test('grid captions show a row\'s total and the running total once the row is complete', () => {
  const row = (value: number | null, total: number | null) => ({ used: true, value, total });
  assert.equal(rowCaption(0, row(100, 100)), '= 100');
  assert.equal(rowCaption(1, row(20, 120)), '= 20 → 120');
  assert.equal(rowCaption(1, row(20, null)), '= 20');
  assert.equal(rowCaption(2, row(null, null)), '');
  assert.equal(rowCaption(0, { used: false, value: null, total: null }), '');
});

test('slots are named for a screen reader, and Clear only counts what is not locked', () => {
  assert.equal(slotLabel({ row: 1, kind: 'num', i: 2 }), 'Row 2, third number');
  assert.equal(slotLabel({ row: 0, kind: 'op', i: 0 }), 'Row 1, first sign');
  assert.equal(slotLabel({ row: 2, kind: 'rowOp' }), 'Row 3, how it joins the total');
  const n0 = { row: 0, kind: 'num', i: 0 } as const;
  const fill = place(emptyFill(), n0, 3);
  assert.equal(hasClearable(emptyFill(), []), false);
  assert.equal(hasClearable(fill, []), true);
  assert.equal(hasClearable(fill, [n0]), false);
});

test('the lock view starts with an empty grid and the palette hand', () => {
  const p = puzzle('easy');
  const v = nosingView(p, nosingInitial());
  assert.equal(v.grid.length, 3);
  assert.equal(v.hand.numbers.length, 6);
  assert.equal(v.hand.ops, 'palette');
  assert.deepEqual(v.locked, []);
});

test('distance words say here, ahead and back with the right plural', () => {
  assert.equal(distanceWords(5, 5), 'Here');
  assert.equal(distanceWords(5, 6), '1 square ahead');
  assert.equal(distanceWords(5, 12), '7 squares ahead');
  assert.equal(distanceWords(9, 8), '1 square back');
  assert.equal(distanceWords(9, 2), '7 squares back');
  assert.equal(markLine('A question', 22, 17), 'A question, square 23. 5 squares ahead.');
});

test('a tap picks the nearest marked square and ignores plain ones', () => {
  for (const level of ['easy', 'medium', 'hard'] as const) {
    const p = puzzle(level);
    const kinds = markKinds(p.board, p.dogSquare, []);
    const centres = p.board.path.map((_, i) => squareCentre(p.board, i));
    assert.equal(kinds[0], 'door');
    assert.equal(kinds[kinds.length - 1], 'lock');
    assert.equal(kinds[p.dogSquare], 'dog');
    assert.equal(markKinds(p.board, p.dogSquare, [p.dogSquare])[p.dogSquare], 'snake');
    kinds.forEach((k, i) => assert.equal(k === null, p.board.squares[i].kind === 'plain' && i !== 0 && i !== kinds.length - 1));
    // Tapping the centre of a marked square picks it; the centre of a plain one picks a marked neighbour.
    centres.forEach((c, i) => {
      const hit = nearestMark(centres, kinds, c);
      assert.notEqual(hit, null);
      assert.ok(kinds[hit!]);
      if (kinds[i]) assert.equal(hit, i);
    });
  }
  assert.equal(nearestMark([{ x: 0, y: 0 }], [null], { x: 0, y: 0 }), null);
});

test('encounter lines are content, seeded by the square, and name no one', () => {
  const p = puzzle('medium');
  assert.equal(obstacleReason('s', 7), obstacleReason('s', 7));
  const seen = new Set<string>();
  for (let sq = 0; sq < 80; sq++) {
    const line = obstacleReason('seed', sq);
    assert.ok(nosingObstacleLines.includes(line));
    seen.add(line);
  }
  assert.ok(seen.size > 6);
  assert.ok(nosingObstacleLines.length >= 14);
  const names = [...content.house.rooms.flatMap((r) => [r.name, ...r.things, ...r.objects]), ...content.suspects.map((s) => s.name), ...content.items.map((i) => i.name)];
  for (const line of nosingObstacleLines) {
    assert.ok(/^[A-Z]/.test(line));
    for (const n of names) assert.ok(!new RegExp(String.raw`\b${n}s?\b`, 'i').test(line), `${line} names ${n}`);
  }
  const sq = p.board.squares.findIndex((s) => s.kind === 'search');
  assert.ok(searchReason(p.seed, sq, p.board.roomOf, p.house).startsWith('The cat'));
});

test('spent squares come from her moves: right answers, played speed rounds and cat finds', () => {
  const p = puzzle('easy');
  let state = nosingInitial();
  let view = nosingView(p, state);
  assert.equal(spentSquares(p, state, view).size, 0);
  const wrong = new Set<number>();
  const right = new Set<number>();
  for (let guard = 0; guard < 120 && view.phase !== 'lock' && view.phase !== 'dog' && view.phase !== 'open'; guard++) {
    if (view.phase === 'question') {
      const ok = view.question!.square % 2 === 0;
      (ok ? right : wrong).add(view.question!.square);
      const q = view.question!;
      state = nosingStep(p, state, { t: 'answer', value: ok ? q.q.answer : q.q.answer + 1 });
    } else if (view.phase === 'speed') state = nosingStep(p, state, { t: 'speed', right: 3 });
    else state = nosingStep(p, state, { t: 'roll' });
    view = nosingView(p, state);
  }
  const spent = spentSquares(p, state, view);
  for (const i of spent) assert.ok(['obstacle', 'search', 'speed', 'catFind'].includes(p.board.squares[i].kind));
  for (const i of right) if (['obstacle', 'search'].includes(p.board.squares[i].kind)) assert.ok(spent.has(i), `square ${i} answered right`);
  for (const i of wrong) if (['obstacle', 'search'].includes(p.board.squares[i].kind)) assert.ok(!spent.has(i), `square ${i} answered wrong`);
});
