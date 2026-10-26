import assert from 'node:assert/strict';
import { test } from 'node:test';
import { content } from '../content/index.ts';
import { problems, walkCampaign } from './caseChecks.ts';
import { caseFor, codeFor, pickedInOrder } from './caseRef.ts';
import { generateCase } from './generate.ts';
import { PRESETS } from './settings.ts';

test('preset cases 1 and 2 pass every case check', () => {
  for (const n of [1, 2]) assert.deepEqual(problems(generateCase(content, n, PRESETS.medium)), [], `case ${n}`);
});

test('Play cases (plain and picked) pass every case check', () => {
  const plain = caseFor(content, { mode: 'play', code: codeFor(1_215_773) });
  assert.deepEqual(problems(plain), []);
  const picked = caseFor(content, { mode: 'play', code: codeFor(2_654_435), games: pickedInOrder(['nosing', 'tarot', 'board']) });
  assert.deepEqual(problems(picked), []);
});

test('a campaign walks its rounds without problems', () => {
  const r = walkCampaign({ mode: 'campaign', code: codeFor(2_654_435), difficulty: 'easy' }, 'campaign', 'two');
  assert.deepEqual(r.problems, []);
  assert.ok(r.rounds >= 2);
});

test('a case with a second solution is reported', () => {
  const c = generateCase(content, 1, PRESETS.easy);
  const fewer = { ...c, clues: c.clues.slice(0, 1) };
  assert.ok(problems(fewer).some((p) => /solutions/.test(p)));
});
