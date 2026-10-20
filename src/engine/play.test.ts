import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { caseContext, caseSpace } from './caseFacts.ts';
import { caseFor, codeFor, playLevels } from './caseRef.ts';
import { generateCase } from './generate.ts';
import { countMatching } from './search.ts';
import { caseSettings, gameLevel } from './settings.ts';
import type { Case, SceneKind } from './types.ts';

const codes = (n: number) => Array.from({ length: n }, (_, i) => codeFor(i * 1_000_003 + 17));
const play = (code: string): Case => caseFor(content, { mode: 'play', code });
const WORD_GAMES: SceneKind[] = ['wordle', 'crossword', 'wordsearch'];

test('same code, same Play case and levels; different codes differ', () => {
  const [a, b] = codes(2);
  assert.deepEqual(play(a), play(a));
  assert.deepEqual(playLevels(a), playLevels(a));
  assert.notDeepEqual(play(a), play(b));
  assert.notEqual(play(a).seed, play(b).seed);
});

test('rolled levels reach the game specs', () => {
  for (const code of codes(30)) {
    const levels = playLevels(code);
    const c = play(code);
    const s = caseSettings(levels);
    assert.equal(c.difficulty, levels.logic, code);
    assert.equal(c.suspects.length, levels.suspects, code);
    for (const g of c.games) {
      if (g.kind === 'finale') assert.equal(g.level, undefined, code);
      else if (g.kind === 'wordle' || g.kind === 'crossword') assert.equal(g.level, undefined, code);
      else assert.equal(g.level, levels.perGame![g.kind], `${code} ${g.kind}`);
      if (g.kind === 'crossword') {
        const size = { easy: 7, medium: 9, hard: 11 }[levels.perGame!.crossword!];
        assert.equal(g.size, size, code);
        assert.equal(s.crosswordSize, size, code);
      }
      if (g.kind === 'cats') {
        assert.equal(g.size, s.catSize, code);
        assert.equal(g.easy, s.catEasy ? true : undefined, code);
      }
      if (g.kind === 'sudoku') {
        assert.equal(g.size, s.sudoku.size, code);
        assert.equal(g.givens, s.sudoku.givens, code);
      }
    }
    assert.equal(gameLevel(levels, 'cats'), levels.perGame!.cats);
  }
});

test('Play cases have one solution, no free clues and a blanked clue per word game', () => {
  for (const code of codes(40)) {
    const c = play(code);
    assert.equal(c.sceneGiven, true, code);
    assert.equal(countMatching(caseSpace(c), c.clues.map((cl) => cl.fact), caseContext(content.house, c), 2), 1, code);
    assert.ok(c.clues.every((cl) => cl.delivery !== 'given'), code);
    for (const g of c.games) if (g.kind !== 'finale') assert.ok(g.clues.length >= 1, `${code} ${g.kind}`);
    for (const g of c.games.filter((x) => WORD_GAMES.includes(x.kind as SceneKind))) {
      if (g.unlocksScene !== true) throw new Error('word game');
      const blanked = c.clues.filter((cl) => cl.blank);
      const mine = blanked.filter((cl) => cl.blank!.game === g.kind);
      assert.equal(mine.length, 1, `${code} ${g.kind}`);
      const cl = mine[0];
      assert.ok(g.clues.includes(cl.id), code);
      assert.equal(cl.blank!.answer, g.scene.answer, code);
      assert.equal(g.scene.text, cl.text, code);
      assert.ok(canLocateRoom(cl), code);
      const room = content.house.rooms.find((r) => r.id === (cl.fact as { room: string }).room)!;
      assert.ok((g.kind === 'wordle' ? room.objects : room.things).includes(g.scene.answer), `${code} ${g.kind}`);
      for (const r of content.house.rooms) assert.ok(!cl.blank!.teaser.includes(r.name), `${code} teaser names ${r.name}`);
      assert.ok(!cl.blank!.teaser.toLowerCase().includes(g.scene.answer.toLowerCase()), code);
    }
    assert.equal(c.clues.filter((cl) => cl.blank).length, c.games.filter((g) => WORD_GAMES.includes(g.kind as SceneKind)).length, code);
  }
});

const canLocateRoom = (cl: { fact: object }) => 'room' in cl.fact;

test('numbered cases are untouched by Play fields', () => {
  const c = generateCase(content, 5);
  assert.equal(c.sceneGiven, undefined);
  assert.ok(!('sceneGiven' in c));
  for (const g of c.games) assert.ok(!('level' in g), g.kind);
  assert.ok(c.clues.every((cl) => !('blank' in cl)));
});

test('the crossword rolls its own level, appended so earlier rolls are unchanged', () => {
  const sizes = new Set<number>();
  for (const code of codes(40)) {
    const levels = playLevels(code);
    assert.ok(['easy', 'medium', 'hard'].includes(levels.perGame!.crossword!), code);
    sizes.add(caseSettings(levels).crosswordSize);
  }
  assert.deepEqual([...sizes].sort((a, b) => a - b), [7, 9, 11]);
});

test('Play cases draw 3 to 5 games (more only when the clues need them), and harder games get at least their share', () => {
  const counts = new Set<number>();
  for (const code of codes(40)) {
    const c = play(code);
    const levels = playLevels(code);
    const games = c.games.filter((g) => g.kind !== 'finale');
    const held = games.reduce((n, g) => n + g.clues.length, 0);
    counts.add(games.length);
    assert.ok(games.length >= 1 && games.length <= 7, code);
    if (games.length > 5) assert.ok(held > 5 * 7 - 7, `${code}: ${games.length} games for ${held} clues`);
    const weight = (g: (typeof games)[number]) => ({ easy: 1, medium: 2, hard: 3 })[levels.perGame?.[g.kind] ?? 'easy'];
    const sum = games.reduce((n, g) => n + weight(g), 0);
    for (const g of games) {
      assert.ok(g.clues.length <= 7, `${code} ${g.kind}`);
      // Tarot stands in for a drawn game and keeps that game's clue share, so its own rolled level says nothing about it.
      if (!games.some((x) => x.kind === 'tarot') && g.kind !== 'sudoku' && !games.some((x) => x.kind === 'sudoku' && x.clues.length === 2)) {
        assert.ok(g.clues.length >= Math.min(7, Math.floor((held * weight(g)) / sum)) - 1, `${code} ${g.kind}`);
      }
    }
  }
  assert.ok([3, 4, 5].every((n) => counts.has(n)), [...counts].join());
});
