import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CampaignRef } from '../engine/campaign.ts';
import { tarotInitial } from '../games/tarot.ts';
import { nosingInitial } from '../games/nosing.ts';
import { boardInitial } from './board/boardSave.ts';
import { newCampaign } from './campaign.ts';
import { catsInitial, crosswordInitial, interrogationInitial, wordSearchInitial, wordleInitial } from './games/saveData.ts';
import {
  PLAY_VERSION,
  isBoardSave,
  isCatsData,
  isCrosswordData,
  isInterrogationData,
  isNosingState,
  isSudokuData,
  isTarotState,
  isWordSearchData,
  isWordleData,
  sanitizeCampaign,
  sanitizeProgress,
  sanitizeQuick,
} from './saveGuards.ts';
import { emptyProgress, type Progress } from './state.ts';

const filled: Progress = {
  marks: { 'suspect-room|a|b': 'x', 'item-room|c|d': 'o' },
  used: ['c1', 'c2'],
  accusations: [{ suspect: 'a', item: 'b', correct: 1 }],
  solved: true,
  games: {
    wordle: { status: 'won', data: { guesses: ['crane'] } },
    cats: { status: 'playing', data: { marks: { '0,0': 'cat' } } },
    sudoku: { status: 'revealed' },
  },
  found: ['c3'],
  gridHints: { flagged: { 'k|a|b': 'x' }, target: 'k|a|b', step: 'why', count: 2 },
  endBoard: { key: 'c1,c2', save: { placed: {} } },
  talk: { a: 2 },
};
const campaignRef: CampaignRef = { mode: 'campaign', code: 'K7QF2', difficulty: 'medium', possibleOnly: true, endBoard: false, perPuzzle: 2 };

test('valid saves come back deep-equal', () => {
  assert.deepEqual(sanitizeProgress(emptyProgress()), emptyProgress());
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(filled))), filled);
  const camp = { ...newCampaign(campaignRef), victims: ['a'], rounds: [filled, emptyProgress()], picked: [['cats', 'board'], []], outcome: 'caught' as const };
  assert.deepEqual(sanitizeCampaign(JSON.parse(JSON.stringify(camp))), camp);
  assert.deepEqual(sanitizeCampaign(newCampaign({ mode: 'campaign', code: 'AAAAA', difficulty: 'easy' })), newCampaign({ mode: 'campaign', code: 'AAAAA', difficulty: 'easy' }));
  const refs = [
    { mode: 'quick', code: 'K7QF2', difficulty: 'hard', length: 'long', cast: 'big', endBoard: true },
    { mode: 'quick', code: 'K7QF2', difficulty: 'easy', length: 'short' },
    { mode: 'play', code: 'K7QF2' },
    { mode: 'play', code: 'K7QF2', games: ['wordle', 'cats', 'nosing'] },
  ] as const;
  for (const ref of refs) {
    const save = JSON.parse(JSON.stringify({ ref, progress: filled, playVersion: PLAY_VERSION }));
    assert.deepEqual(sanitizeQuick(save), { ref, progress: filled });
  }
});

const sudoku = { grid: [1, 0, 3, 4], flagged: { 1: 2 }, nudged: 1, explained: 2, hints: 1, notes: { 1: [1, 2] }, showCandidates: true };
const guards: [string, (v: unknown) => boolean, unknown[], unknown[]][] = [
  ['cats', isCatsData, [catsInitial(), { marks: { '0,0': 'cat', '1,1': 'dot' }, flagged: { '1,1': 'dot' }, nudged: 'm', explained: 'm', hints: 2 }], [{ marks: { '0,0': 'rat' } }, { marks: 'x' }, { marks: {}, hints: '2' }]],
  ['crossword', isCrosswordData, [crosswordInitial(), { letters: { '0,0': 'A' }, flagged: { '0,0': 'B' }, nudged: '3 down', hints: 1, size: 7 }], [{ letters: [1] }, { letters: {}, size: '7' }]],
  ['sudoku', isSudokuData, [{ grid: [] }, sudoku], [{ grid: 'x' }, { grid: ['1'] }, { grid: [1], notes: { 1: 'a' } }, { grid: [1], showCandidates: 1 }]],
  ['wordsearch', isWordSearchData, [wordSearchInitial(), { found: ['cat'] }], [{ found: 'cat' }, { found: [1] }]],
  ['wordle', isWordleData, [wordleInitial(), { guesses: ['crane'] }], [{ guesses: [1] }, { guesses: 'crane' }]],
  ['interrogation', isInterrogationData, [interrogationInitial(), { asked: ['q'], strikes: 1, caught: true }], [{ asked: [], strikes: '1', caught: false }, { asked: [] }]],
  [
    'board',
    isBoardSave,
    [boardInitial(), { placed: { p: { section: 's', cells: [[0, 0]], shape: [[0, 0]] } }, rot: { p: 1 }, hints: { p: 2 }, hintCount: 3 }],
    [{ ...boardInitial(), hintCount: '2' }, { ...boardInitial(), placed: { p: { section: 's', cells: [[0]], shape: [] } } }, { rot: {}, hints: {}, hintCount: 0 }],
  ],
  ['tarot', isTarotState, [tarotInitial(), { picked: [1], matched: [2, 3], jokerGone: 4, peek: 5, seen: [1], hints: 1, peeks: 1 }], [{ ...tarotInitial(), picked: ['1'] }, { ...tarotInitial(), peek: undefined }]],
  [
    'nosing',
    isNosingState,
    [nosingInitial(), { moves: [{ t: 'roll' }, { t: 'answer', value: 4 }, { t: 'speed', right: 2 }, { t: 'combine', a: 1, b: 2, op: '+' }, { t: 'hint' }], hints: 1, solved: 'revealed' }],
    [{ moves: [{ t: 'jump' }], hints: 0 }, { moves: [{ t: 'combine', a: 1, b: 2, op: '^' }], hints: 0 }, { moves: [], hints: 0, solved: 'yes' }, { moves: 'roll', hints: 0 }],
  ],
];

for (const [name, guard, good, bad] of guards) {
  test(`${name} guard accepts real data`, () => {
    for (const v of good) assert.equal(guard(v), true, JSON.stringify(v));
  });
  test(`${name} guard rejects bad data`, () => {
    for (const v of [null, undefined, 'x', 5, [], ...bad]) assert.equal(guard(v), false, JSON.stringify(v));
  });
}

test('a malformed progress repairs field by field', () => {
  const cats = { status: 'won', data: { marks: {} } };
  const p = sanitizeProgress({ ...filled, marks: 5, used: 'a', found: [1, 'f'], solved: 'yes', talk: { a: 'x' }, gridHints: 7, endBoard: { key: 3 }, accusations: [{ suspect: 'a' }, filled.accusations[0]], games: { wordle: { status: 'nope' }, cats } });
  assert.deepEqual(p.marks, {});
  assert.deepEqual(p.used, []);
  assert.deepEqual(p.found, ['f']);
  assert.equal(p.solved, false);
  assert.equal(p.talk, undefined);
  assert.equal(p.gridHints, undefined);
  assert.equal(p.endBoard, undefined);
  assert.deepEqual(p.accusations, filled.accusations);
  assert.deepEqual(p.games, { cats });
  assert.deepEqual(sanitizeProgress({ marks: { a: 'x', b: 'z', c: 'o' } }).marks, { a: 'x', c: 'o' });
});

test('quick saves that cannot be replayed are dropped', () => {
  const ok = { ref: { mode: 'quick', code: 'K7QF2', difficulty: 'easy', length: 'short' }, progress: emptyProgress() };
  assert.notEqual(sanitizeQuick(ok), null);
  assert.equal(sanitizeQuick({ progress: emptyProgress() }), null);
  assert.equal(sanitizeQuick({ ...ok, ref: { ...ok.ref, difficulty: 'nope' } }), null);
  assert.equal(sanitizeQuick({ ...ok, ref: { ...ok.ref, code: 5 } }), null);
  assert.equal(sanitizeQuick({ ...ok, ref: { mode: 'play', code: 'K7QF2' } }), null, 'play save without the version');
  const play = { ref: { mode: 'play', code: 'K7QF2' }, progress: emptyProgress() };
  assert.equal(sanitizeQuick({ ...play, playVersion: PLAY_VERSION - 1 }), null);
  assert.equal(sanitizeQuick({ ...play, playVersion: PLAY_VERSION, ref: { mode: 'play', code: 'K7QF2', games: ['wordle', 'bogus'] } }), null);
  assert.equal(sanitizeQuick({ ...play, playVersion: PLAY_VERSION, ref: { mode: 'play', code: 'K7QF2', games: 'wordle' } }), null);
  assert.deepEqual(sanitizeQuick({ ...play, playVersion: PLAY_VERSION, progress: 'junk' })?.progress, emptyProgress());
});

test('campaign saves are repaired or dropped', () => {
  const good = { ...newCampaign(campaignRef), victims: ['a'], rounds: [filled, emptyProgress()], picked: [['cats'], ['board']], outcome: 'escaped' };
  assert.equal(sanitizeCampaign({ ...good, ref: undefined }), null);
  assert.equal(sanitizeCampaign({ ...good, ref: { ...campaignRef, perPuzzle: 3 } }), null);
  assert.equal(sanitizeCampaign({ ...good, ref: { ...campaignRef, difficulty: 'x' } }), null);
  assert.equal(sanitizeCampaign({ ...good, rounds: [] }), null);
  assert.equal(sanitizeCampaign({ ...good, rounds: 'x' }), null);
  const fixed = sanitizeCampaign({ ...good, outcome: 'won', victims: ['a', 3], rounds: [filled, 'junk'], picked: [['cats', 'bogus'], ['board']] });
  assert.equal(fixed?.outcome, 'playing');
  assert.deepEqual(fixed?.victims, ['a']);
  assert.deepEqual(fixed?.rounds, [filled, emptyProgress()]);
  assert.deepEqual(fixed?.picked, [[], ['board']]);
  assert.deepEqual(sanitizeCampaign({ ...good, victims: 'a', picked: 'x' })?.victims, []);
});

test('garbage at the top level never throws', () => {
  for (const v of [null, undefined, 'garbage', 5, true, []]) {
    assert.equal(sanitizeQuick(v), null);
    assert.equal(sanitizeCampaign(v), null);
    assert.deepEqual(sanitizeProgress(v), emptyProgress());
  }
});
