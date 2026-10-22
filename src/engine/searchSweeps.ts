// Checks the fast search in `search.ts` against the old exhaustive one in
// `searchOracle.ts` on random small cases. Called from `search.test.ts` (a few
// seeds) and `scripts/check-cases.ts` (more).

import { cluePool, type ClueContext } from './clues.ts';
import { Rng } from './rng.ts';
import { countMatching, type Space } from './search.ts';
import { countMatchingOracle } from './searchOracle.ts';
import type { ClueFact, ClueType, Solution } from './types.ts';

export const FACT_TYPES: readonly ClueType[] = [
  'suspect-room',
  'suspect-not-room',
  'suspect-item',
  'suspect-not-item',
  'item-room',
  'item-not-room',
  'suspect-either-room',
  'suspect-next-to-room',
  'suspects-adjacent',
  'suspects-not-adjacent',
  'suspects-together',
  'suspects-apart',
  'suspect-alone',
  'suspect-empty-handed',
];

export interface Instance {
  space: Space;
  ctx: ClueContext;
  facts: ClueFact[];
  extra: ((sol: Solution) => boolean)[];
}

/** A random small case: true facts from the clue pool plus a few random ones that may be false. */
export function randomInstance(seed: number): Instance {
  const rng = new Rng(seed * 2654435761 + 99);
  const shared = rng.next() < 0.5;
  const n = shared ? 7 : 4 + rng.int(2);
  const k = shared ? 5 : n;
  const suspects = Array.from({ length: n }, (_, i) => `s${i}`);
  const rooms = Array.from({ length: k }, (_, i) => `r${i}`);
  const items = Array.from({ length: k }, (_, i) => `i${i}`);
  const mapRooms = [...rooms, ...Array.from({ length: 1 + rng.int(2) }, (_, i) => `x${i}`)];
  const adjacency = new Map<string, Set<string>>(mapRooms.map((r) => [r, new Set<string>()]));
  const density = 0.25 + rng.next() * 0.4;
  for (let a = 0; a < mapRooms.length; a++) {
    for (let b = a + 1; b < mapRooms.length; b++) {
      if (rng.next() < density) {
        adjacency.get(mapRooms[a])!.add(mapRooms[b]);
        adjacency.get(mapRooms[b])!.add(mapRooms[a]);
      }
    }
  }
  const ctx: ClueContext = { suspects, adjacency };
  const space: Space = { suspects, rooms, items, shared };

  // A hidden true answer.
  const room = suspects.map(() => (shared ? rng.pick(rooms) : ''));
  if (!shared) rng.shuffle(rooms).forEach((r, i) => (room[i] = r));
  const holders = rng.shuffle(suspects.map((_, i) => i)).slice(0, k);
  const item: (string | null)[] = suspects.map(() => null);
  holders.forEach((s, j) => (item[s] = items[j]));
  const truth: Solution = { room, item };

  const pool = rng.shuffle(cluePool(truth, ctx, rooms, items, mapRooms, rng, shared));
  const wanted = shared ? 6 + rng.int(40) : rng.int(16);
  const facts: ClueFact[] = pool.slice(0, wanted);

  // Random facts of any type, true or false.
  const s = () => rng.pick(suspects);
  const r = () => rng.pick(mapRooms);
  const it = () => rng.pick(items);
  const pair = (): [string, string] => [s(), s()];
  const makers: Record<ClueType, () => ClueFact> = {
    'suspect-room': () => ({ type: 'suspect-room', suspect: s(), room: r() }),
    'suspect-not-room': () => ({ type: 'suspect-not-room', suspect: s(), room: r() }),
    'suspect-item': () => ({ type: 'suspect-item', suspect: s(), item: it() }),
    'suspect-not-item': () => ({ type: 'suspect-not-item', suspect: s(), item: it() }),
    'item-room': () => ({ type: 'item-room', item: it(), room: r() }),
    'item-not-room': () => ({ type: 'item-not-room', item: it(), room: r() }),
    'suspect-either-room': () => ({ type: 'suspect-either-room', suspect: s(), rooms: [r(), r()] }),
    'suspect-next-to-room': () => ({ type: 'suspect-next-to-room', suspect: s(), room: r() }),
    'suspects-adjacent': () => ({ type: 'suspects-adjacent', suspects: pair() }),
    'suspects-not-adjacent': () => ({ type: 'suspects-not-adjacent', suspects: pair() }),
    'suspects-together': () => ({ type: 'suspects-together', suspects: pair() }),
    'suspects-apart': () => ({ type: 'suspects-apart', suspects: pair() }),
    'suspect-alone': () => ({ type: 'suspect-alone', suspect: s() }),
    'suspect-empty-handed': () => ({ type: 'suspect-empty-handed', suspect: s() }),
  };
  const randoms = rng.next() < 0.5 ? 0 : 1 + rng.int(3);
  for (let i = 0; i < randoms; i++) facts.push(makers[rng.pick(FACT_TYPES)]());

  const extra: ((sol: Solution) => boolean)[] = [];
  if (rng.next() < 0.25) {
    const a = rng.int(n);
    const b = (a + 1 + rng.int(n - 1)) % n;
    const target = r();
    extra.push(rng.next() < 0.5 ? (sol) => sol.room[a] !== sol.room[b] : (sol) => sol.room[a] !== target);
  }
  return { space, ctx, facts: rng.shuffle(facts), extra };
}

export interface Comparison {
  instances: number;
  /** Instance-limit pairs compared. */
  comparisons: number;
  mismatches: string[];
  /** Facts seen, by type. */
  types: Map<ClueType, number>;
  /** Instances with no answer, with exactly one, and with more than 2. */
  none: number;
  one: number;
  many: number;
  fastMs: number;
  oracleMs: number;
}

/** Compares the fast search with the old one on random instances, for limits 0, 1, 2 and no limit. */
export function compareSearch(seeds: readonly number[]): Comparison {
  const out: Comparison = { instances: 0, comparisons: 0, mismatches: [], types: new Map(), none: 0, one: 0, many: 0, fastMs: 0, oracleMs: 0 };
  for (const seed of seeds) {
    const { space, ctx, facts, extra } = randomInstance(seed);
    out.instances++;
    for (const f of facts) out.types.set(f.type, (out.types.get(f.type) ?? 0) + 1);
    // No limit only when the answer count is small enough for the old search to list.
    const size = countMatching(space, facts, ctx, 3000, extra);
    if (size === 0) out.none++;
    else if (size === 1) out.one++;
    else if (size > 2) out.many++;
    const limits = size <= 3000 ? [0, 1, 2, Infinity] : [0, 1, 2];
    for (const limit of limits) {
      let t = performance.now();
      const fast = countMatching(space, facts, ctx, limit, extra);
      out.fastMs += performance.now() - t;
      t = performance.now();
      const old = countMatchingOracle(space, facts, ctx, limit, extra);
      out.oracleMs += performance.now() - t;
      out.comparisons++;
      if (fast !== old) out.mismatches.push(`seed ${seed}, limit ${limit}: fast ${fast}, old ${old}`);
    }
  }
  return out;
}
