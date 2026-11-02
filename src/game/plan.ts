// Floor-plan geometry shared by the map and the explore map. Cells no room owns
// (void) are outside the house: not painted, not tappable.

import type { House, Room } from '../engine/types.ts';

/** Which room owns each "row,col" cell. Void cells are absent. */
export function ownerMap(house: House): Map<string, Room> {
  const m = new Map<string, Room>();
  for (const room of house.rooms) for (const [r, col] of room.cells) m.set(`${r},${col}`, room);
  return m;
}

/** Border widths (px) of one room tile: a wall wherever the neighbour is another room or outside the house. */
export function tileWalls(owner: Map<string, Room>, r: number, col: number): { borderTopWidth: number; borderLeftWidth: number; borderBottomWidth: number; borderRightWidth: number } {
  const here = owner.get(`${r},${col}`);
  const other = (dr: number, dc: number) => owner.get(`${r + dr},${col + dc}`) !== here;
  return {
    borderTopWidth: other(-1, 0) ? 3 : 0,
    borderLeftWidth: other(0, -1) ? 3 : 0,
    // The neighbour below/right draws the wall between two rooms; this tile draws it only on the outside.
    borderBottomWidth: owner.has(`${r + 1},${col}`) ? 0 : 3,
    borderRightWidth: owner.has(`${r},${col + 1}`) ? 0 : 3,
  };
}

/** A room name in a room only 3 squares wide (or less) in a house with doors is set smaller so it stays inside; the manor is untouched. */
export function labelClass(house: House, room: Room): string {
  if (!house.doors) return 'room-name';
  const row = room.cells[0][0];
  return room.cells.filter(([r]) => r === row).length <= 3 ? 'room-name tight' : 'room-name';
}

/** The biggest full rectangle of a room's cells (top row, left col, rows, cols): the room's tap target. */
export function tapRect(room: Room): { r: number; col: number; h: number; w: number } {
  const has = new Set(room.cells.map(([r, c]) => `${r},${c}`));
  let best = { r: room.cells[0][0], col: room.cells[0][1], h: 1, w: 1 };
  for (const [r0, c0] of room.cells) {
    for (let h = 1; has.has(`${r0 + h - 1},${c0}`); h++) {
      for (let w = 1; ; w++) {
        let full = true;
        for (let r = r0; r < r0 + h && full; r++) if (!has.has(`${r},${c0 + w - 1}`)) full = false;
        if (!full) break;
        if (h * w > best.h * best.w) best = { r: r0, col: c0, h, w };
      }
    }
  }
  return best;
}

const nearest = (room: Room, r: number, c: number) =>
  room.cells.reduce((best, cell) =>
    (cell[0] - r) ** 2 + (cell[1] - c) ** 2 < (best[0] - r) ** 2 + (best[1] - c) ** 2 ? cell : best,
  );

/** Counters gather at the room square nearest its centre; loose weapons at the square farthest from that. */
export function anchors(room: Room): { people: readonly [number, number]; things: readonly [number, number] } {
  const cr = room.cells.reduce((s, [r]) => s + r, 0) / room.cells.length;
  const cc = room.cells.reduce((s, [, col]) => s + col, 0) / room.cells.length;
  const people = nearest(room, cr, cc);
  const things =
    room.cells.length === 1
      ? people
      : room.cells.reduce((best, cell) =>
          (cell[0] - people[0]) ** 2 + (cell[1] - people[1]) ** 2 > (best[0] - people[0]) ** 2 + (best[1] - people[1]) ** 2
            ? cell
            : best,
        );
  return { people, things };
}

/** Offsets (in squares) so several counters in one room don't sit on top of each other. */
export const SPREAD: [number, number][][] = [
  [[0, 0]],
  [[0, -0.27], [0, 0.27]],
  [[-0.22, -0.27], [-0.22, 0.27], [0.27, 0]],
  [[-0.24, -0.27], [-0.24, 0.27], [0.24, -0.27], [0.24, 0.27]],
  [[-0.27, -0.3], [-0.27, 0.3], [0.27, -0.3], [0.27, 0.3], [0, 0]],
];
