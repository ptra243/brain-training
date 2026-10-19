import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { generateCase } from './generate.ts';
import { PRESETS, allLevels, caseSettings, clueShares, levelsKey, presetOf } from './settings.ts';

test('every combination of levels has its own key, and presets keep their old names', () => {
  const levels = allLevels();
  assert.equal(levels.length, 3 * 3 * 3 * 3);
  assert.equal(new Set(levels.map(levelsKey)).size, levels.length);
  for (const d of ['easy', 'medium', 'hard'] as const) {
    assert.equal(presetOf(PRESETS[d]), d);
    assert.equal(levelsKey(PRESETS[d]), d);
  }
});

test('a preset name and its levels give the same case', () => {
  for (const d of ['easy', 'medium', 'hard'] as const) {
    assert.deepEqual(generateCase(content, 4, d), generateCase(content, 4, PRESETS[d]));
  }
});

test('clue shares: every clue handed out once, every game gets 1 to the most it may hold', () => {
  for (const levels of allLevels()) {
    const s = caseSettings(levels);
    for (let total = 4; total <= 24; total++) {
      for (let sudokuAt = -1; sudokuAt < s.games; sudokuAt++) {
        const { free, finale, games } = clueShares(total, s, sudokuAt);
        const where = `${levelsKey(levels)}, ${total} clues, sudoku at ${sudokuAt}`;
        assert.equal(free + finale + games.reduce((a, b) => a + b, 0), total, where);
        assert.equal(games.length, s.games, where);
        for (const g of games) assert.ok(g >= 1 && g <= s.maxPerGame, `${where}: a game gets ${g}`);
        assert.ok(free >= 0 && finale >= 0 && finale <= 2, where);
        if (!s.finale) assert.equal(finale, 0, where);
      }
    }
  }
});

test('clue shares: a sudoku gets two when there are enough to go round', () => {
  const s = caseSettings({ ...PRESETS.medium, length: 'long' });
  for (let total = 6; total <= 20; total++) {
    for (let at = 0; at < 3; at++) assert.ok(clueShares(total, s, at).games[at] >= 2, `${total} clues, sudoku at ${at}`);
  }
});

test('length sets how many rotating games a case has', () => {
  for (const [length, count] of [['short', 1], ['normal', 2], ['long', 3]] as const) {
    for (let n = 1; n <= 5; n++) {
      const c = generateCase(content, n, { ...PRESETS.medium, length });
      const rotating = c.games.filter((g) => !g.unlocksScene && g.kind !== 'finale');
      assert.equal(rotating.length, count, `${length} case ${n}`);
      assert.deepEqual(c.levels, { ...PRESETS.medium, length });
    }
  }
});

test('minigame level sets the cat puzzle and sudoku, separately from the logic', () => {
  // A long case that kept both its cat puzzle and its sudoku (the case board sometimes stands in for one).
  const levels = { ...PRESETS.hard, minigames: 'easy' as const, length: 'long' as const };
  const c = [2, 3, 4, 5, 6, 7, 8].map((n) => generateCase(content, n, levels)).find((x) => x.games.some((g) => g.kind === 'cats') && x.games.some((g) => g.kind === 'sudoku'))!;
  assert.equal(c.difficulty, 'hard');
  const cats = c.games.find((g) => g.kind === 'cats')!;
  const sudoku = c.games.find((g) => g.kind === 'sudoku')!;
  assert.equal(cats.size, 6);
  assert.equal(cats.easy, true);
  assert.equal(sudoku.size, 6);
  assert.ok(c.games.some((g) => g.kind === 'finale'), 'hard logic still has a finale');
});
