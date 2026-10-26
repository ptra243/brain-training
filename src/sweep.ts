// Shared helpers for `*.sweep.ts` files: seed sweeps run by `node --test`
// (npm run sweeps), one process per file. Quick samples seeds; SWEEP_FULL=1
// (npm run sweeps:full) takes every seed the unit tests used to check.

import { test, type TestContext } from 'node:test';

export const FULL = process.env.SWEEP_FULL === '1';

/** Seed numbers 0..total-1 when FULL; otherwise `count` of them spread over [from, total), where `from` is how many `npm test` already runs. */
export function seedsOf(from: number, total: number, count: number): number[] {
  if (FULL) return Array.from({ length: total }, (_, i) => i);
  return Array.from({ length: count }, (_, k) => from + Math.floor((k * (total - from)) / count));
}

/** One test per group: runs `f` on every seed; the first failure names the seed. The test context is passed for `t.diagnostic`. */
export function sweep<S>(name: string, seeds: S[], f: (seed: S, t: TestContext) => void): void {
  test(name, (t) => {
    for (const seed of seeds) {
      try {
        f(seed, t);
      } catch (err) {
        const e = err as Error;
        e.message = `${name}, seed ${String(seed)}: ${e.message}`;
        throw e;
      }
    }
  });
}
