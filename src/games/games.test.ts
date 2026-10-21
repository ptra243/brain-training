import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { content } from '../content/index.ts';
import { Rng } from '../engine/rng.ts';
import { autoDots, catConflicts, catMoveId, catsHint, catsSolved, countCatSolutions, generateCats, solvableBySimpleSteps, type CatHintState, type CatMark, type CatPuzzle } from './cats.ts';
import { clearNotes, foundLocations, generateSudoku, locationSquares, solvableBySingles, sudokuCandidates, sudokuConflicts, sudokuHint, sudokuShape, sudokuSolved, toggleNote, visibleNotes, type SudokuHintState, type SudokuPuzzle } from './sudoku.ts';
import { isAllowedGuess, parseWords } from './dictionary.ts';
import { WORD_LENGTH, keyboardState, scoreGuess } from './wordle.ts';
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

test('word list: WORD_LENGTH-letter upper-case words, including every room object', () => {
  assert.ok(dictionary.size > 10_000);
  for (const word of dictionary) assert.match(word, new RegExp(`^[A-Z]{${WORD_LENGTH}}$`));
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

for (const size of [6, 7, 8]) {
  test(`easy cat puzzles ${size}×${size}: one solution, one one-square zone, simple steps solve it`, () => {
    for (let seed = 1; seed <= 15; seed++) {
      const p = generateCats(size, new Rng(seed * 101 + size), true);
      assert.equal(countCatSolutions(p.zones, 2), 1);
      const sizes = new Array<number>(size).fill(0);
      for (const row of p.zones) for (const z of row) sizes[z]++;
      assert.equal(sizes.filter((k) => k === 1).length, 1, 'one one-square zone');
      assert.ok(Math.min(...sizes.filter((k) => k > 1)) >= 2);
      assert.ok(solvableBySimpleSteps(p.zones));
    }
  });
}

test('normal cat puzzles have no one-square zone, and some need looking ahead', () => {
  let needsLookAhead = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const p = generateCats(8, new Rng(seed));
    for (const row of p.zones) for (const z of row) assert.ok(p.zones.flat().filter((x) => x === z).length >= 2);
    if (!solvableBySimpleSteps(p.zones)) needsLookAhead++;
  }
  assert.ok(needsLookAhead > 0, 'the simple-steps check should reject some puzzles');
});

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

/** Ask for hints until the grid is solved, as the game does; check every step is a right one. */
function followSudokuHints(p: SudokuPuzzle, start: number[]) {
  let grid = start.slice();
  let state: SudokuHintState = {};
  const kinds = { wrong: 0, nudge: 0, why: 0, fill: 0 };
  for (let asks = 0; !sudokuSolved(p, grid); asks++) {
    assert.ok(asks < 4 * p.size * p.size, 'hints go round in circles');
    const h = sudokuHint(p, grid, state);
    assert.ok(h, 'no hint before the grid is solved');
    kinds[h.kind]++;
    if (h.kind === 'wrong') {
      for (const [i, d] of Object.entries(h.squares)) assert.notEqual(p.solution[+i], d);
      state = { ...state, flagged: { ...state.flagged, ...h.squares } };
    } else if (h.kind === 'nudge') {
      assert.notEqual(grid[h.cell], p.solution[h.cell], 'nudges an unsolved square');
      state = { ...state, nudged: h.cell };
    } else if (h.kind === 'why') {
      assert.equal(h.cell, state.nudged);
      state = { ...state, explained: h.cell };
    } else {
      assert.equal(h.cell, state.nudged);
      assert.equal(h.digit, p.solution[h.cell]);
      grid = grid.slice();
      grid[h.cell] = h.digit;
    }
  }
  assert.equal(sudokuHint(p, grid, state), null);
  return kinds;
}

for (const [size, givens] of [[6, 16], [6, 13], [9, 32]] as const) {
  test(`sudoku ${size}×${size} hints (${givens} givens): nudge, why, fill, always to a win`, () => {
    for (let seed = 1; seed <= 12; seed++) {
      const p = generateSudoku(size, givens, new Rng(seed * 31 + givens));
      const kinds = followSudokuHints(p, p.givens);
      const empty = p.givens.filter((d) => !d).length;
      assert.deepEqual(kinds, { wrong: 0, nudge: empty, why: empty, fill: empty });
    }
  });
}

test('sudoku hints cross out wrong numbers once, then still lead to a win', () => {
  const p = generateSudoku(6, 13, new Rng(5));
  const grid = p.givens.slice();
  const blanks = grid.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
  grid[blanks[0]] = (p.solution[blanks[0]] % 6) + 1;
  grid[blanks[1]] = p.solution[blanks[1]];
  const first = sudokuHint(p, grid);
  assert.deepEqual(first, { kind: 'wrong', squares: { [blanks[0]]: grid[blanks[0]] } });
  assert.equal(sudokuHint(p, grid, { flagged: { [blanks[0]]: grid[blanks[0]] } })?.kind, 'nudge');
  followSudokuHints(p, grid);
});

/** Ask for hints until every cat is right, as the game does; check every step is a right one. */
function followCatHints(p: CatPuzzle, start: Record<string, CatMark> = {}) {
  let marks = { ...start };
  let state: CatHintState = {};
  const kinds = { wrong: 0, nudge: 0, why: 0, move: 0, tidy: 0, lookAhead: 0 };
  const placed = () => Object.entries(marks).filter(([, m]) => m === 'cat').map(([k]) => k.split(',').map(Number) as [number, number]);
  for (let asks = 0; !catsSolved(p, placed()); asks++) {
    assert.ok(asks < 4 * p.size * p.size, 'hints go round in circles');
    const h = catsHint(p, marks, state);
    assert.ok(h, 'no hint before the puzzle is solved');
    kinds[h.kind]++;
    if (h.kind === 'wrong') state = { ...state, flagged: { ...state.flagged, ...h.squares } };
    else if (h.kind === 'nudge') {
      if (h.move.kind === 'look-ahead') kinds.lookAhead++;
      state = { ...state, nudged: catMoveId(h.move) };
    } else if (h.kind === 'why') state = { ...state, explained: catMoveId(h.move) };
    else {
      if (h.kind === 'move') assert.equal(catMoveId(h.move), state.nudged);
      marks = { ...marks };
      for (const [key, m] of Object.entries(h.marks)) {
        const [r, c] = key.split(',').map(Number);
        if (m) assert.equal(m === 'cat', p.solution[r] === c, `${m} on ${key}`);
        if (m) marks[key] = m;
        else delete marks[key];
      }
    }
  }
  assert.equal(catsHint(p, marks, state), null);
  return kinds;
}

for (const size of [6, 7, 8]) {
  for (const easy of [true, false]) {
    test(`cat puzzle ${size}×${size} hints (${easy ? 'easy' : 'not easy'}): only right moves, always to a win`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const p = generateCats(size, new Rng(seed * 101 + size), easy);
        const kinds = followCatHints(p);
        assert.equal(kinds.wrong + kinds.tidy, 0);
        if (easy) assert.equal(kinds.lookAhead, 0, 'easy puzzles never need looking ahead');
      }
    });
  }
}

test('cat hints cross out a wrong cat and a dot on a cat square, then clear them on the way to a win', () => {
  const p = generateCats(6, new Rng(7), true);
  const wrongCol = (p.solution[0] + 3) % 6;
  const start: Record<string, CatMark> = { [`0,${wrongCol}`]: 'cat', [`1,${p.solution[1]}`]: 'dot' };
  assert.deepEqual(catsHint(p, start), { kind: 'wrong', squares: start });
  assert.equal(catsHint(p, start, { flagged: start })?.kind, 'nudge');
  followCatHints(p, start);
});

test('sudoku candidates leave out the row, column and box digits; none for a filled square', () => {
  const p = generateSudoku(6, 14, new Rng(3));
  const s = sudokuShape(6);
  const grid = p.givens.slice();
  grid.forEach((d, i) => {
    const cands = sudokuCandidates(p, grid, i);
    if (d) assert.deepEqual(cands, []);
    else {
      for (const j of s.peers[i]) assert.ok(!grid[j] || !cands.includes(grid[j]));
      assert.ok(cands.includes(p.solution[i]));
    }
  });
});

test('sudoku notes: placing hides a digit from peers and clearing restores it; toggling starts from candidates', () => {
  const p = generateSudoku(6, 14, new Rng(3));
  const s = sudokuShape(6);
  const grid = p.givens.slice();
  const pairs = grid.flatMap((x, a) => (x ? [] : s.peers[a].filter((j) => !grid[j] && sudokuCandidates(p, grid, j).includes(p.solution[a])).map((j) => [a, j])));
  assert.ok(pairs.length, "a square whose digit is a candidate of an empty peer");
  const [i, peer] = pairs[0];
  const d = p.solution[i];
  const all = [1, 2, 3, 4, 5, 6];
  const placed = grid.slice();
  placed[i] = d;
  for (const show of [false, true]) {
    const notes = { [peer]: all.filter((x) => sudokuCandidates(p, grid, peer).includes(x)) };
    const before = visibleNotes(p, grid, notes, show, peer);
    assert.ok(before.includes(d));
    const hidden = visibleNotes(p, placed, notes, show, peer);
    assert.deepEqual(hidden, before.filter((x) => x !== d));
    assert.ok(notes[peer].includes(d), 'kept in the saved notes');
    assert.deepEqual(visibleNotes(p, grid, notes, show, peer), before, 'restored after clearing');
  }
  // A note she never marked in checkbox mode follows the candidates both ways.
  assert.ok(!visibleNotes(p, placed, {}, true, peer).includes(d));
  assert.ok(visibleNotes(p, grid, {}, true, peer).includes(d));

  assert.deepEqual(visibleNotes(p, grid, {}, false, i), []);
  const cands = sudokuCandidates(p, grid, i);
  assert.deepEqual(visibleNotes(p, grid, {}, true, i), cands);
  assert.deepEqual(visibleNotes(p, grid, { [i]: all }, true, i), cands);
  const struck = toggleNote(p, grid, {}, true, i, cands[0])[i];
  assert.deepEqual(struck, cands.slice(1));
  const added = toggleNote(p, grid, toggleNote(p, grid, {}, false, i, cands[1]), false, i, cands[0]);
  assert.deepEqual(added[i], [cands[0], cands[1]].sort((x, y) => x - y));
  assert.deepEqual(toggleNote(p, grid, added, false, i, cands[0])[i], [cands[1]]);
  // Clear deletes the key: blank with the checkbox off, candidates with it on.
  const cleared = clearNotes(added, i);
  assert.equal(i in cleared, false);
  assert.deepEqual(visibleNotes(p, grid, cleared, false, i), []);
  assert.deepEqual(visibleNotes(p, grid, cleared, true, i), cands);
  const given = grid.findIndex((x) => x);
  assert.deepEqual(toggleNote(p, grid, {}, false, given, 1), {});
});
