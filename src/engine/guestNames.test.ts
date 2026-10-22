import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { campaignCast, campaignGuests, campaignRound, type CampaignRef } from './campaign.ts';
import { codeFor, caseFor } from './caseRef.ts';
import { generateCase } from './generate.ts';
import { guestContent, guestName, guestNames } from './guestNames.ts';

test('heirs are the elder and younger when both are at dinner', () => {
  const guests = ['host', 'elder-heir', 'younger-heir'];
  assert.equal(guestName(content, guests, 'elder-heir'), 'The Elder heir');
  assert.equal(guestName(content, guests, 'younger-heir'), 'The Younger heir');
});

test('one heir present is "The Heir"', () => {
  assert.equal(guestName(content, ['host', 'elder-heir'], 'elder-heir'), 'The Heir');
  assert.equal(guestName(content, ['host', 'younger-heir'], 'younger-heir'), 'The Heir');
});

test('an absent heir does not count, but a victim heir does', () => {
  // The guest list is seated guests plus the victim, so a victim heir is in it.
  assert.equal(guestName(content, ['host', 'elder-heir', 'younger-heir'], 'elder-heir'), 'The Elder heir');
  assert.equal(guestName(content, ['host', 'butler'], 'elder-heir'), 'The Heir');
});

test('guests without a kin-mate keep their name, unknown ids come back as given', () => {
  assert.equal(guestName(content, ['host'], 'host'), 'The Host');
  assert.equal(guestName(content, [], 'nobody'), 'nobody');
  assert.equal(guestNames(content, ['elder-heir']).detective, 'The Detective');
  assert.equal(guestContent(content, ['elder-heir']).suspects.find((s) => s.id === 'elder-heir')!.name, 'The Heir');
});

test('a case never prints "The Heir" next to the other heir, and text matches the guest list', () => {
  for (let n = 1; n <= 40; n++) {
    for (const c of [generateCase(content, n, 'easy'), generateCase(content, n, 'hard')]) {
      const both = c.guests.includes('elder-heir') && c.guests.includes('younger-heir');
      const text = c.clues.map((cl) => cl.text).join('\n');
      if (both) assert.ok(!text.includes('The Heir') && !text.includes('the Heir'), `case ${n}`);
      else assert.ok(!text.includes('Elder heir') && !text.includes('Younger heir'), `case ${n}`);
    }
  }
});

const ref = (n: number): CampaignRef => ({ mode: 'campaign', code: codeFor(n * 104_729), difficulty: 'medium' });

test('every mode names a victim who is not a suspect or the killer, the same every time', () => {
  const cases = [
    generateCase(content, 3, 'easy'),
    generateCase(content, 6, 'medium'),
    generateCase(content, 9, 'hard'),
    generateCase(content, 4, { suspects: 7, logic: 'medium', minigames: 'medium', length: 'normal' }),
    caseFor(content, { mode: 'play', code: 'K7QF2' }),
    caseFor(content, { mode: 'quick', code: 'K7QF2', difficulty: 'medium', length: 'normal' }),
    caseFor(content, { mode: 'play', code: 'K7QF2', games: ['wordle', 'cats', 'board'] }),
  ];
  for (const c of cases) {
    assert.ok(!c.suspects.includes(c.victim), c.code);
    assert.notEqual(c.victim, c.murderer);
    assert.deepEqual(c.guests, [...c.suspects, c.victim]);
    assert.ok(content.suspects.some((s) => s.id === c.victim));
  }
  assert.equal(generateCase(content, 6, 'medium').victim, cases[1].victim);
});

test('campaign: round 1 victim is the first victim, later rounds the last wrong accusation, guests constant', () => {
  const r = ref(4);
  const cast = campaignCast(content, r);
  assert.ok(!cast.suspects.includes(cast.firstVictim));
  const wrong = cast.suspects.filter((s) => s !== cast.killer);
  const rounds = [campaignRound(content, r, []), campaignRound(content, r, [wrong[0]]), campaignRound(content, r, [wrong[0], wrong[1]])];
  assert.equal(rounds[0].victim, cast.firstVictim);
  assert.equal(rounds[1].victim, wrong[0]);
  assert.equal(rounds[2].victim, wrong[1]);
  for (const c of rounds) {
    assert.deepEqual(c.guests, campaignGuests(cast));
    assert.ok(!c.suspects.includes(c.victim));
    assert.notEqual(c.victim, c.murderer);
  }
  assert.equal(campaignRound(content, r, []).victim, rounds[0].victim);
});
