// Placeholder cast and house. Swap names, bios and words here when a theme is
// chosen; nothing else in the code refers to them directly.
//
// Rules for content:
// - Room `objects` are 5-letter things found in that room. A Wordle answer is
//   picked from them. Words can repeat across rooms (a CHAIR can be
//   anywhere): solving the Wordle reveals the whole clue, room included.
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
    K: {
      id: 'kitchen',
      name: 'Kitchen',
      objects: ['STOVE', 'SPOON', 'PLATE', 'BREAD', 'APRON', 'SPICE', 'TOAST', 'LADLE', 'TABLE', 'CHAIR', 'CLOCK'],
    },
    L: {
      id: 'library',
      name: 'Library',
      objects: ['SHELF', 'NOVEL', 'GLOBE', 'QUILL', 'ATLAS', 'BOOKS', 'PAGES', 'TABLE', 'CHAIR', 'CLOCK'],
    },
    H: {
      id: 'hall',
      name: 'Hall',
      objects: ['COATS', 'STAIR', 'BENCH', 'CHEST', 'PHONE', 'CLOCK', 'TABLE'],
    },
    S: {
      id: 'study',
      name: 'Study',
      objects: ['DIARY', 'STAMP', 'PAPER', 'GLOBE', 'SCALE', 'CHAIR', 'CLOCK', 'TABLE'],
    },
    C: {
      id: 'conservatory',
      name: 'Conservatory',
      objects: ['PLANT', 'FERNS', 'PALMS', 'VINES', 'ROSES', 'TULIP', 'DAISY', 'BENCH'],
    },
    B: {
      id: 'bedroom',
      name: 'Bedroom',
      objects: ['DUVET', 'ROBES', 'QUILT', 'SHEET', 'DRESS', 'SHOES', 'CHEST', 'CLOCK'],
    },
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
  { id: 'knife', name: 'knife' },
  { id: 'rope', name: 'rope' },
  { id: 'candlestick', name: 'candlestick' },
  { id: 'wrench', name: 'wrench' },
  { id: 'poison', name: 'poison bottle' },
  { id: 'vase', name: 'vase' },
];

export const content: Content = { house, suspects, items };
