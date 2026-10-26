import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { codeFor, caseFor, type CaseRef } from '../engine/caseRef.ts';
import type { CampaignRef } from '../engine/campaign.ts';
import { currentRound, newCampaign, roundCase, updateRound, type CampaignSave } from './campaignSave.ts';
import { HISTORY_CAP, campaignPending, emptyHistory, quickPending, recordCampaign, recordQuick } from './history.ts';
import { emptyProgress, reduce } from './state.ts';
import { clearSaves, loadHistory, saveHistory } from './storage.ts';
import type { QuickSave } from './storage.ts';

const quickRef: CaseRef = { mode: 'play', code: 'K7QF2' };
const qc = caseFor(content, quickRef);
const solved = (): QuickSave => ({ ref: quickRef, progress: reduce(qc, emptyProgress(), { type: 'accuse', suspect: qc.murderer, item: qc.weapon }) });
const fresh = (): QuickSave => ({ ref: quickRef, progress: emptyProgress() });

let n = 0;
const mint = () => `id-${++n}`;
const DATE = '2026-10-23';

test('quick: recording twice makes one row', () => {
  const a = recordQuick(solved(), qc, emptyHistory(), mint, DATE);
  assert.equal(a.history.quick.length, 1);
  assert.equal(a.history.quickTotals.cases, 1);
  assert.equal(a.save.historyId, a.history.quick[0].id);
  const b = recordQuick(a.save, qc, a.history, mint, DATE);
  assert.equal(b.history.quick.length, 1);
  assert.equal(b.history.quickTotals.cases, 1);
  assert.equal(quickPending(a.save, a.history), false);
});

test('quick: backfill mints an id for a finished save without one', () => {
  const s = solved();
  assert.equal(s.historyId, undefined);
  assert.equal(quickPending(s, emptyHistory()), true);
  const r = recordQuick(s, qc, emptyHistory(), () => 'minted', DATE);
  assert.equal(r.save.historyId, 'minted');
  assert.equal(r.history.quick[0].id, 'minted');
});

test('quick: an id with no row (crash between the two writes) still records, once', () => {
  const s = { ...solved(), historyId: 'orphan' };
  assert.equal(quickPending(s, emptyHistory()), true);
  const r = recordQuick(s, qc, emptyHistory(), () => assert.fail('should keep its id'), DATE);
  assert.equal(r.history.quick[0].id, 'orphan');
});

test('unfinished runs add nothing', () => {
  const r = recordQuick(fresh(), qc, emptyHistory(), () => assert.fail('no id'), DATE);
  assert.deepEqual(r.history, emptyHistory());
  assert.equal(quickPending(fresh(), emptyHistory()), false);
  const camp = newCampaign({ mode: 'campaign', code: codeFor(5), difficulty: 'easy' });
  const rc = recordCampaign(camp, [], emptyHistory(), () => assert.fail('no id'), DATE);
  assert.deepEqual(rc.history, emptyHistory());
  assert.equal(campaignPending(camp, emptyHistory()), false);
});

test('the cap of 30 drops old rows but the totals keep growing', () => {
  let h = emptyHistory();
  for (let i = 0; i < HISTORY_CAP + 5; i++) h = recordQuick(solved(), qc, h, mint, DATE).history;
  assert.equal(h.quick.length, HISTORY_CAP);
  assert.equal(h.quickTotals.cases, HISTORY_CAP + 5);
  assert.equal(new Set(h.quick.map((r) => r.id)).size, HISTORY_CAP);
});

const cref: CampaignRef = { mode: 'campaign', code: codeFor(31_337), difficulty: 'medium' };
function caught(): { save: CampaignSave; cases: ReturnType<typeof roundCase>[] } {
  let save = newCampaign(cref);
  const c = roundCase(content, save, currentRound(save));
  save = updateRound(save, c, reduce(c, save.rounds[0], { type: 'accuse', suspect: c.murderer, item: c.weapon })).save;
  return { save, cases: save.rounds.map((_, i) => roundCase(content, save, i)) };
}

test('campaign: caught is recorded once, newest first', () => {
  const { save, cases } = caught();
  assert.equal(save.outcome, 'caught');
  const a = recordCampaign(save, cases, emptyHistory(), mint, DATE);
  const b = recordCampaign(a.save, cases, a.history, mint, DATE);
  assert.equal(b.history.campaign.length, 1);
  assert.equal(b.history.campaignTotals.caught, 1);
  assert.equal(b.history.campaignTotals.caughtAt9, 1);
  const c = recordCampaign({ ...save, historyId: undefined }, cases, b.history, mint, DATE);
  assert.equal(c.history.campaign.length, 2);
  assert.notEqual(c.history.campaign[0].id, c.history.campaign[1].id);
});

test('clearSaves leaves the history alone', () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { localStorage?: unknown };
  const before = g.localStorage;
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  try {
    const h = recordQuick(solved(), qc, emptyHistory(), mint, DATE).history;
    saveHistory(h);
    for (const k of ['quick', 'campaign', 'screen']) store.set(`brain-training:v11:${k}`, '{}');
    clearSaves();
    assert.deepEqual(loadHistory(), h);
    assert.deepEqual([...store.keys()].filter((k) => !k.endsWith(':history')), []);
  } finally {
    g.localStorage = before;
  }
});
