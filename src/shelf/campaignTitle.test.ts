import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { codeFor } from '../engine/caseRef.ts';
import { runCaseJob } from '../game/caseJobs.ts';
import { newCampaign } from '../game/campaignSave.ts';
import { sanitizeCampaign } from '../game/saveGuards.ts';
import { initialChoices, replacesUnfinished, startJob, stepOption, type Choices } from './campaignTitle.ts';

const every: Choices[] = [];
for (const difficulty of ['easy', 'medium', 'hard'] as const)
  for (const perPuzzle of [3, 2, 1] as const)
    for (const accusing of ['anyone', 'possible'] as const)
      for (const finish of ['grid', 'jigsaw'] as const) every.push({ difficulty, perPuzzle, accusing, finish });

test('the shelf job is the classic start job for the same choices, and makes the same save', () => {
  for (const ch of every) {
    // What `App.startCampaign` runs: its four arguments, in a job.
    const classic = { kind: 'campaign-new' as const, difficulty: ch.difficulty, possibleOnly: ch.accusing === 'possible', endBoard: ch.finish === 'jigsaw', perPuzzle: ch.perPuzzle };
    assert.deepEqual(startJob(ch), classic);
    const rnd = () => 0.3141;
    const a = runCaseJob(content, startJob(ch), rnd);
    const b = runCaseJob(content, classic, rnd);
    assert.deepEqual(a.save, b.save);
    assert.deepEqual(a.cases, b.cases);
    // Her choices are in the ref, and the save survives the load guard unchanged.
    assert.equal(a.save.ref.difficulty, ch.difficulty);
    assert.equal(a.save.ref.possibleOnly, ch.accusing === 'possible' ? true : undefined);
    assert.equal(a.save.ref.endBoard, ch.finish === 'jigsaw' ? true : undefined);
    assert.equal(a.save.ref.perPuzzle, ch.perPuzzle === 3 ? undefined : ch.perPuzzle);
    assert.deepEqual(sanitizeCampaign(JSON.parse(JSON.stringify(a.save))), a.save);
    assert.ok(a.save.rounds[0].opening, 'chapter one starts on its opening');
  }
});

test('the choices start on the last campaign, else the classic defaults', () => {
  assert.deepEqual(initialChoices(null), { difficulty: 'medium', perPuzzle: 3, accusing: 'anyone', finish: 'grid' });
  const last = newCampaign({ mode: 'campaign', code: codeFor(7), difficulty: 'hard', possibleOnly: true, endBoard: true, perPuzzle: 1 });
  assert.deepEqual(initialChoices(last), { difficulty: 'hard', perPuzzle: 1, accusing: 'possible', finish: 'jigsaw' });
});

test('only a campaign in play asks before it is replaced', () => {
  const save = newCampaign({ mode: 'campaign', code: codeFor(7), difficulty: 'easy' });
  assert.equal(replacesUnfinished(null), false);
  assert.equal(replacesUnfinished(save), true);
  assert.equal(replacesUnfinished({ ...save, outcome: 'caught' }), false);
});

test('arrow keys step through a group and wrap', () => {
  assert.equal(stepOption(['a', 'b', 'c'], 'c', 1), 'a');
  assert.equal(stepOption(['a', 'b', 'c'], 'a', -1), 'c');
});
