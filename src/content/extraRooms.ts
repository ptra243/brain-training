// Extra rooms for bigger houses. Same rules as the rooms in `index.ts`:
// `objects` are 5 letters, `things` are 4 to 9 letters with no J, X or Z.
// `cells` are filled in when a layout uses the room.

import type { Room } from '../engine/types.ts';

export const extraRoomMeta: Record<string, Omit<Room, 'cells'>> = {
  dining: {
    id: 'dining',
    name: 'Dining room',
    tint: '#e6c9c9',
    objects: ['TABLE', 'CHAIR', 'PLATE', 'GLASS', 'FORKS', 'BOWLS', 'CLOTH', 'CLOCK', 'TRAYS'],
    things: ['SIDEBOARD', 'DECANTER', 'CUTLERY', 'GOBLETS', 'PLACEMAT', 'TUREEN', 'PLATTER', 'TRIVET'],
  },
  pantry: {
    id: 'pantry',
    name: 'Pantry',
    tint: '#f0e2a8',
    objects: ['FLOUR', 'SUGAR', 'HONEY', 'JELLY', 'PASTA', 'BEANS', 'LEMON', 'OLIVE', 'SAUCE', 'SHELF'],
    things: ['BISCUITS', 'PICKLES', 'MARMALADE', 'CEREAL', 'VINEGAR', 'OATMEAL', 'RAISINS', 'MUSTARD'],
  },
  cloakroom: {
    id: 'cloakroom',
    name: 'Cloakroom',
    tint: '#c3d3e6',
    objects: ['SCARF', 'GLOVE', 'BOOTS', 'HOOKS', 'CLOAK', 'SHAWL', 'CAPES', 'COATS', 'BENCH'],
    things: ['HANGERS', 'GALOSHES', 'WELLIES', 'MITTENS', 'SCARVES', 'TOPCOAT', 'OVERCOAT', 'RAINCOAT'],
  },
  games: {
    id: 'games',
    name: 'Games room',
    tint: '#f0cfae',
    objects: ['CHESS', 'DARTS', 'CARDS', 'TABLE', 'CHAIR', 'PIANO', 'BOARD', 'SCORE', 'CLOCK'],
    things: ['DOMINOES', 'DRAUGHTS', 'SKITTLES', 'CROQUET', 'BILLIARDS', 'SNOOKER', 'MARBLES', 'SCRABBLE'],
  },
};
