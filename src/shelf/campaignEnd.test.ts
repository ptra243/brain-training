import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { ROUNDS, type CampaignRef } from '../engine/campaign.ts';
import { codeFor } from '../engine/caseRef.ts';
import type { Case } from '../engine/types.ts';
import { newCampaign, roundCase, updateRound, type CampaignSave } from '../game/campaignSave.ts';
import { itemName, suspectName } from '../game/names.ts';
import { closingFor, earlierVerdict, escapedScene, nightFor, viewedRound } from './campaignEnd.ts';

const ref: CampaignRef = { mode: 'campaign', code: codeFor(104_729), difficulty: 'medium' };

/** A campaign where she names `wrong` innocents then, if `win`, the killer with the right weapon. */
function play(wrong: number, win: boolean): { save: CampaignSave; cases: Case[] } {
  let save = newCampaign(ref);
  const cases: Case[] = [];
  for (let i = 0; i < Math.min(wrong + (win ? 1 : 0), ROUNDS); i++) {
    const c = roundCase(content, save, i);
    cases.push(c);
    const hit = win && i === wrong;
    const suspect = hit ? c.murderer : c.suspects.find((s) => s !== c.murderer)!;
    save = updateRound(save, c, { ...save.rounds[i], accusations: [{ suspect, item: c.weapon, correct: hit ? 2 : 0 }] }).save;
  }
  return { save, cases };
}

test('the night: a short step per earlier round, then the last in full', () => {
  const { save, cases } = play(1, true);
  assert.equal(save.outcome, 'caught');
  const steps = nightFor(save, cases);
  const short = steps.filter((s) => s.earlier);
  assert.equal(short.length, 1);
  assert.equal(short[0].guest, save.rounds[0].accusations[0].suspect);
  const full = steps.filter((s) => !s.earlier);
  assert.equal(full.length, cases[1].suspects.length);
  assert.equal(full.at(-1)!.guest, cases[1].murderer);
  assert.ok(full.every((s) => s.round === 1));
});

test('a first-round catch has no short steps', () => {
  const { save, cases } = play(0, true);
  assert.ok(nightFor(save, cases).every((s) => !s.earlier));
});

test('the got-away scene names the third body and the weapon, and the last candle goes out', () => {
  const { save, cases } = play(ROUNDS, false);
  assert.equal(save.outcome, 'escaped');
  const c = cases[ROUNDS - 1];
  const s = escapedScene(save, c);
  assert.equal(s.heading, 'The killer got away');
  assert.ok(s.text.startsWith(`${suspectName(save.victims.at(-1)!, c.guests)} was the third body.`));
  assert.ok(s.text.includes(`with the ${itemName(c.weapon)}.`));
  assert.equal(s.lit, 0);
  assert.equal(s.button, 'See the case');
});

test('the closing page: caught names the room, escaped does not', () => {
  const caught = play(1, true);
  const a = closingFor(caught.save, caught.cases[1]);
  assert.equal(a.heading, 'Case closed');
  assert.ok(a.room);
  assert.equal(a.note, 'Solved in 2 accusations.');
  const lost = play(ROUNDS, false);
  const b = closingFor(lost.save, lost.cases[ROUNDS - 1]);
  assert.equal(b.heading, 'The killer got away');
  assert.equal(b.room, null);
  assert.equal(b.note, 'Three wrong guesses, and by dawn they were gone.');
});

test('an earlier chapter: the wrong person, or the right one with the wrong weapon', () => {
  const { save, cases } = play(2, false);
  const v = earlierVerdict(save, 0, cases[0]);
  assert.equal(v.heading, '9pm: the wrong person');
  assert.match(v.line, /^You accused .*They weren't the killer, and they were the next body\.$/);
  const walked = { ...save, rounds: [{ ...save.rounds[0], accusations: [{ suspect: cases[0].murderer, item: cases[0].weapon, correct: 1 }] }, ...save.rounds.slice(1)] };
  const w = earlierVerdict(walked, 0, cases[0]);
  assert.equal(w.heading, '9pm: the wrong weapon');
  assert.match(w.line, /walked free/);
});

test('the viewed chapter resets when the current one moves on', () => {
  assert.equal(viewedRound(null, 2), 2);
  assert.equal(viewedRound({ index: 0, at: 2 }, 2), 0);
  assert.equal(viewedRound({ index: 0, at: 1 }, 2), 2);
  assert.equal(viewedRound({ index: 2, at: 2 }, 2), 2);
});
