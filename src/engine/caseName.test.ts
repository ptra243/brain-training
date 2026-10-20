import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caseNameWords as words } from '../content/caseNames.ts';
import { content } from '../content/index.ts';
import { themeWords } from '../game/sceneGames.ts';
import { CODE_COUNT, caseName, codeFor, parseCase, parseCaseName, playLevels, type PlayRef, type QuickRef } from './caseRef.ts';
import type { Difficulty } from './types.ts';
import type { Length } from './settings.ts';

const refs = (code: string): QuickRef[] =>
  (['easy', 'medium', 'hard'] as Difficulty[]).flatMap((difficulty) =>
    (['short', 'normal', 'long'] as Length[]).flatMap((length) => [
      { mode: 'quick' as const, code, difficulty, length },
      { mode: 'quick' as const, code, difficulty, length, cast: 'big' as const },
    ]),
  );

test('the word lists cover every code and every level', () => {
  assert.equal(words.kinds.length, 18);
  const { adjectives, nouns, placeStarts, placeEnds } = words;
  assert.ok(adjectives.length * nouns.length * placeStarts.length * placeEnds.length >= CODE_COUNT);
  for (const list of Object.values(words)) {
    assert.equal(new Set(list).size, list.length, 'no repeats');
    for (const w of list) assert.match(w, /^[a-z]+$/);
  }
  // "The Secret Iris Secret" reads badly.
  assert.deepEqual(adjectives.filter((a) => words.kinds.includes(a)), [], 'no descriptor is also a kind word');
});

test('every place splits back into its start and end one way only', () => {
  for (const s of words.placeStarts)
    for (const e of words.placeEnds) {
      const place = s + e;
      const splits = words.placeStarts.filter((s2) => place.startsWith(s2) && words.placeEnds.includes(place.slice(s2.length)));
      assert.deepEqual(splits, [s], place);
    }
});

test('names never use a room, suspect, weapon or anything in a room', () => {
  const theme = themeWords(content);
  for (const w of [...words.adjectives, ...words.nouns, ...words.kinds]) assert.ok(!theme.has(w.toUpperCase()), w);
});

test('a name reads back as the Play case of its code, for any code and levels', () => {
  for (const n of [0, 1, 99, 100, 12345, 9_876_543, 499_999, 500_000, CODE_COUNT - 1])
    for (const ref of refs(codeFor(n))) {
      const name = caseName(ref, words);
      assert.match(name, /^The [A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+ at [A-Z][a-z]+$/);
      assert.deepEqual(parseCaseName(name, words), { mode: 'play', code: ref.code }, name);
    }
});

test('a Play name uses the kind word of its rolled logic and guests', () => {
  for (let n = 0; n < 200; n++) {
    const code = codeFor(n * 7919);
    const ref: PlayRef = { mode: 'play', code };
    const name = caseName(ref, words);
    assert.deepEqual(parseCaseName(name, words), ref, name);
    const levels = playLevels(code);
    const quick: QuickRef = { mode: 'quick', code, difficulty: levels.logic, length: 'normal', ...(levels.suspects === 7 && { cast: 'big' as const }) };
    assert.equal(name, caseName(quick, words));
  }
});

test('different levels of one code get different names', () => {
  assert.equal(new Set(refs('K7QF2').map((r) => caseName(r, words))).size, 18);
});

test('names are fixed: changing the word lists breaks saved names', () => {
  const ref: QuickRef = { mode: 'quick', code: 'K7QF2', difficulty: 'medium', length: 'normal' };
  assert.equal(caseName(ref, words), 'The Sunken Jaguar Scandal at Stonewick');
});

test('typing a name back is forgiving', () => {
  const old: QuickRef = { mode: 'quick', code: 'K7QF2', difficulty: 'medium', length: 'normal' };
  const ref: PlayRef = { mode: 'play', code: 'K7QF2' };
  const name = caseName(old, words);
  const [, adj, noun, kind, place] = name.split(' ').filter((w) => w !== 'at');
  for (const typed of [name, name.toLowerCase(), `  ${adj} ${noun} ${kind} ${place}  `, `${adj}, ${noun} ${kind} at ${place.slice(0, 3)} ${place.slice(3)}`])
    assert.deepEqual(parseCase(typed, words), ref, typed);
  assert.deepEqual(parseCase('K7QF2-MN', words), old, 'old codes still work');
  assert.deepEqual(parseCase('K7QF2', words), ref, 'bare codes are Play cases');
  for (const bad of ['', 'The Teacup Affair', `The ${noun} ${adj} ${kind} at ${place}`, `The ${adj} ${noun} ${kind} at Nowhere`])
    assert.equal(parseCase(bad, words), null, bad);
});
