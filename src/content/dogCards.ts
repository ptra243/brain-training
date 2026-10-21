// The dog fight's cards: the tarot minor arcana as numbers, and the operator
// deck. Ids match the faces in `tarotArt.ts` ("cups-7"). Code never names a suit
// or a card; it uses these lists.

import type { Difficulty } from '../engine/types.ts';

export interface DogCard {
  /** Matches `tarotArt(id)`. */
  id: string;
  /** Ace 1, 2 to 10 face value, page 11, knight 12, queen 13, king 14. */
  value: number;
  /** For screen readers: "Seven of cups". */
  name: string;
}

export type DogOp = '+' | '-' | '*' | '/';

const SUITS = ['cups', 'wands', 'swords', 'pentacles'];
const RANK_NAMES = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Page', 'Knight', 'Queen', 'King',
];

/** All 56 cards, suit by suit, rank 1 to 14. */
export const DOG_CARDS: readonly DogCard[] = SUITS.flatMap((suit) =>
  RANK_NAMES.map((rank, i) => ({ id: `${suit}-${i + 1}`, value: i + 1, name: `${rank} of ${suit}` })),
);

/** Easy: the 40 cards valued 1 to 10. Medium and hard: all 56. */
export function dogDeck(level: Difficulty): readonly DogCard[] {
  return level === 'easy' ? DOG_CARDS.filter((c) => c.value <= 10) : DOG_CARDS;
}

/** The operator deck: 6 +, 2 ×, 1 −, 1 ÷. On easy the ÷ becomes a + (7 +, 2 ×, 1 −). */
export function dogOpDeck(level: Difficulty): readonly DogOp[] {
  return ['+', '+', '+', '+', '+', '+', '*', '*', '-', level === 'easy' ? '+' : '/'];
}
