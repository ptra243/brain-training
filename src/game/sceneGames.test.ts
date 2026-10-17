import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { clueWords } from '../content/words.ts';
import { generateCase } from '../engine/generate.ts';
import { Rng } from '../engine/rng.ts';
import { SCENE_GAMES, type Difficulty } from '../engine/types.ts';
import { CROSSWORD_WIDTH, crosswordWon, emptyEntries, generateCrossword, rowSolved, setCell, shadedIndex } from '../games/crossword.ts';
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

test('every room thing can be hidden in a crossword', () => {
  const objects = [...new Set(content.house.rooms.flatMap((r) => r.things))];
  const exclude = themeWords(content);
  for (const answer of objects) {
    const p = generateCrossword(answer, clueWords, exclude, new Rng(1));
    assert.equal(p.rows.map((row, r) => row.word[shadedIndex(p, r)]).join(''), answer);
    for (const row of p.rows) {
      assert.ok(!exclude.has(row.word), row.word);
      assert.ok(row.start >= 0 && row.start + row.word.length <= CROSSWORD_WIDTH, `${answer}: ${row.word} off the grid`);
    }
    assert.equal(new Set(p.rows.map((r) => r.word)).size, p.rows.length, 'no repeated rows');
  }
});

test('crossword: won as soon as the shaded column is right; rows check on their own', () => {
  const p = generateCrossword('TABLE', clueWords, new Set(), new Rng(4));
  let e = emptyEntries(p);
  assert.equal(crosswordWon(p, e), false);
  p.rows.forEach((row, r) => (e = setCell(e, r, shadedIndex(p, r), row.word[shadedIndex(p, r)])));
  assert.equal(crosswordWon(p, e), true);
  assert.equal(rowSolved(p, e, 0), p.rows[0].word.length === 1);
  e = setCell(e, 0, shadedIndex(p, 0), '');
  assert.equal(crosswordWon(p, e), false);
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
      assert.equal(cw.rows.length, cwSpec.scene!.answer.length);
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
