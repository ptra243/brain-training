import { allHouses, houseOf } from '../content/houses.ts';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { generateCase } from '../engine/generate.ts';
import { Rng } from '../engine/rng.ts';
import { isSceneGame } from '../engine/gameKinds.ts';
import type { Difficulty } from '../engine/types.ts';
import { CROSSWORD_SIZE, cellKey, entryCells, generateCrossword, solutionAt } from '../games/crossword.ts';
import { everyWordOnce, leftovers } from '../games/wordsearch.ts';
import { crosswordWords, sceneCrossword, sceneWordSearch, themeWords } from './sceneGames.ts';

/**
 * The sweeps behind the slow scene-game tests. `npm test` runs each crossword answer at one grid size and a few cases;
 * `sceneGames.sweep.ts` runs other sizes (quick) or every size and the first 10 cases of each difficulty (SWEEP_FULL=1).
 */

/** Every distinct room thing, the shaded-word answers. */
export const roomThings = (): string[] => [...new Set(content.house.rooms.flatMap((r) => r.things))];
/** Every thing any house hides (the manor's and the other houses', such as CROQUET), sorted: the crossword answers. */
export const crosswordAnswers = (): string[] => [...new Set(allHouses.flatMap((h) => h.rooms.flatMap((r) => r.things)))].sort();
/** The crossword sizes and the fewest words each grid must hold. */
export const CROSSWORD_SIZES: readonly [number, number][] = [[CROSSWORD_SIZE, 6], [9, 8], [11, 11]];
const exclude = themeWords(content);

/** One room thing hidden in a crossword of this size: the grid is interlocking and fair. */
export function crosswordSeed(answer: string, size: number, seed: number): void {
  const fewest = CROSSWORD_SIZES.find(([n]) => n === size)![1];
  const p = generateCrossword(answer, crosswordWords(size), exclude, new Rng(seed), size);
  // The shaded squares, in order, spell the word, and are all different squares.
  assert.equal(p.shaded.map(([r, c]) => solutionAt(p, r, c)).join(''), answer);
  assert.equal(new Set(p.shaded.map(([r, c]) => cellKey(r, c))).size, answer.length);
  assert.ok(p.entries.length >= fewest, `${answer}: only ${p.entries.length} words`);
  assert.ok(p.entries.some((e) => e.dir === 'across') && p.entries.some((e) => e.dir === 'down'), 'both directions');
  assert.equal(new Set(p.entries.map((e) => e.word)).size, p.entries.length, 'no repeated words');
  const squares = new Map<string, string>();
  for (const e of p.entries) {
    assert.ok(!exclude.has(e.word) && e.word !== answer, e.word);
    const cells = entryCells(e);
    for (const [r, c] of cells) assert.ok(r >= 0 && c >= 0 && r < size && c < size, `${e.word} off the grid`);
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
    for (let line = 0; line < size; line++) {
      let run = '';
      let from = 0;
      for (let k = 0; k <= size; k++) {
        const [r, c] = dir === 'across' ? [line, k] : [k, line];
        const l = k < size ? squares.get(cellKey(r, c)) : undefined;
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

/** The scene word games of case `n` at a difficulty build, spell their word, and repeat. */
export function sceneCaseSeed(difficulty: Difficulty, n: number): void {
  const c = generateCase(content, n, difficulty);
  const room = houseOf(c).rooms.find((r) => r.id === c.sceneRoom)!;
  const cwSpec = c.games.filter(isSceneGame).find((g) => g.kind === 'crossword')!;
  const wsSpec = c.games.filter(isSceneGame).find((g) => g.kind === 'wordsearch')!;
  assert.ok(room.things.includes(cwSpec.scene.answer) && room.things.includes(wsSpec.scene.answer));
  assert.ok(cwSpec.scene.text.includes(room.name) && cwSpec.scene.text.includes(cwSpec.scene.answer.toLowerCase()));
  const cw = sceneCrossword(cwSpec);
  assert.equal(cw.shaded.map(([r, col]) => solutionAt(cw, r, col)).join(''), cwSpec.scene.answer);
  assert.deepEqual(sceneCrossword(cwSpec), cw, 'same case, same crossword');
  const answer = wsSpec.scene.answer;
  const ws = sceneWordSearch(c, wsSpec);
  assert.ok(everyWordOnce(ws), `${difficulty} ${n}: a word appears twice`);
  assert.equal(leftovers(ws).map(([r, col]) => ws.grid[r][col]).join(''), answer, `${difficulty} ${n}`);
  assert.ok(ws.grid.join('').split('.').length - 1 <= 4, `${difficulty} ${n}: too many blanks`);
  // Same case, same puzzle.
  assert.deepEqual(sceneWordSearch(c, c.games.filter(isSceneGame).find((g) => g.kind === 'wordsearch')!), ws);
}
