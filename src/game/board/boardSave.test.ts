import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Board, BoardCell, BoardPiece } from '../../engine/boardTypes.ts';
import { UNKNOWN } from '../../engine/boardTypes.ts';
import {
  blocker,
  boardComplete,
  boardInitial,
  boardSolvedSave,
  checkBoard,
  clashes,
  dropCheck,
  fitsAnywhere,
  makeRules,
  occupancy,
  orient,
  pinnedIds,
  rotations,
  tokensOf,
  truthPlacement,
  unmetTouches,
  withHint,
  withPlaced,
  withoutPlaced,
} from './boardSave.ts';

// A 4×2 board: room "a" on the left, Unknown on the right.
//   a a U U
//   a a U U
const noMarks = () => ({ not: [] as string[], only: null as string[] | null, sym: [] as string[], anti: [] as string[] });
const domino: BoardCell[] = [[0, 0], [0, 1]];

function piece(id: string, kind: BoardPiece['kind'], who: string | null, over: Partial<BoardPiece> = {}): BoardPiece {
  return { id, kind, who, shape: domino, marks: noMarks(), clue: null, ...over };
}

function tinyBoard(): Board {
  const cells: Record<string, string> = {};
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) cells[`${r},${c}`] = c < 2 ? 'a' : UNKNOWN;
  return {
    W: 4,
    H: 2,
    sections: ['a', UNKNOWN],
    cells,
    pieces: [
      piece('g1', 'guest', 'x', { marks: { ...noMarks(), sym: ['*'] }, clue: 'c1' }),
      piece('w1', 'weapon', 'k', { marks: { ...noMarks(), sym: ['*'] } }),
      piece('grey', 'grey', null),
      piece('fog', 'fog', null),
    ],
    truth: {
      g1: { section: 'a', cells: [[0, 0], [0, 1]] },
      w1: { section: 'a', cells: [[1, 0], [1, 1]] },
      // Vertical in the board, so the tray shape has to be turned to land.
      grey: { section: UNKNOWN, cells: [[0, 2], [1, 2]] },
      fog: { section: UNKNOWN, cells: [[0, 3], [1, 3]] },
    },
    pinned: { easy: ['w1'], medium: [], hard: [] },
  };
}

test('shapes turn and compare', () => {
  assert.equal(rotations(domino).length, 2);
  assert.deepEqual(orient(domino, 1), [[0, 0], [1, 0]]);
  assert.deepEqual(orient(domino, 2), [[0, 1], [0, 0]]);
  const l: BoardCell[] = [[0, 0], [1, 0], [1, 1]];
  assert.equal(rotations(l).length, 4);
});

test('truth placement turns the tray shape onto its squares', () => {
  const b = tinyBoard();
  const t = truthPlacement(b, 'grey');
  assert.deepEqual(t.shape, [[0, 0], [1, 0]]);
  assert.deepEqual(t.cells, [[0, 2], [1, 2]]);
});

test('pinned pieces: body and filler always, plus the level', () => {
  const b = tinyBoard();
  assert.deepEqual(pinnedIds(b, 'medium'), ['fog']);
  assert.deepEqual(pinnedIds(b, 'easy').sort(), ['fog', 'w1']);
  const r = makeRules(b, 'easy');
  assert.deepEqual(Object.keys(occupancy(r, boardInitial())).sort(), ['0,0', '0,1', '0,3', '1,0', '1,1', '1,3'].sort().filter((k) => !['0,0', '0,1'].includes(k)));
});

test('a piece with no partner shows no symbol', () => {
  const b = tinyBoard();
  b.pieces[1].marks.sym = [];
  assert.deepEqual(tokensOf(makeRules(b, 'medium'), 'g1'), []);
  assert.deepEqual(tokensOf(makeRules(tinyBoard(), 'medium'), 'g1'), [{ cls: 'sym', s: '*' }]);
});

test("a piece's own rules refuse", () => {
  const b = tinyBoard();
  b.pieces[0].marks.not = ['a'];
  const r = makeRules(b, 'medium');
  assert.equal(blocker(r, 'g1', 'a')?.code, 'not');
  assert.equal(blocker(r, 'g1', 'a')?.clue, 'c1');
  assert.equal(blocker(r, 'g1', UNKNOWN), null);
  assert.equal(blocker(r, 'grey', 'a')?.code, 'grey');
  assert.equal(blocker(r, 'grey', UNKNOWN), null);
  const only = tinyBoard();
  only.pieces[0].marks.only = ['a'];
  // Marks are about rooms: Unknown is always allowed for guests and weapons.
  assert.equal(blocker(makeRules(only, 'medium'), 'g1', UNKNOWN), null);
  assert.equal(blocker(makeRules(only, 'medium'), 'g1', 'a'), null);
});

test('only pinned partners refuse; pair rules between loose pieces never do', () => {
  const b = tinyBoard();
  // w1 pinned on easy, in room a: g1 must touch it, so Unknown is refused.
  const easy = makeRules(b, 'easy');
  assert.equal(blocker(easy, 'g1', UNKNOWN)?.code, 'touch-pinned');
  assert.equal(blocker(easy, 'g1', UNKNOWN)?.otherSection, 'a');
  assert.equal(blocker(easy, 'g1', 'a'), null);
  // Loose on medium: no refusal either way.
  const medium = makeRules(b, 'medium');
  assert.equal(blocker(medium, 'g1', UNKNOWN), null);
  // Apart from a pinned piece in the same room.
  const apart = tinyBoard();
  apart.pieces[0].marks = { ...noMarks(), anti: ['!'] };
  apart.pieces[1].marks = { ...noMarks(), anti: ['!'] };
  assert.equal(blocker(makeRules(apart, 'easy'), 'g1', 'a')?.code, 'apart-pinned');
  assert.equal(blocker(makeRules(apart, 'easy'), 'g1', UNKNOWN), null);
  // Same guest as a pinned piece.
  const same = tinyBoard();
  same.pieces.push(piece('g2', 'guest', 'x'));
  same.truth.g2 = { section: UNKNOWN, cells: [[0, 2], [0, 3]] };
  same.truth.grey = { section: UNKNOWN, cells: [[1, 2], [1, 3]] };
  same.pinned.easy = ['g2'];
  same.pieces.splice(3, 1); // no fog here
  delete same.truth.fog;
  assert.equal(blocker(makeRules(same, 'easy'), 'g1', 'a')?.code, 'same-pinned');
});

test('drops: shape, walls and overlaps', () => {
  const r = makeRules(tinyBoard(), 'medium');
  const save = boardInitial();
  assert.deepEqual(dropCheck(r, save, 'g1', [[0, 0], [0, 1]]), { ok: true, section: 'a' });
  assert.deepEqual(dropCheck(r, save, 'g1', [[0, 1], [0, 2]]), { ok: false, why: 'wall' });
  assert.deepEqual(dropCheck(r, save, 'g1', [[0, 3], [0, 4]]), { ok: false, why: 'nofit' });
  assert.deepEqual(dropCheck(r, save, 'g1', [[0, 3], [1, 3]]), { ok: false, why: 'nofit' }); // fog is there
  const placed = withPlaced(save, 'w1', { section: 'a', cells: [[0, 0], [0, 1]], shape: domino });
  assert.deepEqual(dropCheck(r, placed, 'g1', [[0, 0], [0, 1]]), { ok: false, why: 'nofit' });
  // A piece doesn't block itself.
  assert.deepEqual(dropCheck(r, placed, 'w1', [[0, 0], [0, 1]]), { ok: true, section: 'a' });
});

test('fits anywhere only while a free spot in an allowed section exists', () => {
  // The grey piece fits only Unknown, where the fog leaves one column free.
  const r = makeRules(tinyBoard(), 'medium');
  let save = boardInitial();
  assert.equal(fitsAnywhere(r, save, 'grey'), true);
  save = withPlaced(save, 'w1', { section: UNKNOWN, cells: [[0, 2], [1, 2]], shape: domino });
  assert.equal(fitsAnywhere(r, save, 'grey'), false);
});

test('clashes: touch, apart and same guest', () => {
  const b = tinyBoard();
  const r = makeRules(b, 'medium');
  let save = withPlaced(boardInitial(), 'g1', { section: 'a', cells: [[0, 0], [0, 1]], shape: domino });
  assert.deepEqual(clashes(r, save), []);
  save = withPlaced(save, 'w1', { section: UNKNOWN, cells: [[0, 2], [0, 3]], shape: domino });
  assert.equal(clashes(r, save)[0].kind, 'touch');

  const apart = tinyBoard();
  apart.pieces[0].marks = { ...noMarks(), anti: ['!'] };
  apart.pieces[1].marks = { ...noMarks(), anti: ['!'] };
  const ar = makeRules(apart, 'medium');
  let s2 = withPlaced(boardInitial(), 'g1', { section: 'a', cells: [[0, 0], [0, 1]], shape: domino });
  s2 = withPlaced(s2, 'w1', { section: 'a', cells: [[1, 0], [1, 1]], shape: domino });
  assert.equal(clashes(ar, s2)[0].kind, 'apart');
  // Both in Unknown is fine for apart.
  const u1 = withPlaced(boardInitial(), 'g1', { section: UNKNOWN, cells: [[0, 2], [0, 3]], shape: domino });
  assert.deepEqual(clashes(ar, withPlaced(u1, 'w1', { section: UNKNOWN, cells: [[1, 2], [1, 3]], shape: domino })), []);

  const two = tinyBoard();
  two.pieces.push(piece('g2', 'guest', 'x'));
  const tr = makeRules(two, 'medium');
  let s3 = withPlaced(boardInitial(), 'g1', { section: 'a', cells: [[0, 0], [0, 1]], shape: domino });
  s3 = withPlaced(s3, 'g2', { section: UNKNOWN, cells: [[0, 2], [0, 3]], shape: domino });
  const same = clashes(tr, s3).find((c) => c.kind === 'same');
  assert.deepEqual(same?.ids.sort(), ['g1', 'g2']);
});

test('touching: same section but apart is not yet complete', () => {
  const b = tinyBoard();
  b.W = 2;
  const r = makeRules(b, 'medium');
  const far = withPlaced(withPlaced(boardInitial(), 'g1', { section: 'a', cells: [[0, 0], [0, 1]], shape: domino }), 'w1', { section: 'a', cells: [[1, 0], [1, 1]], shape: domino });
  assert.equal(unmetTouches(r, far).length, 0); // adjacent rows
  // Put them in Unknown and a piece between: make a 6-wide-ish case by hand.
  const wide: Board = { ...b, W: 3, H: 3, cells: Object.fromEntries([0, 1, 2].flatMap((rr) => [0, 1, 2].map((c) => [`${rr},${c}`, 'a']))), truth: {}, pieces: [], pinned: { easy: [], medium: [], hard: [] } };
  wide.pieces = [piece('p', 'guest', 'x', { marks: { ...noMarks(), sym: ['*'] } }), piece('q', 'weapon', 'k', { marks: { ...noMarks(), sym: ['*'] } })];
  const wr = makeRules(wide, 'medium');
  const apart = withPlaced(withPlaced(boardInitial(), 'p', { section: 'a', cells: [[0, 0], [0, 1]], shape: domino }), 'q', { section: 'a', cells: [[2, 0], [2, 1]], shape: domino });
  assert.equal(unmetTouches(wr, apart).length, 1);
});

test('complete: solved save fills the board, anything less does not', () => {
  const b = tinyBoard();
  for (const level of ['easy', 'medium', 'hard'] as const) {
    const solved = boardSolvedSave(b, level);
    assert.equal(boardComplete(b, level, solved), true, level);
    assert.equal(Object.keys(solved.placed).includes('fog'), false);
  }
  assert.deepEqual(Object.keys(boardSolvedSave(b, 'easy').placed).sort(), ['g1', 'grey']);
  assert.equal(boardComplete(b, 'medium', withoutPlaced(boardSolvedSave(b, 'medium'), 'g1')), false);
  assert.equal(boardComplete(b, 'medium', boardInitial()), false);
  // Swapping the two pieces in room a still fills the board and still touches.
  const swapped = boardSolvedSave(b, 'medium');
  swapped.placed.g1 = { ...swapped.placed.g1, cells: [[1, 0], [1, 1]] };
  swapped.placed.w1 = { ...swapped.placed.w1, cells: [[0, 0], [0, 1]] };
  assert.equal(boardComplete(b, 'medium', swapped), true);
});

test('hidden pieces keep their marks secret until finished', () => {
  const b = tinyBoard();
  b.pieces[0].marks = { not: ['a'], only: null, sym: ['*'], anti: [] };
  b.pieces[0].hidden = true;
  const r = makeRules(b, 'medium', false);
  assert.equal(blocker(r, 'g1', 'a'), null);
  assert.deepEqual(r.touch, []); // its partner's symbol is stripped too
  assert.deepEqual(tokensOf(r, 'w1'), []);
  const open = makeRules(b, 'medium', true);
  assert.equal(blocker(open, 'g1', 'a')?.code, 'not');
  assert.equal(open.touch.length, 1);
  assert.equal(b.pieces[0].marks.not.length, 1, 'the board itself is untouched');
});

test('hints climb two steps and count once per step', () => {
  let save = boardInitial();
  const one = withHint(save, 'g1');
  assert.equal(one.step, 1);
  assert.equal(one.save.hintCount, 1);
  const two = withHint(one.save, 'g1');
  assert.equal(two.step, 2);
  assert.equal(two.save.hintCount, 2);
  const again = withHint(two.save, 'g1');
  assert.equal(again.step, 2);
  assert.equal(again.save.hintCount, 2);
  assert.equal(save.hintCount, 0, 'the old save is unchanged');
  save = withHint(save, 'w1').save;
  assert.equal(save.hints.w1, 1);
});

test('check: empty, ok, wrong sections, and gaps', () => {
  const r = makeRules(tinyBoard(), 'medium');
  const never: (b: Board) => boolean = () => {
    throw new Error('not called');
  };
  assert.deepEqual(checkBoard(r, boardInitial(), never), { kind: 'empty' });

  const save = withPlaced(boardInitial(), 'g1', { section: 'a', cells: [[0, 0], [0, 1]], shape: domino });
  assert.deepEqual(checkBoard(r, save, () => true), { kind: 'ok' });

  // Exact squares fail, sections as a whole fail too: g1 is the culprit.
  const bySection = checkBoard(r, save, (_b, fixed, at) => !(fixed.g1 || at?.g1));
  assert.deepEqual(bySection, { kind: 'sections', flagged: ['g1'] });

  // Exact squares fail but the sections work: gaps, and g1 is flagged.
  const gaps = checkBoard(r, save, (_b, fixed) => !fixed.g1);
  assert.deepEqual(gaps, { kind: 'gaps', flagged: ['g1'], sections: ['a'] });
  // The solver is given pinned pieces as fixed squares.
  let seen: string[] = [];
  checkBoard(r, save, (_b, fixed) => {
    seen = Object.keys(fixed).sort();
    return true;
  });
  assert.deepEqual(seen, ['fog', 'g1']);
});
