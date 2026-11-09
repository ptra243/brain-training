import assert from 'node:assert/strict';
import { test } from 'node:test';
import { content } from '../content/index.ts';
import { campaignCast } from '../engine/campaign.ts';
import { codeFor, newPlayCase } from '../engine/caseRef.ts';
import { newCampaign, roundCase, updateRound } from '../game/campaignSave.ts';
import { emptyHistory, recordCampaign, recordQuick } from '../game/history.ts';
import { emptyProgress } from '../game/state.ts';
import { bookEntries, campaignKiller, pendingRuns, signatureTilt } from './guestBook.ts';

const { ref, c } = newPlayCase(content, () => 0.5);
const unfinished = { ref, progress: emptyProgress() };
const finished = { ref, progress: { ...emptyProgress(), solved: true, accusations: [{ suspect: c.murderer, item: c.weapon, correct: 2 }] } };

const campRef = { mode: 'campaign', code: codeFor(104_729), difficulty: 'medium' } as const;
const mint = (() => {
  let n = 0;
  return () => `t-${++n}`;
})();

function finishedCampaign(caught: boolean) {
  let save = newCampaign(campRef);
  const c0 = roundCase(content, save, 0);
  save = updateRound(save, c0, { ...save.rounds[0], accusations: [{ suspect: c0.murderer, item: c0.weapon, correct: 2 }] }).save;
  return { save: caught ? save : { ...save, outcome: 'escaped' as const }, cases: [c0] };
}

test('pending: only finished runs without a row', () => {
  const h = emptyHistory();
  assert.deepEqual(pendingRuns(null, null, h), { quick: false, campaign: false });
  assert.deepEqual(pendingRuns(unfinished, null, h), { quick: false, campaign: false });
  assert.deepEqual(pendingRuns(finished, null, h), { quick: true, campaign: false });
  const camp = finishedCampaign(true).save;
  assert.equal(pendingRuns(null, camp, h).campaign, camp.outcome === 'caught');
});

test('recording twice adds one row', () => {
  const once = recordQuick(finished, c, emptyHistory(), mint, '2026-10-22');
  assert.equal(once.history.quick.length, 1);
  assert.deepEqual(pendingRuns(once.save, null, once.history), { quick: false, campaign: false });
  const twice = recordQuick(once.save, c, once.history, mint, '2026-10-23');
  assert.equal(twice.history.quick.length, 1);
  assert.equal(twice.history.quickTotals.cases, 1);
  const { save, cases } = finishedCampaign(true);
  const a = recordCampaign(save, cases, emptyHistory(), mint, '2026-10-22');
  const b = recordCampaign(a.save, cases, a.history, mint, '2026-10-23');
  assert.equal(b.history.campaign.length, a.history.campaign.length);
});

test('entries: newest first, quick before campaign on the same date, signatures', () => {
  let h = emptyHistory();
  const camp = finishedCampaign(true);
  h = recordCampaign(camp.save, camp.cases, h, mint, '2026-10-22').history;
  const esc = finishedCampaign(false);
  h = recordCampaign({ ...esc.save, historyId: undefined }, esc.cases, h, mint, '2026-10-20').history;
  h = recordQuick(finished, c, h, mint, '2026-10-22').history;
  h = recordQuick({ ...finished, historyId: undefined }, c, h, mint, '2026-10-25').history;
  const e = bookEntries(h);
  assert.deepEqual(e.map((x) => [x.kind, x.date]), [['quick', '2026-10-25'], ['quick', '2026-10-22'], ['campaign', '2026-10-22'], ['campaign', '2026-10-20']]);
  assert.ok(e[0].signature && e[0].signature.length > 0);
  assert.equal(e[2].signature, campaignKiller(camp.save.ref));
  assert.equal(e[3].signature, undefined);
  assert.equal(e[3].leftEarly, true);
  assert.equal(e[2].title, 'Medium campaign ' + campRef.code);
});

test('an old quick row has no signature', () => {
  const h = emptyHistory();
  h.quick = [{ id: 'old', ref, date: '2026-01-01', accusations: 1, hints: 0, solvedForHer: 0, solvedYourself: 1, puzzles: 1 }];
  assert.equal(bookEntries(h)[0].signature, undefined);
});

test('the campaign killer is the cast killer, by name', () => {
  assert.ok(campaignKiller(campRef).length > 0);
  assert.ok(campaignCast(content, campRef).killer);
});

test('signature tilt is small, steady and different between ids', () => {
  assert.equal(signatureTilt('abc'), signatureTilt('abc'));
  for (const id of ['a', 'b', 'xyz', 'dev-1', '']) assert.ok(Math.abs(signatureTilt(id)) <= 2.5);
  assert.notEqual(new Set(['a', 'b', 'c', 'd', 'e'].map(signatureTilt)).size, 1);
});
