import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { content } from '../content/index.ts';
import { Rng } from '../engine/rng.ts';
import { autoDots, catConflicts, catsSolved, countCatSolutions, generateCats } from './cats.ts';
import { foundLocations, generateSudoku, locationSquares, solvableBySingles, sudokuConflicts, sudokuShape, sudokuSolved } from './sudoku.ts';
import { isAllowedGuess, parseWords } from './dictionary.ts';
import { keyboardState, scoreGuess } from './wordle.ts';
import { typedEdit } from './typing.ts';

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

const dictionary = parseWords(readFileSync(new URL('../../public/words.txt', import.meta.url), 'utf8'));

test('word list: 4–9 letter upper-case words, including every room object', () => {
  assert.ok(dictionary.size > 100_000);
  for (const word of dictionary) assert.match(word, /^[A-Z]{4,9}$/);
  for (const room of content.house.rooms) for (const word of room.objects) assert.ok(dictionary.has(word), word);
});

test('wordle accepts real words and the answer, and anything before the list loads', () => {
  assert.ok(isAllowedGuess('CRANE', 'STOVE', dictionary));
  assert.ok(!isAllowedGuess('QZXJV', 'STOVE', dictionary));
  assert.ok(isAllowedGuess('QZXJV', 'QZXJV', dictionary));
  assert.ok(isAllowedGuess('QZXJV', 'STOVE', null));
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

test('a placed cat rules out its row, column, zone and neighbours, and only while it is there', () => {
  const p = generateCats(6, new Rng(3));
  const cat: [number, number] = [2, p.solution[2]];
  const dots = autoDots(p, [cat]);
  assert.ok(!dots.has(`${cat[0]},${cat[1]}`));
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const expected =
        !(r === cat[0] && c === cat[1]) &&
        (r === cat[0] || c === cat[1] || p.zones[r][c] === p.zones[cat[0]][cat[1]] || (Math.abs(r - cat[0]) <= 1 && Math.abs(c - cat[1]) <= 1));
      assert.equal(dots.has(`${r},${c}`), expected, `${r},${c}`);
    }
  }
  // The solution's other cats are never ruled out by a correct cat.
  for (let r = 0; r < 6; r++) if (r !== cat[0]) assert.ok(!dots.has(`${r},${p.solution[r]}`));
  assert.equal(autoDots(p, []).size, 0);
});

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

test('typing: plain keys, backspace, and keyboards that resend or autocorrect the word', () => {
  assert.deepEqual(typedEdit('CA', 'CAT'), { deleted: 0, inserted: 'T' });
  assert.deepEqual(typedEdit('CAT', 'CA'), { deleted: 1, inserted: '' });
  assert.deepEqual(typedEdit('CA', 'cat'), { deleted: 0, inserted: 'T' });
  assert.deepEqual(typedEdit('CA', 'Car '), { deleted: 0, inserted: 'R' });
  assert.deepEqual(typedEdit('CRAN', 'CRANE'), { deleted: 0, inserted: 'E' });
  assert.deepEqual(typedEdit('TEH', 'THE'), { deleted: 2, inserted: 'HE' });
  assert.deepEqual(typedEdit('', '1'), { deleted: 0, inserted: '' });
});
