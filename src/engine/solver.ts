import { compileClue, type ClueContext } from './clues.ts';
import type { ClueFact, Solution } from './types.ts';

function permutations<T>(list: readonly T[]): T[][] {
  if (list.length <= 1) return [list.slice()];
  const out: T[][] = [];
  list.forEach((head, i) => {
    const rest = [...list.slice(0, i), ...list.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([head, ...tail]);
  });
  return out;
}

/**
 * Every possible assignment of rooms and items to the suspects in play.
 * Each suspect gets a different room and a different item, so a case with
 * n suspects has (n!)^2 candidates: 576 for 4 suspects, 14,400 for 5.
 */
export function allCandidates(rooms: readonly string[], items: readonly string[]): Solution[] {
  const roomPerms = permutations(rooms);
  const itemPerms = permutations(items);
  const out: Solution[] = [];
  for (const room of roomPerms) for (const item of itemPerms) out.push({ room, item });
  return out;
}

/** Candidates consistent with every clue. */
export function filterCandidates(
  candidates: readonly Solution[],
  facts: readonly ClueFact[],
  ctx: ClueContext,
): Solution[] {
  const tests = facts.map((f) => compileClue(f, ctx));
  return candidates.filter((sol) => tests.every((t) => t(sol)));
}

/** Number of solutions the clues allow, stopping early once it passes `limit`. */
export function countSolutions(
  candidates: readonly Solution[],
  facts: readonly ClueFact[],
  ctx: ClueContext,
  limit = Infinity,
): number {
  const tests = facts.map((f) => compileClue(f, ctx));
  let count = 0;
  for (const sol of candidates) {
    if (tests.every((t) => t(sol)) && ++count > limit) break;
  }
  return count;
}

export function sameSolution(a: Solution, b: Solution): boolean {
  return a.room.every((r, i) => r === b.room[i]) && a.item.every((it, i) => it === b.item[i]);
}
