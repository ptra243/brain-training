// The old exhaustive search, kept only to check the fast one in `search.ts`
// (`searchSweeps.ts`, `search.test.ts`). Not imported by app code.

import { compileClue, type ClueContext } from './clues.ts';
import type { Space } from './search.ts';
import type { ClueFact, Solution } from './types.ts';

/** Ids a fact talks about. */
function named(fact: ClueFact): string[] {
  const out: string[] = [];
  if ('suspect' in fact) out.push(fact.suspect);
  if ('suspects' in fact) out.push(...fact.suspects);
  if ('item' in fact) out.push(fact.item);
  return out;
}

/**
 * How many answers fit every fact, stopping once the count passes `limit`.
 * Without `shared`, everyone has their own room and their own weapon.
 * `extra` tests are checked on each complete answer.
 */
export function countMatchingOracle(
  space: Space,
  facts: readonly ClueFact[],
  ctx: ClueContext,
  limit = Infinity,
  extra: readonly ((sol: Solution) => boolean)[] = [],
): number {
  const { suspects, rooms, items, shared } = space;
  const n = suspects.length;
  const m = items.length;

  // Fill in the people and weapons the facts talk about first, so a
  // contradiction shows up before the search branches on everyone else.
  const talkedAbout = new Set(facts.flatMap(named));
  const first = <T>(list: readonly T[], key: (x: T) => string) => [
    ...list.filter((x) => talkedAbout.has(key(x))),
    ...list.filter((x) => !talkedAbout.has(key(x))),
  ];
  const suspectOrder = first(suspects.map((_, i) => i), (i) => suspects[i]);
  const itemOrder = first(items, (w) => w);
  const roomStep = new Array<number>(n);
  suspectOrder.forEach((s, k) => (roomStep[s] = k));
  const itemStep = new Map(itemOrder.map((w, k) => [w, n + k]));
  const lastStep = n + m - 1;
  const at = (id: string) => roomStep[suspects.indexOf(id)];

  // The step after which each fact can be checked. Unfilled rooms read as
  // undefined and unfilled hands as null, so "alone" and "empty-handed" can
  // be checked at every step from the first that could break them.
  const checks: ((sol: Solution) => boolean)[][] = Array.from({ length: n + m }, () => []);
  for (const fact of facts) {
    let step: number;
    switch (fact.type) {
      case 'suspect-alone': {
        const test = compileClue(fact, ctx);
        for (let k = at(fact.suspect); k < n; k++) checks[k].push(test);
        continue;
      }
      case 'suspect-empty-handed': {
        const test = compileClue(fact, ctx);
        for (let k = n; k <= lastStep; k++) checks[k].push(test);
        continue;
      }
      case 'suspect-item':
      case 'suspect-not-item':
      case 'item-room':
      case 'item-not-room':
        step = itemStep.get(fact.item) ?? lastStep;
        break;
      default:
        step = 'suspects' in fact ? Math.max(at(fact.suspects[0]), at(fact.suspects[1])) : at(fact.suspect);
    }
    checks[step].push(compileClue(fact, ctx));
  }
  checks[lastStep].push(...extra);

  const room: string[] = new Array(n).fill(undefined);
  const item: (string | null)[] = new Array(n).fill(null);
  const sol: Solution = { room, item };
  const taken = new Set<string>();
  let count = 0;

  const fill = (k: number) => {
    if (count > limit) return;
    if (k === n + m) {
      count++;
      return;
    }
    const ok = () => checks[k].every((t) => t(sol));
    if (k < n) {
      const s = suspectOrder[k];
      for (const r of rooms) {
        if (!shared && taken.has(r)) continue;
        room[s] = r;
        if (!shared) taken.add(r);
        if (ok()) fill(k + 1);
        taken.delete(r);
        if (count > limit) break;
      }
      room[s] = undefined as unknown as string;
    } else {
      const w = itemOrder[k - n];
      for (let s = 0; s < n; s++) {
        if (item[s] !== null) continue;
        item[s] = w;
        if (ok()) fill(k + 1);
        item[s] = null;
        if (count > limit) return;
      }
    }
  };
  fill(0);
  return count;
}
