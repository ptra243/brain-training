import { test } from 'node:test';
import assert from 'node:assert/strict';
import { houseDetails } from '../content/index.ts';
import { content } from '../content/index.ts';
import { ROUNDS, type CampaignRef } from '../engine/campaign.ts';
import { codeFor } from '../engine/caseRef.ts';
import { newCampaign, roundCase } from '../game/campaignSave.ts';
import { isSceneGame } from '../engine/gameKinds.ts';
import { atMidnight, clockAfterNext, roomContents } from '../game/explore.ts';
import { emptyProgress, reduce } from '../game/state.ts';
import { questioningOf } from '../game/talk.ts';
import { accusationsLeft, candleLabel, chapterTitle, guestLine, isNightChapter, NO_PUZZLES_LEFT, personGame, roomLine, roomRowAria, roomRows, walkTargets } from './campaignBook.ts';

test('chapter titles follow the rounds', () => {
  assert.equal(chapterTitle(0), 'Chapter one: 9pm');
  assert.equal(chapterTitle(1), 'Chapter two: Midnight');
  assert.equal(chapterTitle(2), 'Chapter three: 3am');
});

test('a round outside the range is clamped', () => {
  assert.equal(chapterTitle(-1), 'Chapter one: 9pm');
  assert.equal(chapterTitle(7), 'Chapter three: 3am');
});

test('the room line names the room', () => {
  assert.equal(roomLine('Library'), 'You are in the Library.');
});

const ref: CampaignRef = { mode: 'campaign', code: codeFor(104_729), difficulty: 'medium' };
const save = newCampaign(ref);
const c = roundCase(content, save, 0);
const contents = roomContents(houseDetails, c);
const withObjects = Object.keys(contents).find((r) => contents[r].objects.length > 0)!;

test('the night chapters are Midnight and 3am', () => {
  assert.equal(isNightChapter(0), false);
  assert.equal(isNightChapter(1), true);
  assert.equal(isNightChapter(2), true);
});

test('candles: one per accusation left, labelled', () => {
  assert.equal(accusationsLeft(0), ROUNDS);
  assert.equal(accusationsLeft(1), ROUNDS - 1);
  assert.equal(accusationsLeft(ROUNDS + 2), 0);
  assert.equal(candleLabel(2), '2 accusations left');
  assert.equal(candleLabel(1), '1 accusation left');
  assert.equal(candleLabel(0), 'No accusations left');
});

test('walking goes to every other room in play', () => {
  const here = c.rooms[0];
  const to = walkTargets(c, here);
  assert.equal(to.length, c.rooms.length - 1);
  assert.ok(!to.includes(here));
});

test('open rows say how many clues and when the clock will read; a spent budget disables them', () => {
  const p = emptyProgress();
  const objects = contents[withObjects].objects;
  const budget = c.campaign!.budget;
  const open = roomRows(c, p, 'x', objects, [], budget);
  assert.equal(open.length, objects.length);
  for (const r of open) {
    assert.ok(r.enabled);
    assert.match(r.line, /^\d+ clues? · until \d+:\d\d$/);
    assert.equal(r.line.endsWith(clockAfterNext(c, p)), true);
  }
  // No picks left: only a game she already picked can still be opened.
  const shut = roomRows(c, p, 'x', objects, [], 0);
  for (const r of shut) {
    assert.equal(r.enabled, false);
    assert.equal(r.line, NO_PUZZLES_LEFT);
    assert.match(roomRowAria(r, 'Game', 'medium'), /no puzzles left tonight$/);
  }
  const kept = roomRows(c, p, 'x', objects, [objects[0].kind], 0);
  assert.equal(kept[0].enabled, true);
});

test('a guest with a questioning game: open, used up, finished, or none', () => {
  const q = c.games.find((g) => g.kind !== 'finale' && c.suspects.some((s) => questioningOf(c, s)?.kind === g.kind))!;
  const who = c.suspects.find((s) => questioningOf(c, s)?.kind === q.kind)!;
  const p = emptyProgress();
  const open = personGame(c, p, who, [], 1);
  assert.deepEqual(open, { state: 'open', kind: q.kind, clues: q.clues.length, continuing: false });
  assert.equal(guestLine(open), 'Talk, or question them');
  assert.deepEqual(personGame(c, p, who, [], 0), { state: 'used-up' });
  assert.equal(guestLine({ state: 'used-up' }), 'Talk');
  assert.equal(personGame(c, p, who, [q.kind], 0).state, 'open');
  const playing = reduce(c, p, { type: 'game-save', kind: q.kind, data: null });
  assert.equal((personGame(c, playing, who, [q.kind], 0) as { continuing: boolean }).continuing, true);
  const won = reduce(c, p, { type: 'game-finish', kind: q.kind, status: 'won', data: null });
  assert.deepEqual(personGame(c, won, who, [], 0), { state: 'done', solved: true });
  const shown = reduce(c, p, { type: 'game-finish', kind: q.kind, status: 'revealed', data: null });
  assert.deepEqual(personGame(c, shown, who, [], 0), { state: 'done', solved: false });
  const none = c.suspects.find((s) => !questioningOf(c, s));
  if (none) assert.deepEqual(personGame(c, p, none, [], 1), { state: 'none' });
});

test('a finished object shows the page-3 state text and stays openable', () => {
  const objects = contents[withObjects].objects;
  const p = reduce(c, emptyProgress(), { type: 'game-finish', kind: objects[0].kind, status: 'won', data: null });
  const [r] = roomRows(c, p, 'x', objects, [objects[0].kind], 0);
  assert.equal(r.row.done, true);
  assert.equal(r.enabled, true);
  assert.match(r.line, /clues? found$|^No new clues$/);
});

test('at midnight a finished object still opens (read-only, no pick), an unfinished one is shut', () => {
  const objects = contents[withObjects].objects;
  let p = emptyProgress();
  const budget = c.campaign!.budget;
  const games = c.games.filter((g) => g.kind !== 'finale' && !isSceneGame(g));
  for (const g of games.slice(0, budget)) p = reduce(c, p, { type: 'game-finish', kind: g.kind, status: 'won', data: null });
  assert.equal(atMidnight(c, p), true);
  for (const r of roomRows(c, p, 'x', objects, [], 0)) assert.equal(r.enabled, r.row.done);
});
