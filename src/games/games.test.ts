import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../engine/rng.ts';
import { catConflicts, catsSolved, countCatSolutions, generateCats } from './cats.ts';
import { foundLocations, generateSudoku, locationSquares, solvableBySingles, sudokuConflicts, sudokuShape, sudokuSolved } from './sudoku.ts';
import { keyboardState, scoreGuess } from './wordle.ts';

test('wordle scoring handles repeated letters', () => {
  assert.deepEqual(scoreGuess('STOVE', 'STOVE'), ['hit', 'hit', 'hit', 'hit', 'hit']);
  assert.deepEqual(scoreGuess('LLAMA', 'TABLE'), ['near', 'miss', 'near', 'miss', 'miss']);
  assert.deepEqual(scoreGuess('EERIE', 'THERE'), ['near', 'miss', 'near', 'miss', 'hit']);
  assert.deepEqual(scoreGuess('speed', 'abide'), ['miss', 'miss', 'near', 'miss', 'near']);
});

test('keyboard keeps the best colour seen for each letter', () => {
  const keys = keyboardState(['TABLE', 'BLAST'], 'BLAZE');
  assert.equal(keys.B, 'hit');
  assert.equal(keys.A, 'hit');
  assert.equal(keys.T, 'miss');
});

for (const size of [6, 7, 8]) {
  test(`cat puzzles ${size}×${size}: one solution, every zone and rule holds`, () => {
    for (let seed = 1; seed <= 15; seed++) {
      const p = generateCats(size, new Rng(seed * 101 + size));
      assert.equal(countCatSolutions(p.zones, 2), 1);
      const cats = p.solution.map((c, r) => [r, c] as [number, number]);
      assert.equal(new Set(p.solution).size, size, 'one per column');
      assert.equal(new Set(cats.map(([r, c]) => p.zones[r][c])).size, size, 'one per zone');
      assert.equal(catConflicts(p, cats).size, 0);
      assert.ok(catsSolved(p, cats));
    }
  });
}

test('cat conflicts flag touching cats', () => {
  const p = generateCats(6, new Rng(3));
  const bad = catConflicts(p, [[0, 0], [1, 1]]);
  assert.ok(bad.has('0,0') && bad.has('1,1'));
});

for (const [size, givens] of [[6, 14], [9, 32]] as const) {
  test(`sudoku ${size}×${size}: valid, one solution, solvable by singles`, () => {
    for (let seed = 1; seed <= 10; seed++) {
      const p = generateSudoku(size, givens, new Rng(seed * 7 + size));
      const s = sudokuShape(size);
      assert.equal(sudokuConflicts(p, p.solution).size, 0);
      assert.ok(p.givens.every((d, i) => d === 0 || d === p.solution[i]));
      assert.ok(solvableBySingles(s, p.givens));
      assert.ok(sudokuSolved(p, p.solution));
      const filled = p.givens.filter(Boolean).length;
      assert.ok(filled >= givens && filled <= givens + 8, `${filled} givens`);
    }
  });
}

test('same seed, same puzzles', () => {
  assert.deepEqual(generateCats(7, new Rng(9)), generateCats(7, new Rng(9)));
  assert.deepEqual(generateSudoku(9, 32, new Rng(9)), generateSudoku(9, 32, new Rng(9)));
});

test('sudoku location squares are empty, distinct, and their solved digits give the target', () => {
  for (const size of [6, 9] as const) {
    const p = generateSudoku(size, size === 6 ? 14 : 32, new Rng(size * 13));
    const targets = [
      { id: 'a', target: [2, 3] as const },
      { id: 'b', target: [5, 0] as const },
      { id: 'c', target: [0, 0] as const },
    ];
    const sq = locationSquares(p, targets, new Rng(1));
    const all = Object.values(sq).flatMap((s) => [s.row, s.col]);
    assert.equal(new Set(all).size, all.length, 'squares shared');
    for (const t of targets) {
      const s = sq[t.id];
      assert.ok(s, `no squares for ${t.id}`);
      assert.equal(p.givens[s.row], 0);
      assert.equal(p.givens[s.col], 0);
      assert.equal(p.solution[s.row], t.target[0] + 1);
      assert.equal(p.solution[s.col], t.target[1] + 1);
    }
    const grid = p.givens.slice();
    assert.deepEqual(foundLocations(p, sq, grid), []);
    grid[sq.a.row] = p.solution[sq.a.row];
    assert.deepEqual(foundLocations(p, sq, grid), [], 'one square is not enough');
    grid[sq.a.col] = p.solution[sq.a.col];
    assert.deepEqual(foundLocations(p, sq, grid), ['a']);
  }
});
