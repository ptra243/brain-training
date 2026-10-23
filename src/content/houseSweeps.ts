// Shared by the house tests and the case check: which houses to loop over, and how to spread seeds over a range.
import type { House } from '../engine/types.ts';
import { otherHouses, variantsOf } from './houses.ts';

export type HouseVariant = { layout: House; /** 0 is the layout itself, 1..7 its turns and mirrors. */ v: number; house: House };

/** Every variant of each layout (default: every layout but the manor), the layout itself first. */
export function eachVariant(layouts: readonly House[] = otherHouses): HouseVariant[] {
  return layouts.flatMap((layout) => variantsOf(layout).map((house, v) => ({ layout, v, house })));
}

/** The variants a quick run samples: two per layout, spread so a run sees different orientations; --full takes all 8. */
export function sampledVariants(full: boolean, layouts: readonly House[] = otherHouses): HouseVariant[] {
  if (full) return eachVariant(layouts);
  return layouts.flatMap((layout, li) => {
    const all = variantsOf(layout);
    return [(li * 3) % 8, (li * 3 + 4) % 8].map((v) => ({ layout, v, house: all[v] }));
  });
}

/** Seed numbers 0..total-1 when `full`; otherwise `count` of them spread over [from, total), where `from` is how many the tests use. */
export function spreadSeeds(full: boolean, from: number, total: number, count: number): number[] {
  if (full) return Array.from({ length: total }, (_, i) => i);
  return Array.from({ length: count }, (_, k) => from + Math.floor((k * (total - from)) / count));
}
