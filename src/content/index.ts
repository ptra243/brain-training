// Placeholder cast and house. Swap names, bios and words here when a theme is
// chosen; nothing else in the code refers to them directly.
//
// Rules for content:
// - Room and item `word`s should be real words, so a Wordle can deliver them.
// - The house is a 6x6 grid of 6 contiguous rooms, so the same layout can be
//   reused as the zones of the cat-zone puzzle.

import { houseFromLayout } from '../engine/house.ts';
import type { Content, Item, Suspect } from '../engine/types.ts';

export const house = houseFromLayout(
  'manor',
  'The Manor',
  `
  K K K L L L
  K K H H L L
  K H H H L S
  C C H B S S
  C C B B S S
  C C B B B S
  `,
  {
    K: { id: 'kitchen', name: 'Kitchen', word: 'KITCHEN' },
    L: { id: 'library', name: 'Library', word: 'LIBRARY' },
    H: { id: 'hall', name: 'Hall', word: 'HALL' },
    S: { id: 'study', name: 'Study', word: 'STUDY' },
    C: { id: 'conservatory', name: 'Conservatory', word: 'GARDEN' },
    B: { id: 'bedroom', name: 'Bedroom', word: 'BEDROOM' },
  },
);

export const suspects: readonly Suspect[] = [
  { id: 'cook', name: 'The Cook', bio: 'Placeholder bio.' },
  { id: 'butler', name: 'The Butler', bio: 'Placeholder bio.' },
  { id: 'gardener', name: 'The Gardener', bio: 'Placeholder bio.' },
  { id: 'maid', name: 'The Maid', bio: 'Placeholder bio.' },
  { id: 'doctor', name: 'The Doctor', bio: 'Placeholder bio.' },
  { id: 'painter', name: 'The Painter', bio: 'Placeholder bio.' },
];

export const items: readonly Item[] = [
  { id: 'knife', name: 'knife', word: 'KNIFE' },
  { id: 'rope', name: 'rope', word: 'ROPE' },
  { id: 'candlestick', name: 'candlestick', word: 'CANDLE' },
  { id: 'wrench', name: 'wrench', word: 'WRENCH' },
  { id: 'poison', name: 'poison bottle', word: 'POISON' },
  { id: 'vase', name: 'vase', word: 'VASE' },
];

export const content: Content = { house, suspects, items };
