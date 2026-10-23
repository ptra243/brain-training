// The other houses a case can be set in (the manor is `house` in ./index.ts).
// Each uses only part of its 12x12 grid: `.` is outside the house. Rooms are
// joined by doors, so only door-joined rooms count as touching.

import { houseFromLayout } from '../engine/house.ts';
import type { House, Room } from '../engine/types.ts';
import { extraRoomMeta } from './extraRooms.ts';
import { house as manor } from './index.ts';

type RoomMeta = Omit<Room, 'cells'>;

const meta = new Map<string, RoomMeta>(Object.entries(extraRoomMeta));
for (const { cells, ...rest } of manor.rooms) {
  void cells; // only the room's words and colour are shared; each house lays out its own cells
  meta.set(rest.id, rest);
}

/** Legend for a layout: letter -> room id. */
function legend(rooms: Record<string, string>): Record<string, RoomMeta> {
  return Object.fromEntries(
    Object.entries(rooms).map(([letter, id]) => {
      const m = meta.get(id);
      if (!m) throw new Error(`No room "${id}" for letter ${letter}`);
      return [letter, m];
    }),
  );
}

/** L-shaped lodge: a hall in the middle, most rooms opening onto it. */
export const lodge: House = houseFromLayout(
  'lodge',
  'The Lodge',
  `
  A A A A A A A B B B B B
  A A A A A A A B B B B B
  C C C C D D D D B B B B
  C C C C D D D D E E E E
  C C C C H H H H H E E E
  F F F H H H H H H E E E
  F F F H H H H H H . . .
  F F F G G G G G G . . .
  I I I G G G G G G . . .
  I I I J J J J J J . . .
  I I I J J J J J J . . .
  I I I J J J J J J . . .
  `,
  legend({ A: 'library', B: 'study', C: 'dining', D: 'pantry', E: 'bedroom', F: 'cloakroom', H: 'hall', G: 'kitchen', I: 'conservatory', J: 'games' }),
  'HC HD HE HF HG AD BE AB GI GJ FI',
);

/** Rooms in a ring around an open courtyard; the doors make a loop. */
export const courtyard: House = houseFromLayout(
  'courtyard',
  'The Courtyard House',
  `
  A A A A B B B C C C C C
  A A A A B B B C C C C C
  A A A A B B B C C C C C
  D D D D . . . . E E E E
  D D D D . . . . E E E E
  D D D D . . . . E E E E
  D D D D . . . . E E E E
  F F F F . . . . G G G G
  F F F F . . . . G G G G
  H H H H H H I I I I I I
  H H H H H H I I I I I I
  H H H H H H I I I I I I
  `,
  legend({ A: 'kitchen', B: 'hall', C: 'library', D: 'dining', E: 'study', F: 'pantry', G: 'cloakroom', H: 'conservatory', I: 'bedroom' }),
  'AB BC AD DF FH HI IG GE EC',
);

/** A staircase footprint, each wing a step further right. */
export const steps: House = houseFromLayout(
  'steps',
  'The Steps',
  `
  A A A A A A . . . . . .
  A A A A A A . . . . . .
  B B B B C C C C C . . .
  B B B B C C C C C . . .
  . . . . D D D D E E E E
  . . . . D D D D E E E E
  . . . . F F F F F G G G
  . . . . F F F F F G G G
  . . . . . . H H H H H H
  . . . . . . H H H H H H
  `,
  legend({ A: 'hall', B: 'study', C: 'library', D: 'dining', E: 'kitchen', F: 'bedroom', G: 'cloakroom', H: 'conservatory' }),
  'AB AC CD CE DE DF EG FG FH GH',
);

export const otherHouses: readonly House[] = [lodge, courtyard, steps];
