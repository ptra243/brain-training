// Cases at every level combination, built and checked by caseChecks.ts: 20 cases per preset (100 with SWEEP_FULL=1) and
// 1 per other combination of levels (10), so any combination can be offered. Prints the clue stats per preset.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { FULL, sweep } from '../sweep.ts';
import { problems, stats } from './caseChecks.ts';
import { generateCase } from './generate.ts';
import { PRESETS, allLevels, levelsKey, presetOf } from './settings.ts';
import type { Difficulty } from './types.ts';

const PER_PRESET = FULL ? 100 : 20;
const PER_COMBINATION = FULL ? 10 : 1;
const lines: string[] = [];
let counted = 0;

for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
  const counts: number[] = [];
  const types = new Map<string, number>();
  const started = performance.now();
  sweep(`${difficulty} preset cases`, Array.from({ length: PER_PRESET }, (_, i) => i + 1), (n) => {
    const c = generateCase(content, n, PRESETS[difficulty]);
    assert.deepEqual(problems(c), [], `${levelsKey(PRESETS[difficulty])} case ${n}`);
    counts.push(c.clues.length);
    for (const cl of c.clues) types.set(cl.fact.type, (types.get(cl.fact.type) ?? 0) + 1);
  });
  test(`${difficulty} preset stats`, () => {
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    lines.push(
      `${difficulty.padEnd(6)} clues min ${Math.min(...counts)}  avg ${avg.toFixed(1)}  max ${Math.max(...counts)}  ` + `(${((performance.now() - started) / PER_PRESET).toFixed(1)} ms per case)`,
      '        ' + [...types].sort((a, b) => b[1] - a[1]).map(([t, k]) => `${t} ${k}`).join(', '),
    );
    counted += PER_PRESET;
  });
}

const others = allLevels().filter((l) => !presetOf(l));
let slowest = { label: '', ms: 0 };
sweep('other combinations', others.map((_, i) => i), (i) => {
  const levels = others[i];
  const started = performance.now();
  for (let n = 1; n <= PER_COMBINATION; n++) assert.deepEqual(problems(generateCase(content, n, levels)), [], `${levelsKey(levels)} case ${n}`);
  const ms = (performance.now() - started) / PER_COMBINATION;
  if (ms > slowest.ms) slowest = { label: levelsKey(levels), ms };
  counted += PER_COMBINATION;
});

test('summary', (t) => {
  for (const l of lines) t.diagnostic(l);
  t.diagnostic(`${others.length} other combinations × ${PER_COMBINATION} cases (slowest ${slowest.label}, ${slowest.ms.toFixed(1)} ms per case)`);
  t.diagnostic(`Cases counted toward the total: ${counted}`);
  t.diagnostic(`Talk: ${stats.talk.guests} guests have a thread; ${stats.talk.short} still have a beat waiting for the solved case once every game is done`);
  t.diagnostic(`Case boards:${stats.boards.puzzles} puzzles and ${stats.boards.ends} end boards built (slowest ${stats.boards.slowest.toFixed(0)} ms)`);
});
