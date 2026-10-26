// Boards: random plans (the same maker as board.test.ts) built and checked
// against every rule, plus how often a plan fails to build. board.test.ts keeps
// plans 1-12; this takes 40 more spread over the rest (quick) or every plan
// from 13 to PLANS (SWEEP_FULL=1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FULL, seedsOf, sweep } from '../sweep.ts';
import { buildTimed, checkBoard, makePlan } from './boardSweeps.ts';

const FIRST = 12; // plans 1..12 belong to board.test.ts
const PLANS = 312;
const COUNT = 40;
// Measured failures: see .claude/handoff/case-check-split/pieceF.md.
const MAX_FAIL_RATE = 0.02; // measured 0 of 300; so quick (40 plans) allows none, full (300) up to 6

const seeds = seedsOf(FIRST, PLANS, COUNT).filter((n) => n >= FIRST).map((n) => n + 1);
let built = 0;
let failed = 0;
let slowest = 0;
let slowestSeed = 0;

sweep('board rules on random plans', seeds, (seed) => {
  const plan = makePlan(seed);
  const { board, ms } = buildTimed(plan);
  if (ms > slowest) {
    slowest = ms;
    slowestSeed = seed;
  }
  if (!board) {
    failed++;
    return;
  }
  built++;
  checkBoard(plan, board);
});

test('summary', (t) => {
  const rate = failed / seeds.length;
  t.diagnostic(`Boards: ${seeds.length} random plans (${FULL ? 'full' : 'quick'}), ${built} built, ${failed} failed (${(rate * 100).toFixed(1)}%), slowest build ${slowest}ms (plan ${slowestSeed})`);
  assert.ok(rate <= MAX_FAIL_RATE, `${failed} of ${seeds.length} plans failed to build (bound ${MAX_FAIL_RATE * 100}%)`);
});
