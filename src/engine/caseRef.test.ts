import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { CODE_COUNT, caseCode, caseFor, codeFor, codeNumber, newQuickCase, parseCaseCode, type PlayRef, type QuickRef } from './caseRef.ts';
import { generateCase } from './generate.ts';

test('codes are five easy-to-read characters and turn back into their number', () => {
  for (const n of [0, 1, 29, 30, 12345, 9_876_543, CODE_COUNT - 1]) {
    const code = codeFor(n);
    assert.match(code, /^[2-9A-HJKMNP-TV-Z]{5}$/);
    assert.equal(codeNumber(code), n);
  }
  assert.equal(codeFor(CODE_COUNT + 7), codeFor(7), 'wraps');
});

test('case codes read back however she types them', () => {
  const ref: QuickRef = { mode: 'quick', code: 'K7QF2', difficulty: 'medium', length: 'long' };
  assert.equal(caseCode(ref), 'K7QF2-ML');
  for (const typed of ['K7QF2-ML', 'k7qf2-ml', ' K7QF2 ML ', 'K7QF2ML']) assert.deepEqual(parseCaseCode(typed), ref, typed);
  for (const bad of ['', 'K7QF', 'K7QF2-XL', 'K7QF-ML', 'K7QO2-ML', 'K7QF22-ML', 'K7QF2-MLX']) assert.equal(parseCaseCode(bad), null, bad);
  const big: QuickRef = { ...ref, cast: 'big' };
  assert.equal(caseCode(big), 'K7QF2-MLB');
  assert.deepEqual(parseCaseCode('k7qf2 mlb'), big);
});

test('a bare code is a Play case and round-trips', () => {
  const ref: PlayRef = { mode: 'play', code: 'K7QF2' };
  assert.equal(caseCode(ref), 'K7QF2');
  for (const typed of ['K7QF2', 'k7qf2', ' K7 QF2 ']) assert.deepEqual(parseCaseCode(typed), ref, typed);
  assert.equal(parseCaseCode('K7QO2'), null);
  assert.equal(parseCaseCode('K7QF22'), null);
  for (const n of [0, 5, 4242]) assert.deepEqual(parseCaseCode(caseCode({ mode: 'play', code: codeFor(n) })), { mode: 'play', code: codeFor(n) });
});

test('same ref, same case; quick cases are their own', () => {
  const ref: QuickRef = { mode: 'quick', code: codeFor(4242), difficulty: 'easy', length: 'normal' };
  const c = caseFor(content, ref);
  assert.deepEqual(caseFor(content, ref), c);
  assert.equal(c.code, ref.code);
  assert.equal(c.number, 4242);
  assert.notEqual(c.seed, generateCase(content, 4242, 'easy').seed);
  assert.notEqual(c.seed, caseFor(content, { ...ref, length: 'long' }).seed);
});

test('a new quick case comes from the random numbers it is given', () => {
  const numbers = [111, 222];
  const { ref, c } = newQuickCase(content, 'hard', 'short', 'classic', () => numbers.shift()!);
  assert.equal(ref.code, codeFor(111));
  assert.equal(c.difficulty, 'hard');
  assert.deepEqual(c.levels.length, 'short');
});

test('a big-cast quick case has 7 guests, and its own seed', () => {
  const ref: QuickRef = { mode: 'quick', code: codeFor(99), difficulty: 'medium', length: 'long', cast: 'big' };
  const c = caseFor(content, ref);
  assert.equal(c.suspects.length, 7);
  assert.equal(c.levels.suspects, 7);
  assert.notEqual(c.seed, caseFor(content, { ...ref, cast: undefined }).seed);
});
