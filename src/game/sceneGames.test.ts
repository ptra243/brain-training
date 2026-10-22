import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { hardClueWords, mediumClueWords } from '../content/crosswordWords.ts';
import { clueWords } from '../content/words.ts';
import { generateCase } from '../engine/generate.ts';
import { Rng } from '../engine/rng.ts';
import { SCENE_GAMES, isSceneGame } from '../engine/gameKinds.ts';
import type { Difficulty } from '../engine/types.ts';
import {
  CROSSWORD_SIZE,
  cellKey,
  crosswordFull,
  crosswordHint,
  crosswordWon,
  entryCells,
  entryLabel,
  entrySolved,
  fullLetters,
  generateCrossword,
  newlyWrong,
  shadedRight,
  solutionAt,
} from '../games/crossword.ts';
import { lineBetween, wordAt } from '../games/wordsearch.ts';
import { emptyProgress, finaleOpen, reduce, sceneGameInPlay, sceneText, sceneUnlocked } from './state.ts';
import { crosswordWords, sceneWordSearch, themeWords } from './sceneGames.ts';
import { CROSSWORD_SIZES, crosswordSeed, roomThings, sceneCaseSeed } from './sceneGamesSweeps.ts';

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

test('harder crossword words: 4–11 letters, no repeats with each other or the everyday list', () => {
  const seen = new Set(clueWords.map((w) => w.word));
  for (const [list, max] of [[mediumClueWords, 9], [hardClueWords, 11]] as const) {
    for (const { word, clue } of list) {
      assert.match(word, new RegExp(`^[A-Z]{4,${max}}$`));
      assert.ok(!seen.has(word), `${word} twice`);
      seen.add(word);
      assert.ok(clue.length > 2 && !clue.endsWith('.'), word);
      assert.ok(!clue.toUpperCase().includes(word), `${word}: clue gives it away`);
    }
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

test('every room thing can be hidden in an interlocking crossword (each at one grid size; check-cases tries every size)', () => {
  roomThings().forEach((answer, k) => {
    const [size] = CROSSWORD_SIZES[k % CROSSWORD_SIZES.length];
    crosswordSeed(answer, size, 1);
  });
});

test('crossword: the shaded squares let her stop early, but only the whole grid wins', () => {
  const p = generateCrossword('TABLE', clueWords, new Set(), new Rng(4));
  const letters: Record<string, string> = {};
  assert.equal(shadedRight(p, letters), false);
  p.shaded.forEach(([r, c], k) => (letters[cellKey(r, c)] = p.answer[k]));
  assert.equal(shadedRight(p, letters), true);
  assert.equal(crosswordWon(p, letters), false, 'not won with just the shaded squares');
  const full = fullLetters(p);
  assert.ok(p.entries.every((e) => entrySolved(e, full)));
  assert.ok(crosswordWon(p, full) && crosswordFull(p, full));
  // Every square filled but one letter wrong: full, not won.
  const [r0, c0] = entryCells(p.entries[0])[0];
  const wrong = { ...full, [cellKey(r0, c0)]: full[cellKey(r0, c0)] === 'Q' ? 'X' : 'Q' };
  assert.ok(crosswordFull(p, wrong) && !crosswordWon(p, wrong));
});

test('crossword hints: wrong letters first, then a word, then its letters until it is solved', () => {
  const p = generateCrossword('TABLE', clueWords, new Set(), new Rng(4));
  let letters: Record<string, string> = {};
  const first = p.entries[0];
  const [r0, c0] = entryCells(first)[0];
  const bad = first.word[0] === 'Q' ? 'X' : 'Q';
  letters[cellKey(r0, c0)] = bad;

  const wrong = crosswordHint(p, letters);
  assert.deepEqual(wrong, { kind: 'wrong', squares: { [cellKey(r0, c0)]: bad } });
  const flagged = { [cellKey(r0, c0)]: bad };
  // Pointed out once; a different wrong letter there is new.
  assert.deepEqual(newlyWrong(p, letters, flagged), {});
  assert.ok(Object.keys(newlyWrong(p, { ...letters, [cellKey(r0, c0)]: bad === 'Q' ? 'X' : 'Q' }, flagged)).length);

  const nudge = crosswordHint(p, letters, { flagged });
  assert.equal(nudge?.kind, 'nudge');
  if (nudge?.kind !== 'nudge') return;
  assert.ok(nudge.shadedSquares > 0, 'points at a word with an unsolved shaded square');
  const state = { flagged, nudged: entryLabel(nudge.entry) };

  // Taking letter hints fills that word and nothing else, then moves on.
  for (let n = 0; n < nudge.entry.word.length; n++) {
    const h = crosswordHint(p, letters, state);
    assert.equal(h?.kind, 'letter');
    if (h?.kind !== 'letter') return;
    assert.equal(h.entry, nudge.entry);
    assert.equal(h.letter, solutionAt(p, ...h.square));
    assert.notEqual(letters[cellKey(...h.square)], h.letter, 'never a square she already has');
    letters = { ...letters, [cellKey(...h.square)]: h.letter };
    if (entrySolved(nudge.entry, letters)) break;
  }
  assert.ok(entrySolved(nudge.entry, letters));
  assert.equal(crosswordHint(p, letters, state)?.kind === 'letter', false, 'solved word: a new nudge (or wrong letters) next');
  assert.equal(crosswordHint(p, fullLetters(p)), null);
});

test('crossword hints always lead to a win, on every size of grid', () => {
  for (let seed = 1; seed <= 36; seed++) {
    const size = [CROSSWORD_SIZE, 9, 11][seed % 3];
    const p = generateCrossword('TABLE', crosswordWords(size), new Set(), new Rng(seed), size);
    let letters: Record<string, string> = {};
    let state: { flagged?: Record<string, string>; nudged?: string } = {};
    let asks = 0;
    while (!crosswordWon(p, letters)) {
      const h = crosswordHint(p, letters, state)!;
      if (h.kind === 'wrong') state = { ...state, flagged: { ...state.flagged, ...h.squares } };
      else if (h.kind === 'nudge') state = { ...state, nudged: entryLabel(h.entry) };
      else letters = { ...letters, [cellKey(...h.square)]: h.letter };
      assert.ok(++asks < 400, `seed ${seed}: hints go round in circles`);
    }
  }
});

test('word search: lines, either-way reading, and the leftovers spell the hidden word', () => {
  assert.deepEqual(lineBetween([0, 0], [2, 2]), [[0, 0], [1, 1], [2, 2]]);
  assert.deepEqual(lineBetween([2, 0], [0, 0]), [[2, 0], [1, 0], [0, 0]]);
  assert.equal(lineBetween([0, 0], [1, 2]), null);
  const c = generateCase(content, 5, 'medium');
  const p = sceneWordSearch(c, c.games.filter(isSceneGame).find((g) => g.kind === 'wordsearch')!);
  const w = p.words[0];
  assert.equal(wordAt(p, w.cells)?.word, w.word);
  assert.equal(wordAt(p, w.cells.slice().reverse())?.word, w.word);
  assert.equal(wordAt(p, w.cells.slice(1)), null);
});

test('scene games build for 2 cases of each difficulty (check-cases tries 10)', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) for (let n = 1; n <= 2; n++) sceneCaseSeed(difficulty, n);
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
  assert.equal(sceneText(c, p), c.games.filter(isSceneGame).find((g) => g.kind === 'crossword')!.scene.text);
  assert.equal(sceneGameInPlay(c, p), 'crossword');
  assert.equal(finaleOpen(c, p), true);
  assert.deepEqual(c.games.filter((g) => g.unlocksScene).map((g) => g.kind), [...SCENE_GAMES]);
});
