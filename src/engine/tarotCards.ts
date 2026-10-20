// Tarot match on a case: which opaque card ids a case's suspects, items and
// rooms get, and which cards a game's clues call for. Ids go by order, so
// none names a suspect, item or room; the theme maps ids to art.

import type { ClueFact } from './types.ts';

/** Most pairs a tarot board may grow to (the big cast's size). */
export const TAROT_MAX_PAIRS = 12;

export interface TarotCaseCards {
  suspects: readonly string[];
  items: readonly string[];
  rooms: readonly string[];
}

/** Card id per suspect, item and room (in that order), and every id as the deck. */
export function tarotDeck(c: TarotCaseCards): { cardOf: Map<string, string>; deck: string[] } {
  const cardOf = new Map<string, string>();
  [...c.suspects, ...c.items, ...c.rooms].forEach((name, i) => cardOf.set(name, `major-${i}`));
  return { cardOf, deck: [...cardOf.values()] };
}

const suspectsOf = (f: ClueFact): string[] => ('suspects' in f ? [...f.suspects] : 'suspect' in f ? [f.suspect] : []);
const itemsOf = (f: ClueFact): string[] => ('item' in f ? [f.item] : []);
const roomsOf = (f: ClueFact): string[] => ('rooms' in f ? [...f.rooms] : 'room' in f ? [f.room] : []);

const unique = (xs: string[]) => [...new Set(xs)];

/**
 * The cards a tarot game deals. `reward` is everything its own clues name
 * (suspects, then items, then rooms, per clue); `other` is the suspects and
 * items of every other clue. Names outside the case are skipped.
 */
export function tarotClueCards(c: TarotCaseCards, rewardFacts: readonly ClueFact[], otherFacts: readonly ClueFact[]) {
  const { cardOf, deck } = tarotDeck(c);
  const ids = (names: string[]) => names.flatMap((n) => (cardOf.has(n) ? [cardOf.get(n)!] : []));
  const reward = unique(ids(rewardFacts.flatMap((f) => [...suspectsOf(f), ...itemsOf(f), ...roomsOf(f)])));
  const other = unique(ids(otherFacts.flatMap((f) => [...suspectsOf(f), ...itemsOf(f)])));
  return { deck, reward, other };
}

/** Pairs a board needs: the level's, grown to hold every reward card; null if even the cap can't. */
export function tarotPairsFor(levelPairs: number, rewardCount: number): number | null {
  return rewardCount > TAROT_MAX_PAIRS ? null : Math.max(levelPairs, rewardCount);
}
