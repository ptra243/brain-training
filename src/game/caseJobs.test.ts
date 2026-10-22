import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { campaignRound, type CampaignRef } from '../engine/campaign.ts';
import { caseFor, codeFor, newPickCase, newPlayCase, newQuickCase, type CaseRef } from '../engine/caseRef.ts';
import { newCampaign, roundCase } from './campaign.ts';
import { roundsKey, runCaseJob } from './caseJobs.ts';

const seq = (...ns: number[]) => {
  let i = 0;
  return () => ns[i++ % ns.length];
};

test('case, play, pick and quick jobs match the engine', () => {
  const ref: CaseRef = { mode: 'quick', code: codeFor(4242), difficulty: 'easy', length: 'short' };
  assert.deepStrictEqual(runCaseJob(content, { kind: 'case', ref }, seq(1)), caseFor(content, ref));
  assert.deepStrictEqual(runCaseJob(content, { kind: 'play' }, seq(777)), newPlayCase(content, seq(777)));
  const games = ['wordle', 'sudoku', 'cats'] as const;
  assert.deepStrictEqual(runCaseJob(content, { kind: 'pick', code: codeFor(99), games: [...games] }, seq(1)), newPickCase(content, codeFor(99), games));
  assert.deepStrictEqual(
    runCaseJob(content, { kind: 'quick', difficulty: 'easy', length: 'short', cast: 'classic' }, seq(555)),
    newQuickCase(content, 'easy', 'short', 'classic', seq(555)),
  );
});

test('campaign jobs match the engine, and results survive structuredClone', () => {
  const made = runCaseJob(content, { kind: 'campaign-new', difficulty: 'medium', possibleOnly: true, endBoard: false, perPuzzle: 3 }, seq(31_337));
  const ref: CampaignRef = { mode: 'campaign', code: codeFor(31_337), difficulty: 'medium', possibleOnly: true };
  assert.deepStrictEqual(made.save, newCampaign(ref));
  assert.deepStrictEqual(made.cases, [roundCase(content, made.save, 0)]);

  const rounds = runCaseJob(content, { kind: 'campaign-rounds', save: made.save }, seq(1));
  assert.deepStrictEqual(rounds, made.cases);
  assert.deepStrictEqual(structuredClone(rounds), rounds);

  const play = runCaseJob(content, { kind: 'play' }, seq(777));
  assert.deepStrictEqual(structuredClone(play), play);
  const picked = runCaseJob(content, { kind: 'pick', code: codeFor(99), games: ['wordle', 'sudoku', 'cats'] }, seq(1));
  assert.deepStrictEqual(structuredClone(picked), picked);
});

test('roundsKey changes with victims and rounds', () => {
  const save = newCampaign({ mode: 'campaign', code: codeFor(5), difficulty: 'easy' });
  const key = roundsKey(save);
  assert.notEqual(roundsKey({ ...save, victims: ['x'] }), key);
  assert.notEqual(roundsKey({ ...save, rounds: [...save.rounds, ...save.rounds] }), key);
  assert.equal(roundsKey({ ...save }), key);
});

test('a campaign job sets perPuzzle only when it is 1 or 2', () => {
  const two = runCaseJob(content, { kind: 'campaign-new', difficulty: 'easy', possibleOnly: false, endBoard: false, perPuzzle: 2 }, seq(4242));
  assert.equal(two.save.ref.perPuzzle, 2);
  const three = runCaseJob(content, { kind: 'campaign-new', difficulty: 'easy', possibleOnly: false, endBoard: false, perPuzzle: 3 }, seq(4242));
  assert.ok(!('perPuzzle' in three.save.ref));
});

test('face job: same inputs, same questioning, and it survives structuredClone', () => {
  const ref: CampaignRef = { mode: 'campaign', code: codeFor(31_337), difficulty: 'medium' };
  const c = campaignRound(content, ref, []);
  const job = { kind: 'face', ref, victims: [], accused: c.murderer, found: c.clues.map((cl) => cl.id) } as const;
  const a = runCaseJob(content, { ...job, victims: [], found: [...job.found] }, seq(1));
  assert.deepStrictEqual(runCaseJob(content, { ...job, victims: [], found: [...job.found] }, seq(9)), a);
  assert.equal(a.suspect, c.murderer);
  assert.deepStrictEqual(structuredClone(a), a);
  const other = c.suspects.find((s) => s !== c.murderer)!;
  const innocent = runCaseJob(content, { ...job, victims: [], found: [...job.found], accused: other }, seq(1));
  assert.equal(innocent.suspect, other);
  assert.equal(innocent.questions.length, 8);
});
