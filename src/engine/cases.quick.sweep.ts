// Cases from the player-facing modes: Quick start (every difficulty, length and cast), Quick play codes, picked games
// ("Choose games") and every combination of three or more picked games, plus two scans over Play codes until each
// level has 5 Tarot and 5 Nosing cases. Each case is built and checked by caseChecks.ts. nosingProblems checks the
// board, the lock, the questions and that a run meets the dog; it does not play the fight.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { nosingChecked } from '../games/nosingSweeps.ts';
import { FULL, sweep } from '../sweep.ts';
import { problems, stats } from './caseChecks.ts';
import { PICK_ORDER, caseCode, caseFor, codeFor, pickedInOrder, type Cast, type PlayRef, type QuickRef } from './caseRef.ts';
import { Rng, hashSeed } from './rng.ts';
import { DIFFICULTIES, LENGTHS } from './settings.ts';

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const PER_QUICK = FULL ? 20 : 2;
const PER_PLAY = FULL ? 50 : 15;
const PER_PICK = FULL ? 40 : 10;
const CASTS: Cast[] = ['classic', 'big'];
const QUICK_CHOICES = DIFFICULTIES.length * LENGTHS.length * CASTS.length;

// Quick start: every difficulty, length and cast she can pick, from codes spread over the range.
for (const difficulty of DIFFICULTIES) {
  for (const length of LENGTHS) {
    for (const cast of CASTS) {
      sweep(`quick start, ${difficulty} ${length} ${cast}`, range(PER_QUICK), (i) => {
        const ref: QuickRef = { mode: 'quick', code: codeFor(i * 1_215_773), difficulty, length, cast };
        assert.deepEqual(problems(caseFor(content, ref)), [], `quick ${caseCode(ref)}`);
      });
    }
  }
}

// Quick play: the code alone rolls the levels.
let playMs = 0;
sweep('quick play codes', range(PER_PLAY), (i) => {
  const started = performance.now();
  const ref: PlayRef = { mode: 'play', code: codeFor(i * 1_215_773) };
  assert.deepEqual(problems(caseFor(content, ref)), [], `play ${caseCode(ref)}`);
  playMs += performance.now() - started;
});

// The Play stats as they stood after Quick play alone (the picked and scanned cases add to the live counts).
let playLine = '';
test('quick play stats', () => {
  playLine =
    `${PER_PLAY} Quick play codes (${(playMs / PER_PLAY).toFixed(0)} ms per case): ` +
    `${stats.play.sceneBlanks} of ${stats.play.blanks} word games blank a scene-room clue; games drawn ${[...stats.play.games].sort((a, b) => a[0] - b[0]).map(([n, k]) => `${n}: ${k}`).join(', ')}`;
});

// Picked cases ("Choose games"): her games plus any top-ups, checked like any Play case.
sweep('picked cases', range(PER_PICK), (i) => {
  const rng = new Rng(hashSeed(`check-pick-${i}`));
  const games = rng.shuffle([...PICK_ORDER]).slice(0, 3 + rng.int(PICK_ORDER.length - 2));
  const ref: PlayRef = { mode: 'play', code: codeFor(i * 2_654_435), games: pickedInOrder(games) };
  const c = caseFor(content, ref);
  assert.deepEqual(problems(c), [], `picked ${caseCode(ref)}`);
  for (const g of ref.games!) assert.ok(c.games.some((x) => x.kind === g), `picked ${caseCode(ref)}: missing ${g}`);
});

// Every combination of three or more picked games builds with every picked game in it (picked.test.ts checks every 12th).
// Full: all of them; quick: every 12th, offset by 6 so the test's sample is not repeated.
const codes = ['K7QF2', 'B3M9X', 'Z4HRT'];
let combos = 0;
const comboCases: { code: string; games: (typeof PICK_ORDER)[number][] }[] = [];
for (let m = 1; m < 1 << PICK_ORDER.length; m++) {
  const games = PICK_ORDER.filter((_, i) => m & (1 << i));
  if (games.length < 3) continue;
  const stress = games.length === PICK_ORDER.length || (games.length === 3 && games.includes('tarot') && games.includes('board'));
  const some = stress ? codes : [codes[combos % codes.length]];
  const mine = FULL || combos % 12 === 6;
  combos++;
  if (!mine) continue;
  for (const code of some) comboCases.push({ code, games });
}
sweep('picked combinations', comboCases, ({ code, games }) => {
  const ref: PlayRef = { mode: 'play', code, games };
  const c = caseFor(content, ref);
  for (const g of games) assert.ok(c.games.some((x) => x.kind === g), `combination ${caseCode(ref)}: missing ${g}`);
  for (const g of c.games) {
    if (g.kind !== 'finale') assert.ok(g.clues.length >= 1 && g.clues.length <= 7, `combination ${caseCode(ref)}: ${g.kind} has ${g.clues.length} clues`);
  }
});

// Tarot match and Nosing around: keep drawing Play codes until every level has a few cases (each checked like any case).
// The counts include the Tarot and Nosing games of the cases above, as before.
const WANT = 5;
let tarotCodes = 0;
let nosingCodes = 0;
let inCases = { ...nosingChecked };
let tarotAtScan = { ...stats.tarot };
/** Scans Play codes from `start` until every level has WANT of `count()`'s games; checks each case that holds the game. */
function scan(name: string, start: number, stop: number, kind: string, count: () => Record<string, number>): number {
  let codesScanned = 0;
  for (let i = start; i < stop && DIFFICULTIES.some((d) => count()[d] < WANT); i++) {
    const ref: PlayRef = { mode: 'play', code: codeFor(i * 1_215_773) };
    codesScanned++;
    const c = caseFor(content, ref);
    if (!c.games.some((g) => g.kind === kind)) continue;
    assert.deepEqual(problems(c), [], `play ${caseCode(ref)}`);
  }
  for (const d of DIFFICULTIES) assert.ok(count()[d] >= WANT, `${name}: only ${count()[d]} ${d} cases in ${codesScanned} Play codes`);
  return codesScanned;
}
test('tarot scan', () => {
  tarotCodes = scan('tarot', 1000, 3000, 'tarot', () => stats.tarot);
  tarotAtScan = { ...stats.tarot };
});
test('nosing scan', () => {
  nosingCodes = scan('nosing', 5000, 9000, 'nosing', () => nosingChecked);
  inCases = { ...nosingChecked };
});

test('summary', (t) => {
  t.diagnostic(`${QUICK_CHOICES} Quick start choices × ${PER_QUICK} codes`);
  t.diagnostic(playLine);
  t.diagnostic(`${PER_PICK} picked cases`);
  t.diagnostic(`${comboCases.length} picked-game cases from ${FULL ? 'all' : 'every 12th of'} ${combos} combinations of three or more games`);
  t.diagnostic(`Tarot match: easy ${tarotAtScan.easy}, medium ${tarotAtScan.medium}, hard ${tarotAtScan.hard} cases checked (${tarotCodes} extra Play codes scanned)`);
  t.diagnostic(`Nosing around: easy ${inCases.easy}, medium ${inCases.medium}, hard ${inCases.hard} Play cases checked (${nosingCodes} extra Play codes scanned)`);
  t.diagnostic(`Cases counted toward the total: ${QUICK_CHOICES * PER_QUICK + PER_PLAY}`);
  t.diagnostic(`Talk: ${stats.talk.guests} guests have a thread; ${stats.talk.short} still have a beat waiting for the solved case once every game is done`);
  t.diagnostic(`Case boards:${stats.boards.puzzles} puzzles and ${stats.boards.ends} end boards built (slowest ${stats.boards.slowest.toFixed(0)} ms)`);
});
