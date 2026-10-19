// What the checkers need to know about a finished case, built in one place so
// no caller can forget that 7-guest cases share rooms.

import type { ClueContext } from './clues.ts';
import { roomAdjacency } from './house.ts';
import type { CaseFacts } from './interrogation.ts';
import type { Space } from './search.ts';
import type { Case, Clue, House, Interrogation } from './types.ts';

// Room adjacency never changes for a house, and the UI asks on every move.
const adjacencies = new WeakMap<House, Map<string, Set<string>>>();
const adjacencyOf = (house: House) => {
  let adj = adjacencies.get(house);
  if (!adj) adjacencies.set(house, (adj = roomAdjacency(house)));
  return adj;
};

/** Who is in play and which rooms touch, for testing clues against answers. */
export const caseContext = (house: House, c: Pick<Case, 'suspects'>): ClueContext => ({ suspects: c.suspects, adjacency: adjacencyOf(house) });

/** What's in play, and whether guests share rooms, for the search. */
export const caseSpace = (c: Pick<Case, 'suspects' | 'rooms' | 'items' | 'shared'>): Space => ({
  suspects: c.suspects,
  rooms: c.rooms,
  items: c.items,
  shared: c.shared,
});

/** The truth of a case, for building and checking interrogations. */
export const caseFacts = (house: House, c: Pick<Case, 'suspects' | 'rooms' | 'items' | 'shared' | 'solution'>): CaseFacts => ({
  ...caseSpace(c),
  solution: c.solution,
  ctx: caseContext(house, c),
});

/**
 * The cards she can present: the interrogation's own, or in a finale her
 * casebook (everything but the finale's own clues).
 */
export const interrogationEvidence = (c: Pick<Case, 'clues'>, it: Pick<Interrogation, 'useCaseClues' | 'cards'>): readonly Clue[] =>
  it.useCaseClues ? c.clues.filter((cl) => cl.delivery !== 'finale') : it.cards;
