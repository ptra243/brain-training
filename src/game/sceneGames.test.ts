import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { clueWords } from '../content/words.ts';
import { generateCase } from '../engine/generate.ts';
import { Rng } from '../engine/rng.ts';
import { SCENE_GAMES, type Difficulty } from '../engine/types.ts';
import { CROSSWORD_SIZE, cellKey, crosswordWon, entryCells, entrySolved, fullLetters, generateCrossword, solutionAt } from '../games/crossword.ts';
import { everyWordOnce, leftovers, lineBetween, wordAt } from '../games/wordsearch.ts';
import { emptyProgress, finaleOpen, reduce, sceneGameInPlay, sceneText, sceneUnlocked } from './state.ts';
import { sceneCrossword, sceneWordSearch, themeWords } from './sceneGames.ts';

test('word list: upper case, 3–7 letters, no repeats, a clue for each', () => {
  const seen = new Set<string>();
  for (const { word, clue } of clueWords) {
    assert.match(word, /^[A-Z]{3,7}$/);
    assert.ok(!seen.has(word), `${word} twice`);
    seen.add(word);
    assert.ok(clue.length > 3 && !clue.endsWith('.'), word);
    assert.ok(!clue.toUpperCase().includes(word), `${word}: clue gives it away`);
  }
});

test('theme words cover room, suspect and item names, and room objects', () => {
  const t = themeWords(content);
  for (const r of content.house.rooms) {
    assert.ok(t.has(r.name.toUpperCase()));
    for (const o of [...r.objects, ...r.things]) assert.ok(t.has(o));
  }
});

test('room things: one word of 4–9 letters, in every room', () => {
  for (const r of content.house.rooms) {
    assert.ok(r.things.length >= 5, r.name);
    for (const w of r.things) assert.match(w, /^[A-IK-WY]{4,9}$/, `${r.name}: ${w}`);
  }
});

test('every room thing can be hidden in an interlocking crossword', () => {
  const objects = [...new Set(content.house.rooms.flatMap((r) => r.things))];
  const exclude = themeWords(content);
  for (const answer of objects) {
    for (let seed = 1; seed <= 5; seed++) {
      const p = generateCrossword(answer, clueWords, exclude, new Rng(seed));
      // The shaded squares, in order, spell the word, and are all different squares.
      assert.equal(p.shaded.map(([r, c]) => solutionAt(p, r, c)).join(''), answer);
      assert.equal(new Set(p.shaded.map(([r, c]) => cellKey(r, c))).size, answer.length);
      assert.ok(p.entries.length >= 6, `${answer}: only ${p.entries.length} words`);
      assert.ok(p.entries.some((e) => e.dir === 'across') && p.entries.some((e) => e.dir === 'down'), 'both directions');
      assert.equal(new Set(p.entries.map((e) => e.word)).size, p.entries.length, 'no repeated words');
      const squares = new Map<string, string>();
      for (const e of p.entries) {
        assert.ok(!exclude.has(e.word) && e.word !== answer, e.word);
        const cells = entryCells(e);
        for (const [r, c] of cells) assert.ok(r >= 0 && c >= 0 && r < CROSSWORD_SIZE && c < CROSSWORD_SIZE, `${e.word} off the grid`);
        // Crossing words agree on their shared letter.
        cells.forEach(([r, c], i) => {
          const k = cellKey(r, c);
          assert.ok(!squares.has(k) || squares.get(k) === e.word[i], `${answer}: clash at ${k}`);
          squares.set(k, e.word[i]);
        });
        // Every word crosses another, so the grid is one piece.
        assert.ok(p.entries.some((o) => o !== e && entryCells(o).some(([r, c]) => cells.some(([er, ec]) => er === r && ec === c))));
      }
      // No stray words: every run of two or more letters in a row or column is an entry.
      for (const dir of ['across', 'down'] as const) {
        for (let line = 0; line < CROSSWORD_SIZE; line++) {
          let run = '';
          let from = 0;
          for (let k = 0; k <= CROSSWORD_SIZE; k++) {
            const [r, c] = dir === 'across' ? [line, k] : [k, line];
            const l = k < CROSSWORD_SIZE ? squares.get(cellKey(r, c)) : undefined;
            if (l) {
              if (!run) from = k;
              run += l;
              continue;
            }
            if (run.length >= 2) {
              const [sr, sc] = dir === 'across' ? [line, from] : [from, line];
              assert.ok(p.entries.some((e) => e.dir === dir && e.row === sr && e.col === sc && e.word === run), `${answer}: stray ${run}`);
            }
            run = '';
          }
        }
      }
      // Numbers go up in reading order.
      const starts = [...new Map(p.entries.map((e) => [e.number, e.row * 100 + e.col])).entries()].sort((x, y) => x[0] - y[0]);
      starts.forEach(([n, pos], k) => {
        assert.equal(n, k + 1);
        if (k) assert.ok(pos > starts[k - 1][1]);
      });
    }
  }
});

test('crossword: won as soon as the shaded squares are right; words check on their own', () => {
  const p = generateCrossword('TABLE', clueWords, new Set(), new Rng(4));
  const letters: Record<string, string> = {};
  assert.equal(crosswordWon(p, letters), false);
  p.shaded.forEach(([r, c], k) => (letters[cellKey(r, c)] = p.answer[k]));
  assert.equal(crosswordWon(p, letters), true);
  assert.ok(p.entries.every((e) => entrySolved(e, fullLetters(p))));
  delete letters[cellKey(...p.shaded[0])];
  assert.equal(crosswordWon(p, letters), false);
  assert.ok(crosswordWon(p, fullLetters(p)));
});

test('word search: lines, either-way reading, and the leftovers spell the hidden word', () => {
  assert.deepEqual(lineBetween([0, 0], [2, 2]), [[0, 0], [1, 1], [2, 2]]);
  assert.deepEqual(lineBetween([2, 0], [0, 0]), [[2, 0], [1, 0], [0, 0]]);
  assert.equal(lineBetween([0, 0], [1, 2]), null);
  const c = generateCase(content, 5, 'medium');
  const p = sceneWordSearch(c, c.games.find((g) => g.kind === 'wordsearch')!);
  const w = p.words[0];
  assert.equal(wordAt(p, w.cells)?.word, w.word);
  assert.equal(wordAt(p, w.cells.slice().reverse())?.word, w.word);
  assert.equal(wordAt(p, w.cells.slice(1)), null);
});

test('scene games build for 30 cases of each difficulty', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
    for (let n = 1; n <= 30; n++) {
      const c = generateCase(content, n, difficulty);
      const room = content.house.rooms.find((r) => r.id === c.sceneRoom)!;
      const cwSpec = c.games.find((g) => g.kind === 'crossword')!;
      const wsSpec = c.games.find((g) => g.kind === 'wordsearch')!;
      assert.ok(room.things.includes(cwSpec.scene!.answer) && room.things.includes(wsSpec.scene!.answer));
      assert.ok(cwSpec.scene!.text.includes(room.name) && cwSpec.scene!.text.includes(cwSpec.scene!.answer.toLowerCase()));
      const cw = sceneCrossword(cwSpec);
      assert.equal(cw.shaded.map(([r, col]) => solutionAt(cw, r, col)).join(''), cwSpec.scene!.answer);
      assert.deepEqual(sceneCrossword(cwSpec), cw, 'same case, same crossword');
      const answer = wsSpec.scene!.answer;
      const ws = sceneWordSearch(c, wsSpec);
      assert.ok(everyWordOnce(ws), `${difficulty} ${n}: a word appears twice`);
      assert.equal(leftovers(ws).map(([r, col]) => ws.grid[r][col]).join(''), answer, `${difficulty} ${n}`);
      assert.ok(ws.grid.join('').split('.').length - 1 <= 4, `${difficulty} ${n}: too many blanks`);
      // Same case, same puzzle.
      assert.deepEqual(sceneWordSearch(c, c.games.find((g) => g.kind === 'wordsearch')!), ws);
    }
  }
});

test('any one scene game reveals the scene; the finale waits for one of them', () => {
  const c = generateCase(content, 3, 'hard');
  let p = emptyProgress();
  for (const g of c.games) if (!g.unlocksScene && g.kind !== 'finale') p = reduce(c, p, { type: 'game-finish', kind: g.kind, status: 'won', data: null });
  assert.equal(finaleOpen(c, p), false);
  assert.equal(sceneGameInPlay(c, p), null);
  p = reduce(c, p, { type: 'game-save', kind: 'wordsearch', data: {} });
  assert.equal(sceneGameInPlay(c, p), 'wordsearch');
  p = reduce(c, p, { type: 'game-finish', kind: 'crossword', status: 'revealed', data: null });
  assert.equal(sceneUnlocked(c, p), true);
  assert.equal(sceneText(c, p), c.games.find((g) => g.kind === 'crossword')!.scene!.text);
  assert.equal(sceneGameInPlay(c, p), 'crossword');
  assert.equal(finaleOpen(c, p), true);
  assert.deepEqual(c.games.filter((g) => g.unlocksScene).map((g) => g.kind), [...SCENE_GAMES]);
});
