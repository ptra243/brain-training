import type { Cell, House, Room } from './types.ts';

type RoomMeta = Omit<Room, 'cells'>;

/**
 * Build a house from an ASCII layout: one letter per grid cell, rows separated
 * by newlines, spaces ignored. Each letter maps to a room in `legend`.
 */
export function houseFromLayout(
  id: string,
  name: string,
  layout: string,
  legend: Record<string, RoomMeta>,
): House {
  const grid = layout
    .trim()
    .split('\n')
    .map((line) => line.replace(/\s+/g, '').split(''));
  const rows = grid.length;
  const cols = grid[0].length;
  const cellsByLetter = new Map<string, Cell[]>();
  grid.forEach((line, r) => {
    if (line.length !== cols) throw new Error(`Layout row ${r} has ${line.length} cells, expected ${cols}`);
    line.forEach((letter, c) => {
      if (!legend[letter]) throw new Error(`Layout letter "${letter}" has no room in the legend`);
      const list = cellsByLetter.get(letter) ?? [];
      list.push([r, c]);
      cellsByLetter.set(letter, list);
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
  return house;
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

/** Room id -> set of room ids sharing at least one cell edge with it. */
export function roomAdjacency(house: House): Map<string, Set<string>> {
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

/** Map coordinate label for a cell, e.g. [0, 0] -> "A1" (column letter, row number). */
export function cellLabel([r, c]: Cell): string {
  return `${String.fromCharCode(65 + c)}${r + 1}`;
}
