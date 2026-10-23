import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { ROUNDS, campaignCast, type CampaignRef } from '../engine/campaign.ts';
import { caseFor, codeFor, type CaseRef } from '../engine/caseRef.ts';
import type { Case } from '../engine/types.ts';
import { currentRound, newCampaign, roundCase, updateRound, type CampaignSave } from './campaignSave.ts';
import {
  addCampaignRow,
  addQuickRow,
  campaignHeading,
  campaignRow,
  campaignTotalsSentence,
  dateLabel,
  effortLines,
  emptyCampaignTotals,
  emptyQuickTotals,
  hintSentence,
  hintTotal,
  localDate,
  puzzleCounts,
  puzzleSentence,
  quickClosing,
  quickRow,
  quickTotalsSentence,
  wrongWeaponSentence,
  wrongWeaponTries,
} from './runRecord.ts';
import { emptyProgress, reduce, type Action, type Progress } from './state.ts';

const quickRef: CaseRef = { mode: 'play', code: 'K7QF2' };
const qc = caseFor(content, quickRef);
const wrongItem = (c: Case) => c.items.find((i) => i !== c.weapon)!;
const wrongPerson = (c: Case) => c.suspects.find((s) => s !== c.murderer)!;

const run = (c: Case, p: Progress, ...actions: Action[]) => actions.reduce((acc, a) => reduce(c, acc, a), p);
const finish = (kind: Case['games'][number]['kind'], status: 'won' | 'revealed', data: unknown = {}): Action => ({ type: 'game-finish', kind, status, data });
const kinds = qc.games.map((g) => g.kind);

// ---------- Hints ----------

test('hint total: zero, one and many', () => {
  assert.equal(hintTotal(emptyProgress()), 0);
  assert.equal(hintTotal(run(qc, emptyProgress(), { type: 'grid-hint', hints: { count: 1 } })), 1);
  assert.equal(hintTotal(run(qc, emptyProgress(), { type: 'grid-hint', hints: { count: 7 } })), 7);
});

test('each hint source counts once, and the rest count nothing', () => {
  const p: Progress = {
    ...emptyProgress(),
    gridHints: { count: 2 },
    endBoard: { key: 'k', save: { hintCount: 3 } },
    games: {
      cats: { status: 'won', data: { hints: 1 } },
      crossword: { status: 'playing', data: { hints: 4 } },
      sudoku: { status: 'won', data: { hints: 5 } },
      tarot: { status: 'won', data: { hints: 6, peeks: 9 } },
      nosing: { status: 'won', data: { hints: 7 } },
      board: { status: 'won', data: { hintCount: 8, hints: { a: 100 } } },
      wordle: { status: 'won', data: { guesses: ['x'], hints: 50 } },
      wordsearch: { status: 'won', data: { found: [], hints: 50 } },
      interrogation: { status: 'won', data: { asked: [], hints: 50 } },
    },
  };
  assert.equal(hintTotal(p), 2 + 3 + 1 + 4 + 5 + 6 + 7 + 8);
});

test('bad data counts as zero rather than throwing', () => {
  const p: Progress = { ...emptyProgress(), games: { cats: { status: 'won', data: 'junk' }, sudoku: { status: 'won', data: { hints: 'x' } }, board: { status: 'won' } } };
  assert.equal(hintTotal(p), 0);
});

test('Solve is not a hint', () => {
  assert.equal(hintTotal(run(qc, emptyProgress(), finish(kinds[0], 'revealed', { hints: 0 }))), 0);
});

// ---------- Puzzles ----------

test('puzzle counts: won, revealed, unplayed', () => {
  const total = puzzleCounts(qc, emptyProgress()).total;
  assert.ok(total >= 3);
  assert.deepEqual(puzzleCounts(qc, emptyProgress()), { won: 0, revealed: 0, total });
  const p = run(qc, emptyProgress(), finish(kinds[0], 'won'), finish(kinds[1], 'revealed'), { type: 'game-save', kind: kinds[2], data: {} });
  assert.deepEqual(puzzleCounts(qc, p), { won: 1, revealed: 1, total });
});

test('puzzle sentence cases', () => {
  assert.equal(puzzleSentence({ solvedForHer: 1, solvedYourself: 2, puzzles: 4 }), '1 puzzle was solved for you.');
  assert.equal(puzzleSentence({ solvedForHer: 3, solvedYourself: 0, puzzles: 4 }), '3 puzzles were solved for you.');
  assert.equal(puzzleSentence({ solvedForHer: 0, solvedYourself: 4, puzzles: 4 }), 'You solved every puzzle yourself.');
  assert.equal(puzzleSentence({ solvedForHer: 0, solvedYourself: 2, puzzles: 4 }), 'You solved the puzzles you played yourself.');
  assert.equal(puzzleSentence({ solvedForHer: 0, solvedYourself: 0, puzzles: 4 }), '');
});

test('hint sentence and effort lines', () => {
  assert.equal(hintSentence(0), "You didn't ask for a hint.");
  assert.equal(hintSentence(1), 'You asked for 1 hint.');
  assert.equal(hintSentence(4), 'You asked for 4 hints.');
  assert.equal(effortLines({ hints: 4, solvedForHer: 0, solvedYourself: 3, puzzles: 3 }), 'You asked for 4 hints. You solved every puzzle yourself.');
  assert.equal(effortLines({ hints: 0, solvedForHer: 0, solvedYourself: 0, puzzles: 3 }), "You didn't ask for a hint.");
});

// ---------- Quick row ----------

test('a quick row snapshots a finished case', () => {
  let p = run(qc, emptyProgress(), { type: 'grid-hint', hints: { count: 2 } }, finish(kinds[0], 'won', { hints: 1 }), finish(kinds[1], 'revealed'));
  p = run(qc, p, { type: 'accuse', suspect: wrongPerson(qc), item: qc.weapon }, { type: 'accuse', suspect: qc.murderer, item: qc.weapon });
  const row = quickRow({ ref: quickRef, progress: p }, qc, '2026-10-22');
  assert.deepEqual(row, {
    ref: quickRef,
    date: '2026-10-22',
    accusations: 2,
    hints: 3,
    solvedForHer: 1,
    solvedYourself: 1,
    puzzles: puzzleCounts(qc, p).total,
  });
  assert.equal(quickClosing(1), 'Solved on the first accusation');
  assert.equal(quickClosing(3), 'Solved in 3 accusations');
});

test('dates', () => {
  assert.equal(localDate(new Date(2026, 9, 2, 23, 59)), '2026-10-02');
  assert.equal(dateLabel('2026-10-22'), '22 Oct');
  assert.equal(dateLabel('2026-01-05'), '5 Jan');
  assert.equal(dateLabel('junk'), 'junk');
});

// ---------- Campaign rows ----------

const ref: CampaignRef = { mode: 'campaign', code: codeFor(31_337), difficulty: 'medium', houseId: 'manor' };
const cast = campaignCast(content, ref);

function act(save: CampaignSave, action: Action) {
  const c = roundCase(content, save, currentRound(save));
  return updateRound(save, c, reduce(c, save.rounds[currentRound(save)], action)).save;
}
const accuse = (save: CampaignSave, who: (c: Case) => string, item: (c: Case) => string) => {
  const c = roundCase(content, save, currentRound(save));
  return act(save, { type: 'accuse', suspect: who(c), item: item(c) });
};
const casesOf = (save: CampaignSave) => save.rounds.map((_, i) => roundCase(content, save, i));

test('a catch at each round: heading and wrong people', () => {
  for (let wrong = 0; wrong < ROUNDS; wrong++) {
    let save = newCampaign(ref);
    for (let i = 0; i < wrong; i++) save = accuse(save, wrongPerson, (c) => c.weapon);
    save = accuse(save, (c) => c.murderer, (c) => c.weapon);
    assert.equal(save.outcome, 'caught');
    const row = campaignRow(save, casesOf(save), '2026-10-22');
    assert.equal(row.ending, 'caught');
    assert.equal(row.round, wrong + 1);
    assert.equal(row.wrongPeople, wrong);
    assert.equal(row.wrongWeaponTries, 0);
    assert.equal(campaignHeading(row.ending, row.round), `You caught the killer at ${['9pm', 'midnight', '3am'][wrong]}.`);
  }
});

test('an escape ends on round 3 with three wrong people', () => {
  let save = newCampaign(ref);
  for (let i = 0; i < ROUNDS; i++) save = accuse(save, wrongPerson, (c) => c.weapon);
  assert.equal(save.outcome, 'escaped');
  const row = campaignRow(save, casesOf(save), '2026-10-22');
  assert.equal(row.ending, 'escaped');
  assert.equal(row.round, 3);
  assert.equal(row.wrongPeople, 3);
  assert.equal(campaignHeading('escaped', 3), 'The killer got away.');
});

test('a campaign row sums hints and puzzles across rounds; unopened puzzles are unplayed', () => {
  let save = newCampaign(ref);
  let c = roundCase(content, save, 0);
  save = act(save, { type: 'grid-hint', hints: { count: 3 } });
  const gameKinds = c.games.filter((g) => !g.unlocksScene).map((g) => g.kind);
  save = act(save, finish(gameKinds[0], 'won', { hints: 1 }));
  save = accuse(save, wrongPerson, (x) => x.weapon);
  c = roundCase(content, save, 1);
  save = act(save, finish(c.games.find((g) => !g.unlocksScene)!.kind, 'revealed'));
  save = accuse(save, (x) => x.murderer, (x) => x.weapon);
  const cases = casesOf(save);
  const row = campaignRow(save, cases, '2026-10-22');
  assert.equal(row.hints, 3);
  assert.equal(row.solvedYourself, 1);
  assert.equal(row.solvedForHer, 1);
  assert.equal(row.puzzles, puzzleCounts(cases[0], save.rounds[0]).total + puzzleCounts(cases[1], save.rounds[1]).total);
  assert.ok(row.puzzles > row.solvedYourself + row.solvedForHer);
  const none = { ...row, solvedForHer: 0 };
  assert.equal(puzzleSentence(none), 'You solved the puzzles you played yourself.');
});

test('wrong weapon is not wrong person, even in the same accusation list', () => {
  const save = newCampaign(ref);
  const c = roundCase(content, save, 0);
  const p: Progress = {
    ...emptyProgress(),
    accusations: [
      { suspect: c.murderer, item: wrongItem(c), correct: 1 },
      { suspect: wrongPerson(c), item: c.weapon, correct: 1 },
      { suspect: wrongPerson(c), item: wrongItem(c), correct: 0 },
    ],
  };
  assert.equal(wrongWeaponTries(c, p), 1);
  assert.equal(wrongWeaponSentence(0), '');
  assert.equal(wrongWeaponSentence(1), '1 wrong weapon, which cost nothing.');
  assert.equal(wrongWeaponSentence(2), '2 wrong weapons, which cost nothing.');
});

test('a wrong weapon on a real campaign is counted and the next round still catches', () => {
  let save = newCampaign(ref);
  save = accuse(save, (c) => c.murderer, wrongItem);
  assert.equal(save.rounds.length, 2);
  save = accuse(save, (c) => c.murderer, (c) => c.weapon);
  const row = campaignRow(save, casesOf(save), '2026-10-22');
  assert.equal(row.wrongWeaponTries, 1);
  assert.equal(row.wrongPeople, 1);
  assert.equal(row.round, 2);
  assert.equal(cast.killer, casesOf(save)[0].murderer);
});

// ---------- Totals ----------

test('quick totals wording', () => {
  let t = emptyQuickTotals();
  const row = (accusations: number, hints: number, solvedForHer: number) => ({ ref: quickRef, date: '2026-10-22', accusations, hints, solvedForHer, solvedYourself: 0, puzzles: 4 });
  t = addQuickRow(t, row(3, 0, 0));
  assert.equal(quickTotalsSentence(t), "1 case solved. You didn't ask for a hint.");
  t = addQuickRow(t, row(1, 4, 5));
  assert.equal(t.first, 1);
  assert.equal(quickTotalsSentence(t), '2 cases solved. 1 on the first accusation. You asked for 4 hints, and 5 puzzles were solved for you.');
  assert.equal(quickTotalsSentence({ cases: 12, first: 4, hints: 37, solvedForHer: 5, solvedYourself: 0, puzzles: 48 }), '12 cases solved. 4 on the first accusation. You asked for 37 hints, and 5 puzzles were solved for you.');
  assert.equal(
    quickTotalsSentence({ cases: 2, first: 0, hints: 1, solvedForHer: 0, solvedYourself: 8, puzzles: 8 }),
    '2 cases solved. You asked for 1 hint, and you solved every puzzle yourself.',
  );
});

test('campaign totals wording', () => {
  const base = { hints: 0, solvedForHer: 0, solvedYourself: 0, puzzles: 0 };
  const say = (caught: number, caughtAt9: number, escaped: number) => campaignTotalsSentence({ ...base, campaigns: caught + escaped, caught, escaped, caughtAt9 });
  assert.equal(say(2, 1, 1), "3 campaigns. You caught the killer twice, once at 9pm. The killer got away once. You didn't ask for a hint.");
  assert.equal(say(2, 2, 0), "2 campaigns. You caught the killer twice, both at 9pm. You didn't ask for a hint.");
  assert.equal(say(4, 2, 0), "4 campaigns. You caught the killer 4 times, 2 of them at 9pm. You didn't ask for a hint.");
  assert.equal(say(3, 0, 0), "3 campaigns. You caught the killer 3 times. You didn't ask for a hint.");
  assert.equal(say(1, 1, 0), "1 campaign. You caught the killer once, at 9pm. You didn't ask for a hint.");
  assert.equal(say(0, 0, 2), "2 campaigns. The killer got away twice. You didn't ask for a hint.");
});

test('campaign totals add up from rows', () => {
  const r = { ref, date: '2026-10-22', wrongWeaponTries: 0, wrongPeople: 0, hints: 2, solvedForHer: 1, solvedYourself: 1, puzzles: 6 };
  let t = emptyCampaignTotals();
  t = addCampaignRow(t, { ...r, ending: 'caught', round: 1 });
  t = addCampaignRow(t, { ...r, ending: 'caught', round: 3 });
  t = addCampaignRow(t, { ...r, ending: 'escaped', round: 3, wrongPeople: 3 });
  assert.deepEqual(t, { campaigns: 3, caught: 2, escaped: 1, caughtAt9: 1, hints: 6, solvedForHer: 3, solvedYourself: 3, puzzles: 18 });
});
