// Placeholder cast and house. Swap names, bios and words here when a theme is
// chosen; nothing else in the code refers to them directly.
//
// Rules for content:
// - Room `objects` are 5-letter things found in that room. A Wordle answer is
//   picked from them. Words can repeat across rooms (a CHAIR can be
//   anywhere): solving the Wordle reveals the whole clue, room included.
// - Room `things` are more things in the room, 4 to 9 letters, one word, no
//   X, J or Z (the crossword word list is thin there). The mini crossword
//   and word search hide one of them.
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
      tint: '#e7d9bf',
      name: 'Kitchen',
      objects: ['STOVE', 'SPOON', 'PLATE', 'BREAD', 'APRON', 'SPICE', 'TOAST', 'LADLE', 'TABLE', 'CHAIR', 'CLOCK'],
      things: ['KETTLE', 'TEAPOT', 'SAUCEPAN', 'CUPBOARD', 'PANTRY', 'COLANDER', 'LARDER', 'TEACUP'],
    },
    L: {
      id: 'library',
      tint: '#cfd8c0',
      name: 'Library',
      objects: ['SHELF', 'NOVEL', 'GLOBE', 'QUILL', 'ATLAS', 'BOOKS', 'PAGES', 'TABLE', 'CHAIR', 'CLOCK'],
      things: ['BOOKCASE', 'ARMCHAIR', 'FIREPLACE', 'LADDER', 'BOOKMARK', 'CANDLES', 'INKWELL', 'POETRY'],
    },
    H: {
      id: 'hall',
      tint: '#d9d2c4',
      name: 'Hall',
      objects: ['COATS', 'STAIR', 'BENCH', 'CHEST', 'PHONE', 'CLOCK', 'TABLE'],
      things: ['STAIRCASE', 'UMBRELLA', 'DOORMAT', 'BANISTER', 'HATSTAND', 'MIRROR', 'PORTRAIT', 'TELEPHONE'],
    },
    S: {
      id: 'study',
      tint: '#e2c9b8',
      name: 'Study',
      objects: ['DIARY', 'STAMP', 'PAPER', 'GLOBE', 'SCALE', 'CHAIR', 'CLOCK', 'TABLE'],
      things: ['BUREAU', 'LEDGER', 'ENVELOPE', 'LETTERS', 'TELESCOPE', 'CALENDAR', 'MAPS', 'BLOTTER'],
    },
    C: {
      id: 'conservatory',
      tint: '#c7dacd',
      name: 'Conservatory',
      objects: ['PLANT', 'FERNS', 'PALMS', 'VINES', 'ROSES', 'TULIP', 'DAISY', 'BENCH'],
      things: ['ORCHIDS', 'FOUNTAIN', 'TROWEL', 'FLOWERPOT', 'SEEDLINGS', 'LILIES', 'BEGONIAS', 'SPRINKLER'],
    },
    B: {
      id: 'bedroom',
      tint: '#dcd0dc',
      name: 'Bedroom',
      objects: ['DUVET', 'ROBES', 'QUILT', 'SHEET', 'DRESS', 'SHOES', 'CHEST', 'CLOCK'],
      things: ['WARDROBE', 'PILLOWS', 'CURTAINS', 'DRESSER', 'SLIPPERS', 'BLANKET', 'NIGHTGOWN', 'HAIRBRUSH'],
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
  { id: 'chauffeur', name: 'The Chauffeur', bio: 'Placeholder bio.' },
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

/**
 * The house cats, who give hints in the minigames. One helps on each case.
 * Kept out of `content` so they never change which words a puzzle may use.
 */
export const cats: readonly string[] = ['Biscuit', 'Marmalade', 'Pepper', 'Sooty', 'Duchess'];

/**
 * Things she noticed about the house that turn out to have nothing to do with
 * the case: the case board's filler pieces. Kept out of `content` like the
 * cats, so they never change a case. Never name a guest, room or weapon here.
 */
export const houseDetails: readonly string[] = [
  'A clock that runs five minutes slow',
  'A dripping tap nobody has fixed',
  'A cushion embroidered with ducks',
  'A stack of newspapers, still folded',
  'A piano with one key that sticks',
  'A painting hung slightly crooked',
  'A draught under every door',
  'A jigsaw puzzle with one piece missing',
  'Crumbs on the stair carpet',
  'A barometer stuck on "Change"',
  'Cat hair on every chair',
  'A squeaky floorboard on the landing',
  'Half a crossword done in pen',
  'A record of brass band music on the gramophone',
  'A cup of cocoa gone cold',
  'A hat stand with no hats',
  'A bowl of wax fruit',
  'A calendar still on last month',
  'A chessboard left mid-game',
  'A single sock under the sofa',
  'A bell pull that rings nowhere',
  'A mirror cracked in one corner',
  'A fern that needs watering',
  'A teapot shaped like a cottage',
  'Muddy paw prints, probably the cats',
];
