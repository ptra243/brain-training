import type { Cell, DoorSpot, House, Room } from './types.ts';

type RoomMeta = Omit<Room, 'cells'>;

/** The layout letter for a cell no room owns (outside the house). */
const VOID = '.';

/**
 * Build a house from an ASCII layout: one letter per grid cell, rows separated
 * by newlines, spaces ignored. Each letter maps to a room in `legend`; `.` is a
 * void cell outside the house. `doors` (optional) lists door pairs as
 * space-separated two-letter legend pairs ("HC HD"): with it only door-joined
 * rooms touch (see `roomAdjacency`); without it, rooms sharing a wall touch.
 */
export function houseFromLayout(
  id: string,
  name: string,
  layout: string,
  legend: Record<string, RoomMeta>,
  doors?: string,
): House {
  const grid = layout
    .trim()
    .split('\n')
    .map((line) => line.replace(/\s+/g, '').split(''));
  const rows = grid.length;
  const cols = grid[0].length;
  const cellsByLetter = new Map<string, Cell[]>();
  const footprint: Cell[] = [];
  grid.forEach((line, r) => {
    if (line.length !== cols) throw new Error(`Layout row ${r} has ${line.length} cells, expected ${cols}`);
    line.forEach((letter, c) => {
      if (letter === VOID) return;
      if (!legend[letter]) throw new Error(`Layout letter "${letter}" has no room in the legend`);
      const list = cellsByLetter.get(letter) ?? [];
      list.push([r, c]);
      cellsByLetter.set(letter, list);
      footprint.push([r, c]);
    });
  });
  const rooms: Room[] = Object.entries(legend).map(([letter, meta]) => {
    const cells = cellsByLetter.get(letter);
    if (!cells) throw new Error(`Room "${meta.name}" (${letter}) has no cells in the layout`);
    return { ...meta, cells };
  });
  const house: House = { id, name, rows, cols, rooms };
  for (const room of rooms) {
    if (!isContiguous(room.cells)) throw new Error(`Room "${room.name}" is not contiguous`);
  }
  if (!isContiguous(footprint)) throw new Error(`House "${name}": the footprint (cells that are not void) is not contiguous`);
  if (doors === undefined) return house;

  const idOf = new Map(Object.entries(legend).map(([letter, meta]) => [letter, meta.id]));
  const pairs: [string, string][] = doors.split(/\s+/).filter(Boolean).map((token) => {
    if (token.length !== 2) throw new Error(`Door "${token}" must be two legend letters`);
    const [la, lb] = token.split('');
    const a = idOf.get(la);
    const b = idOf.get(lb);
    if (!a) throw new Error(`Door "${token}": "${la}" is not in the legend`);
    if (!b) throw new Error(`Door "${token}": "${lb}" is not in the legend`);
    if (a === b) throw new Error(`Door "${token}" joins a room to itself`);
    return [a, b];
  });
  const withDoors: House = { ...house, doors: pairs };
  const walls = sharedWallAdjacency(house);
  const seenPair = new Set<string>();
  for (const [a, b] of pairs) {
    if (!walls.get(a)!.has(b)) throw new Error(`Door ${a}-${b}: the rooms do not share a wall`);
    const key = [a, b].sort().join('|');
    if (seenPair.has(key)) throw new Error(`Door ${a}-${b} is listed twice`);
    seenPair.add(key);
  }
  const adj = roomAdjacency(withDoors);
  const start = rooms[0].id;
  const reached = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    for (const n of adj.get(queue.pop()!)!) {
      if (!reached.has(n)) {
        reached.add(n);
        queue.push(n);
      }
    }
  }
  const lost = rooms.filter((r) => !reached.has(r.id)).map((r) => r.id);
  if (lost.length) throw new Error(`Doors do not connect every room; unreachable: ${lost.join(', ')}`);
  return withDoors;
}

function isContiguous(cells: readonly Cell[]): boolean {
  const key = (c: Cell) => `${c[0]},${c[1]}`;
  const all = new Set(cells.map(key));
  const seen = new Set<string>([key(cells[0])]);
  const queue: Cell[] = [cells[0]];
  while (queue.length) {
    const [r, c] = queue.pop()!;
    for (const n of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as Cell[]) {
      const k = key(n);
      if (all.has(k) && !seen.has(k)) {
        seen.add(k);
        queue.push(n);
      }
    }
  }
  return seen.size === all.size;
}

/** Room id -> set of room ids sharing at least one cell edge with it (ignores doors). */
export function sharedWallAdjacency(house: House): Map<string, Set<string>> {
  const owner = new Map<string, string>();
  for (const room of house.rooms) for (const [r, c] of room.cells) owner.set(`${r},${c}`, room.id);
  const adj = new Map<string, Set<string>>(house.rooms.map((room) => [room.id, new Set<string>()]));
  for (const room of house.rooms) {
    for (const [r, c] of room.cells) {
      for (const [nr, nc] of [[r + 1, c], [r, c + 1]]) {
        const other = owner.get(`${nr},${nc}`);
        if (other && other !== room.id) {
          adj.get(room.id)!.add(other);
          adj.get(other)!.add(room.id);
        }
      }
    }
  }
  return adj;
}

/** Room id -> rooms that touch it: the door pairs when the house has doors, else rooms sharing a wall. */
export function roomAdjacency(house: House): Map<string, Set<string>> {
  if (!house.doors) return sharedWallAdjacency(house);
  const adj = new Map<string, Set<string>>(house.rooms.map((room) => [room.id, new Set<string>()]));
  for (const [a, b] of house.doors) {
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }
  return adj;
}

/** One spot per door: the middle cell (row-major) of the wall the two rooms share. */
export function doorSpots(house: House): DoorSpot[] {
  const owner = new Map<string, string>();
  for (const room of house.rooms) for (const [r, c] of room.cells) owner.set(`${r},${c}`, room.id);
  return (house.doors ?? []).map(([a, b]) => {
    const edges: { row: number; col: number; side: 'right' | 'bottom' }[] = [];
    for (const room of house.rooms) {
      if (room.id !== a && room.id !== b) continue;
      const other = room.id === a ? b : a;
      for (const [r, c] of room.cells) {
        if (owner.get(`${r},${c + 1}`) === other) edges.push({ row: r, col: c, side: 'right' });
        if (owner.get(`${r + 1},${c}`) === other) edges.push({ row: r, col: c, side: 'bottom' });
      }
    }
    if (!edges.length) throw new Error(`Door ${a}-${b}: the rooms do not share a wall`);
    edges.sort((x, y) => x.row - y.row || x.col - y.col || (x.side === y.side ? 0 : x.side === 'right' ? -1 : 1));
    const mid = edges[Math.floor(edges.length / 2)];
    return { a, b, ...mid };
  });
}

/** The 8 orientations of a layout: quarter turns clockwise, and whether it is mirrored (left-right) first. */
export const VARIANTS: readonly { quarterTurns: number; mirror: boolean; suffix: string }[] = [
  { quarterTurns: 0, mirror: false, suffix: '' },
  { quarterTurns: 1, mirror: false, suffix: 'r90' },
  { quarterTurns: 2, mirror: false, suffix: 'r180' },
  { quarterTurns: 3, mirror: false, suffix: 'r270' },
  { quarterTurns: 0, mirror: true, suffix: 'm' },
  { quarterTurns: 1, mirror: true, suffix: 'm90' },
  { quarterTurns: 2, mirror: true, suffix: 'm180' },
  { quarterTurns: 3, mirror: true, suffix: 'm270' },
];

/** Split "lodge/m90" into its base id and variant; a plain id is the unturned layout. Throws on an unknown suffix. */
export function parseVariantId(id: string): { base: string; quarterTurns: number; mirror: boolean } {
  const slash = id.indexOf('/');
  if (slash < 0) return { base: id, quarterTurns: 0, mirror: false };
  const suffix = id.slice(slash + 1);
  const v = VARIANTS.find((x) => x.suffix === suffix && suffix !== '');
  if (!v) throw new Error(`Unknown house variant "${id}"`);
  return { base: id.slice(0, slash), quarterTurns: v.quarterTurns, mirror: v.mirror };
}

/**
 * The house turned clockwise by `quarterTurns` (after an optional left-right mirror). A quarter turn swaps
 * the grid's rows and columns. Rooms, doors (by room pair) and nosing overrides carry over; room cells
 * stay in row-major order so the first cell is still the label cell, and labels stay horizontal.
 */
export function rotateHouse(house: House, quarterTurns: number, mirror: boolean): House {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (turns === 0 && !mirror) return house;
  const suffix = VARIANTS.find((v) => v.quarterTurns === turns && v.mirror === mirror)!.suffix;
  let rows = house.rows;
  let cols = house.cols;
  const move = (cell: Cell): Cell => {
    let [r, c] = cell;
    let R = house.rows;
    let C = house.cols;
    if (mirror) c = C - 1 - c;
    for (let i = 0; i < turns; i++) {
      [r, c] = [c, R - 1 - r];
      [R, C] = [C, R];
    }
    rows = R;
    cols = C;
    return [r, c];
  };
  const rooms: Room[] = house.rooms.map((room) => ({
    ...room,
    cells: room.cells.map(move).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
  }));
  return { ...house, id: `${house.id}/${suffix}`, rows, cols, rooms };
}

/** Map coordinate label for a cell, e.g. [0, 0] -> "A1" (column letter, row number). */
export function cellLabel([r, c]: Cell): string {
  return `${String.fromCharCode(65 + c)}${r + 1}`;
}
