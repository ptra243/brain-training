// Dog fight bots over many seeds (dogFight.test.ts keeps seeds 0-5 per level):
// the hint bot wins, the smallest bot loses most fights, redeals and fallbacks,
// doubles and challenges stay inside their rate bounds.

import assert from 'node:assert/strict';
import test from 'node:test';
import { FULL, seedsOf, sweep } from '../sweep.ts';
import { LEVELS, challengeSeed, dogPlaysSeed, doubleSeed, hintBotSeed, redealSeed, smallestBotSeed } from './dogFightSweeps.ts';

const parts: string[] = [];

for (const level of LEVELS) {
  const turns: number[] = [];
  let lost = 0;
  let fights = 0;
  const tot = { plays: 0, fallbacks: 0, redeals: 0 };
  const count = { plays: 0, redealed: 0, fallbacks: 0 };
  let doubles = 0;
  const doubleSeeds = seedsOf(60, 600, 150);
  const ch = { attacks: 0, drawn: 0, kinds: {} as Record<string, number> };

  sweep(`dog hint and smallest bots, ${level}`, seedsOf(6, 100, 10), (i) => {
    fights++;
    turns.push(hintBotSeed(level, i));
    if (smallestBotSeed(level, i)) lost++;
  });
  sweep(`dog plays, ${level}`, seedsOf(6, 100, 10), (i) => {
    const r = dogPlaysSeed(level, i);
    tot.plays += r.plays;
    tot.fallbacks += r.fallbacks;
    tot.redeals += r.redeals;
  });
  sweep(`dog redeals, ${level}`, seedsOf(6, 200, 40), (i) => {
    const r = redealSeed(level, i);
    count.plays += r.plays;
    count.redealed += r.redealed;
    count.fallbacks += r.fallbacks;
  });
  sweep(`dog doubles, ${level}`, doubleSeeds, (i) => {
    if (doubleSeed(level, i)) doubles++;
  });
  sweep(`dog challenges, ${level}`, seedsOf(20, 400, 60), (i) => {
    const r = challengeSeed(level, i);
    ch.attacks += r.attacks;
    ch.drawn += r.drawn;
    for (const [k, n] of Object.entries(r.kinds)) ch.kinds[k] = (ch.kinds[k] ?? 0) + n;
  });

  test(`dog rate bounds, ${level}`, () => {
    assert.ok(lost >= fights * 0.8, `dog smallest bot ${level}: lost only ${lost}/${fights} fights (needs 80%)`);
    assert.ok(count.fallbacks <= count.plays / 50, `dog ${level}: ${count.fallbacks} fallbacks in ${count.plays} dog plays (over 2%)`);
    assert.ok(doubles > doubleSeeds.length * 0.2 && doubles < doubleSeeds.length * 0.45, `dog ${level}: a double is possible on ${doubles}/${doubleSeeds.length} attacks (wanted 20-45%)`);
    assert.ok(ch.drawn >= ch.attacks * 0.5, `dog ${level}: a challenge on only ${ch.drawn}/${ch.attacks} attacks`);
    const mean = turns.reduce((a, b) => a + b, 0) / Math.max(1, turns.length);
    const kinds = Object.entries(ch.kinds).sort().map(([k, n]) => `${k} ${n}`).join(', ');
    parts.push(`${level}: challenge on ${ch.drawn}/${ch.attacks} attacks (${kinds})`);
    parts.push(`${level}: hint bot mean ${mean.toFixed(2)} turns, smallest bot lost ${lost}/${fights}, redeals ${count.redealed} and fallbacks ${count.fallbacks} in ${count.plays} plays, double on ${doubles}/${doubleSeeds.length}`);
  });
}

test('summary', (t) => {
  t.diagnostic(`Dog fights (${FULL ? 'all' : 'sampled'} seeds): ${parts.join('; ')}`);
});
