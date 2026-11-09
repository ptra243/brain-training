import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { ROUNDS, type CampaignRef } from '../engine/campaign.ts';
import { codeFor } from '../engine/caseRef.ts';
import { newCampaign, roundCase, updateRound } from '../game/campaignSave.ts';
import { resolveHeld } from '../game/face.ts';
import { itemName, suspectName } from '../game/names.ts';
import { accusable, askedFirst, earlierTries, guessWarning, laterScene, possibleNow } from './campaignAnswer.ts';

const ref: CampaignRef = { mode: 'campaign', code: codeFor(104_729), difficulty: 'medium' };
const start = newCampaign(ref);
const c0 = roundCase(content, start, 0);
const wrong = c0.suspects.find((s) => s !== c0.murderer)!;

/** The save after one wrong accusation in round one, applied the way the questioning's end does. */
function afterWrong() {
  const held = { ...start, rounds: [{ ...start.rounds[0], accusations: [{ suspect: wrong, item: c0.weapon, correct: 1 }] }] };
  return resolveHeld(held, c0);
}

test('a wrong accusation held then resolved is the next body', () => {
  const { save, verdict } = afterWrong();
  assert.equal(verdict, 'next-body');
  assert.deepEqual(save.victims, [wrong]);
  assert.equal(save.rounds.length, 2);
});

test('the later scene names the new body, the candles left and the chapter it leads to', () => {
  const { save } = afterWrong();
  const s = laterScene('next-body', save, c0.guests);
  assert.equal(s.heading, `${suspectName(wrong, c0.guests)} wasn't the killer`);
  assert.match(s.text, /^Later that night, /);
  assert.ok(s.text.endsWith(`you have ${ROUNDS - 1} accusations left.`));
  assert.equal(s.nextTime, 'midnight');
  assert.equal(s.lit, ROUNDS - 1);
});

test('the wrong-weapon scene says so, and the last chance reads as one', () => {
  const { save } = afterWrong();
  const w = laterScene('wrong-weapon', save, c0.guests);
  assert.equal(w.heading, 'Wrong weapon, and the killer walks free');
  assert.match(w.text, /^You named the killer, but with the wrong weapon you could not hold them\. Later that night, /);
  const last = { ...save, victims: ['a', 'b'] };
  assert.match(laterScene('next-body', last, c0.guests).text, / this is your last chance\.$/);
});

test('earlier chapters list their wrong tries, crossed-out style, oldest first', () => {
  assert.deepEqual(earlierTries(start, c0.guests), []);
  const { save } = afterWrong();
  assert.deepEqual(earlierTries(save, c0.guests), [`Chapter one: ${suspectName(wrong, c0.guests).replace(/^The /, 'the ')}, with the ${itemName(c0.weapon)}`]);
});

test('a chapter with no try yet adds nothing to the list', () => {
  const { save } = afterWrong();
  assert.equal(earlierTries(save, c0.guests).length, 1);
  const two = updateRound(save, roundCase(content, save, 1), { ...save.rounds[1], accusations: [{ suspect: 'x', item: 'y', correct: 0 }] });
  assert.equal(earlierTries(two.save, c0.guests).length, 2);
  assert.match(earlierTries(two.save, c0.guests)[1], /^Chapter two: /);
});

test('only possible killers limit the blanks when she chose that; otherwise everyone is listed', () => {
  const some = c0.suspects.slice(0, 2);
  assert.deepEqual(accusable(start, c0, some), c0.suspects);
  const only = { ...start, ref: { ...ref, possibleOnly: true } };
  assert.deepEqual(accusable(only, c0, some), some);
});

test('the possible killers are some of this round guests and always include the killer', () => {
  const p = possibleNow(start, [{ ...c0, explore: true } as typeof c0]);
  assert.ok(p.length > 0 && p.length <= c0.suspects.length);
  assert.ok(p.includes(c0.murderer));
  assert.ok(p.every((id) => c0.suspects.includes(id)));
});

test('the guess warning appears only while several people are still possible', () => {
  assert.equal(guessWarning(1), null);
  assert.equal(guessWarning(0), null);
  assert.equal(guessWarning(4), 'Your clues still point at 4 people. Guess now?');
});

test('a questioning can start with its first questions already asked', () => {
  const puzzle = { questions: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] } as unknown as Parameters<typeof askedFirst>[0];
  assert.deepEqual(askedFirst(puzzle, 2), { asked: ['a', 'b'], strikes: 0, caught: false });
  assert.deepEqual(askedFirst(puzzle, 0).asked, []);
});
