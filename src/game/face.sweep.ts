// Face to face: questioning a killer or an innocent is fair. face.test.ts keeps
// seeds 0-2; this takes 10 more spread over the rest (quick) or all 60 (SWEEP_FULL=1).

import { test } from 'node:test';
import { seedsOf, sweep } from '../sweep.ts';
import { faceSeed, type FaceStats } from './faceSweeps.ts';

const stats: FaceStats = { killers: 0, cracks: 0, innocents: 0 };
sweep('face to face', seedsOf(3, 60, 10), (seed) => faceSeed(seed, stats));

test('summary', (t) => {
  t.diagnostic(`Face to face: ${stats.killers} killer and ${stats.innocents} innocent questionings fair (${stats.cracks} killers crack: no clue catches a lie)`);
});
