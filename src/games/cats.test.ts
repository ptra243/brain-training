import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../engine/rng.ts';
import { countCatSolutions, generateCats, solvableBySimpleSteps } from './cats.ts';

// The sizes and easy flags the difficulty levels deal (MINIGAMES in src/engine/settings.ts): easy 6 easy, medium 7, hard 8.
const dealt: readonly [number, boolean][] = [[6, true], [6, false], [7, false], [8, false]];

test('generated cat puzzles have exactly one answer, and easy ones come out by simple steps', () => {
  for (const [size, easy] of dealt) {
    for (let seed = 1; seed <= 8; seed++) {
      const p = generateCats(size, new Rng(seed * 7919 + size), easy);
      const where = `${size}x${size} ${easy ? 'easy' : 'normal'} seed ${seed}`;
      assert.equal(countCatSolutions(p.zones, 2), 1, `${where}: one answer`);
      if (easy) assert.ok(solvableBySimpleSteps(p.zones), `${where}: simple steps`);
    }
  }
});
