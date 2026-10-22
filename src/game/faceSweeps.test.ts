import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { campaignRound } from '../engine/campaign.ts';
import { faceToFace } from './caseJobs.ts';
import { faceRef, faceSeed, type FaceStats } from './faceSweeps.ts';

test('face to face: the accused answers, an innocent has 8 true answers, the killer one non-weapon lie or cracks', () => {
  const stats: FaceStats = { killers: 0, cracks: 0, innocents: 0 };
  for (let seed = 0; seed < 3; seed++) faceSeed(seed, stats);
  assert.ok(stats.killers > 0 && stats.innocents > 0);
  assert.ok(stats.cracks > 0, 'with no clues found the killer cracks');
});

test('face to face: the killer is caught with her clues and cracks without them', () => {
  const ref = faceRef(1);
  const c = campaignRound(content, ref, []);
  const all = faceToFace(content, ref, [], c.murderer, c.clues.map((cl) => cl.id));
  const none = faceToFace(content, ref, [], c.murderer, []);
  assert.equal(none.cracks, true);
  assert.equal(none.questions.some((q) => q.lie), false);
  assert.equal(none.proof.length, 0);
  assert.ok(!all.cracks && all.questions.filter((q) => q.lie).length === 1);
});
