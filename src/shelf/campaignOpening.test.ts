import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { codeFor } from '../engine/caseRef.ts';
import { newCampaign, roundCase } from '../game/campaignSave.ts';
import { openingScript } from '../game/opening.ts';
import { reduce } from '../game/state.ts';
import { catReady, guestRows, meetAction, openingActive } from './campaignOpening.ts';

const save = newCampaign({ mode: 'campaign', code: codeFor(104_729), difficulty: 'medium' });
const c = { ...roundCase(content, save, 0), explore: true as const };
const fresh = save.rounds[0];

test('the opening is on while chapter one has one that is not done', () => {
  assert.equal(openingActive(0, 0, fresh, false, false), true);
  assert.equal(openingActive(0, 0, { ...fresh, opening: { talked: [], done: true } }, false, false), false);
  assert.equal(openingActive(0, 0, { ...fresh, opening: undefined }, false, false), false);
  assert.equal(openingActive(0, 1, fresh, false, false), false, 'a later chapter has moved on');
  assert.equal(openingActive(0, 0, fresh, true, false), false, 'read only');
  assert.equal(openingActive(0, 0, fresh, false, true), false, 'an accusation is held');
});

test('each guest is met once, in seating order, and the rows tick', () => {
  const rows = guestRows(c, fresh);
  assert.deepEqual(rows.map((r) => r.guest), c.suspects);
  assert.ok(rows.every((r) => !r.met));
  const who = c.suspects[1];
  const act = meetAction(fresh, who);
  assert.deepEqual(act, { type: 'opening-talk', guest: who });
  const next = reduce(c, fresh, act!);
  assert.equal(meetAction(next, who), null, 'already met: nothing to dispatch');
  assert.deepEqual(guestRows(c, next).filter((r) => r.met).map((r) => r.guest), [who]);
  assert.equal(guestRows(c, next).reduce((n, r) => n + r.clues, 0), openingScript(c).guests.reduce((n, g) => n + g.clues.length, 0));
});

test('the cat comes after every guest, and only with something to show', () => {
  assert.equal(catReady(c, fresh), false);
  let p = fresh;
  for (const g of c.suspects) p = reduce(c, p, { type: 'opening-talk', guest: g });
  assert.equal(catReady(c, p), openingScript(c).catClues.length > 0);
  assert.equal(meetAction({ ...p, opening: { ...p.opening!, done: true } }, 'x'), null);
});
