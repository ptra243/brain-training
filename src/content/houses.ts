// The other houses a case can be set in (the manor is `house` in ./index.ts).
// Each uses only part of its 12x12 grid: `.` is outside the house. Rooms are
// joined by doors, so only door-joined rooms count as touching.

import { VARIANTS, houseFromLayout, parseVariantId, rotateHouse } from '../engine/house.ts';
import { Rng, hashSeed } from '../engine/rng.ts';
import type { House, NosingOverride, Room } from '../engine/types.ts';
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

/**
 * Nosing around on a big irregular house: one square per cell (28px), easy keeps its stock length
 * and dice but stops once searchClues + 2 rooms are entered, medium and hard walk the longer `len`
 * with two dice and visit every room (the lodge's hub makes that too rare to build: it stops
 * after searchClues + 3 rooms). No path ends in a room it barely entered.
 */
function withNosing(h: House, long: { len: readonly [number, number]; turns: readonly [number, number]; enterExtra?: number; obstacles?: number }): House {
  // Absent fields stay absent: an explicit `undefined` would overwrite the stock value when the spec is merged.
  const harder: NosingOverride = { dice: 2, len: long.len, turns: long.turns };
  if (long.enterExtra !== undefined) harder.enterExtra = long.enterExtra;
  if (long.obstacles !== undefined) harder.obstacles = long.obstacles;
  return {
    ...h,
    nosing: { all: { n: 1, minEndRoom: 3 }, easy: { enterExtra: 2, enterMax: 6 }, medium: harder, hard: harder },
  };
}

/** L-shaped lodge: a hall in the middle, most rooms opening onto it. */
export const lodge: House = withNosing(houseFromLayout(
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
), { len: [100, 110], turns: [12, 22], enterExtra: 3 });

/** Rooms in a ring around an open courtyard; the doors make a loop. */
export const courtyard: House = withNosing(houseFromLayout(
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
), { len: [95, 105], turns: [11, 20] });

/** A staircase footprint, each wing a step further right. */
export const steps: House = withNosing(houseFromLayout(
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
), { len: [58, 66], turns: [7, 15] });

/** Twelve squares wide, four deep: a row of four rooms over a hall and three more. */
export const longHouse: House = withNosing(houseFromLayout(
  'long',
  'The Long House',
  `
  A A A D D D K K K S S S
  A A A D D D K K K S S S
  C C H H H H H H V V B B
  C C H H H H H H V V B B
  `,
  legend({ A: 'library', D: 'dining', K: 'kitchen', S: 'study', C: 'cloakroom', H: 'hall', V: 'conservatory', B: 'bedroom' }),
  'HA HD HK HC HV AD KS SB VB',
), { len: [40, 44], turns: [5, 14], obstacles: 14 });

/** A T-shaped lodge: a wide bar of rooms with a hall in the middle and a stem of rooms running down from it. */
export const tLodge: House = withNosing(houseFromLayout(
  'tlodge',
  'The T Lodge',
  `
  A A A A D D D D S S S S
  A A A A D D D D S S S S
  C C C C H H H H K K K K
  C C C C H H H H K K K K
  . . . . B B G G . . . .
  . . . . B B G G . . . .
  . . . . B B G G . . . .
  . . . . B B G G . . . .
  . . . . V V V V . . . .
  . . . . V V V V . . . .
  . . . . V V V V . . . .
  . . . . V V V V . . . .
  `,
  legend({ A: 'library', D: 'dining', S: 'study', C: 'cloakroom', H: 'hall', K: 'kitchen', B: 'bedroom', G: 'games', V: 'conservatory' }),
  'HD HC HK HB HG DA DS AC SK BV',
), { len: [64, 70], turns: [7, 17], enterExtra: 3 });

export const otherHouses: readonly House[] = [lodge, courtyard, steps, longHouse, tLodge];

/** Every layout, the manor first. */
export const allHouses: readonly House[] = [manor, ...otherHouses];

/** The houses a new case may be set in. Only the manor until nosing copes with the others. */
export const playableHouses: readonly House[] = [manor];

const variantCache = new Map<string, House>();

/** A layout by id, or one of its turned/mirrored variants ("lodge/r90", "lodge/m"). Throws on an unknown id. */
export function houseById(id: string): House {
  const direct = allHouses.find((x) => x.id === id);
  if (direct) return direct;
  const cached = variantCache.get(id);
  if (cached) return cached;
  const { base, quarterTurns, mirror } = parseVariantId(id);
  const layout = allHouses.find((x) => x.id === base);
  if (!layout) throw new Error(`Unknown house "${id}"`);
  const h = rotateHouse(layout, quarterTurns, mirror);
  variantCache.set(id, h);
  return h;
}

/** The 8 orientations of a layout, the layout itself first. */
export const variantsOf = (layout: House): House[] => VARIANTS.map((v) => houseById(v.suffix ? `${layout.id}/${v.suffix}` : layout.id));

/** Whether the id names a layout or one of its variants. */
export function isHouseId(id: string): boolean {
  try {
    houseById(id);
    return true;
  } catch {
    return false;
  }
}

/** The house a case is set in. */
export const houseOf = (c: { houseId: string }): House => houseById(c.houseId);

/**
 * The house for a seed text, on its own seed stream (never the main rng, so the
 * rest of the case does not depend on how many houses are playable).
 */
export function chooseHouse(seedText: string, from: readonly House[] = playableHouses): House {
  if (from.length === 1 && from[0] === manor) return manor;
  const rng = new Rng(hashSeed(`${seedText}-house`));
  const layout = rng.pick(from);
  // The manor is never turned; every other layout is rolled one of its 8 orientations.
  return layout === manor ? layout : houseById(`${layout.id}/${VARIANTS[rng.int(VARIANTS.length)].suffix}`.replace(/\/$/, ''));
}
