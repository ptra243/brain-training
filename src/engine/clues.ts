import type { ClueFact, ClueType, Content, Solution } from './types.ts';
import type { Rng } from './rng.ts';

/** Everything a clue needs to be checked against a candidate solution. */
export interface ClueContext {
  /** Suspect ids in play, in solution order. */
  suspects: readonly string[];
  /** Room id -> ids of rooms that share a wall with it. */
  adjacency: Map<string, Set<string>>;
}

/** Turn a clue into a fast true/false test over candidate solutions. */
export function compileClue(fact: ClueFact, ctx: ClueContext): (sol: Solution) => boolean {
  const idx = (id: string) => {
    const i = ctx.suspects.indexOf(id);
    if (i < 0) throw new Error(`Suspect ${id} is not in this case`);
    return i;
  };
  const adjacent = (a: string, b: string) => ctx.adjacency.get(a)?.has(b) ?? false;

  switch (fact.type) {
    case 'suspect-room': {
      const s = idx(fact.suspect);
      return (sol) => sol.room[s] === fact.room;
    }
    case 'suspect-not-room': {
      const s = idx(fact.suspect);
      return (sol) => sol.room[s] !== fact.room;
    }
    case 'suspect-item': {
      const s = idx(fact.suspect);
      return (sol) => sol.item[s] === fact.item;
    }
    case 'suspect-not-item': {
      const s = idx(fact.suspect);
      return (sol) => sol.item[s] !== fact.item;
    }
    case 'item-room':
      return (sol) => sol.room[sol.item.indexOf(fact.item)] === fact.room;
    case 'item-not-room':
      return (sol) => sol.room[sol.item.indexOf(fact.item)] !== fact.room;
    case 'suspect-either-room': {
      const s = idx(fact.suspect);
      return (sol) => sol.room[s] === fact.rooms[0] || sol.room[s] === fact.rooms[1];
    }
    case 'suspect-next-to-room': {
      const s = idx(fact.suspect);
      return (sol) => sol.room[s] !== fact.room && adjacent(sol.room[s], fact.room);
    }
    case 'suspects-adjacent': {
      const a = idx(fact.suspects[0]);
      const b = idx(fact.suspects[1]);
      return (sol) => adjacent(sol.room[a], sol.room[b]);
    }
    case 'suspects-not-adjacent': {
      const a = idx(fact.suspects[0]);
      const b = idx(fact.suspects[1]);
      return (sol) => !adjacent(sol.room[a], sol.room[b]);
    }
  }
}

/** Every true statement of the supported types about this solution. */
export function cluePool(
  solution: Solution,
  ctx: ClueContext,
  caseRooms: readonly string[],
  caseItems: readonly string[],
  allRooms: readonly string[],
  rng: Rng,
): ClueFact[] {
  const pool: ClueFact[] = [];
  const { suspects, adjacency } = ctx;

  suspects.forEach((suspect, i) => {
    const room = solution.room[i];
    const item = solution.item[i];
    pool.push({ type: 'suspect-room', suspect, room });
    pool.push({ type: 'suspect-item', suspect, item });
    for (const r of caseRooms) if (r !== room) pool.push({ type: 'suspect-not-room', suspect, room: r });
    for (const it of caseItems) if (it !== item) pool.push({ type: 'suspect-not-item', suspect, item: it });

    // "Either" pairs the true room with each wrong one; order is shuffled so
    // the true room isn't always named first.
    for (const r of caseRooms) {
      if (r === room) continue;
      const pair: [string, string] = rng.next() < 0.5 ? [room, r] : [r, room];
      pool.push({ type: 'suspect-either-room', suspect, rooms: pair });
    }

    // Neighbouring rooms can include empty rooms on the map.
    for (const r of allRooms) {
      if (r !== room && adjacency.get(room)?.has(r)) pool.push({ type: 'suspect-next-to-room', suspect, room: r });
    }
  });

  caseItems.forEach((item) => {
    const room = solution.room[solution.item.indexOf(item)];
    pool.push({ type: 'item-room', item, room });
    for (const r of caseRooms) if (r !== room) pool.push({ type: 'item-not-room', item, room: r });
  });

  for (let a = 0; a < suspects.length; a++) {
    for (let b = a + 1; b < suspects.length; b++) {
      const pair: [string, string] = [suspects[a], suspects[b]];
      const touching = adjacency.get(solution.room[a])?.has(solution.room[b]);
      pool.push({ type: touching ? 'suspects-adjacent' : 'suspects-not-adjacent', suspects: pair });
    }
  }
  return pool;
}

const templates: Record<ClueType, readonly string[]> = {
  'suspect-room': ['{s} was in the {r}.', '{s} spent the whole evening in the {r}.'],
  'suspect-not-room': ['{s} was not in the {r}.', '{s} never set foot in the {r}.'],
  'suspect-item': ['{s} was holding the {i}.', 'The {i} was in the hands of {s}.'],
  'suspect-not-item': ['{s} did not have the {i}.', 'The {i} was not with {s}.'],
  'item-room': ['The {i} was in the {r}.', 'Whoever had the {i} was in the {r}.'],
  'item-not-room': ['The {i} was not in the {r}.', 'Nobody in the {r} had the {i}.'],
  'suspect-either-room': ['{s} was in either the {r} or the {r2}.'],
  'suspect-next-to-room': ['{s} was in a room next to the {r}.', '{s} was just through the wall from the {r}.'],
  'suspects-adjacent': ['{a} and {b} were in neighbouring rooms.', '{a} could hear {b} through the wall.'],
  'suspects-not-adjacent': ['{a} and {b} were not in neighbouring rooms.'],
};

/** Human sentence for a clue, with names from the content files. */
export function clueText(fact: ClueFact, content: Content, rng: Rng): string {
  const suspect = (id: string) => content.suspects.find((s) => s.id === id)?.name ?? id;
  const room = (id: string) => content.house.rooms.find((r) => r.id === id)?.name ?? id;
  const item = (id: string) => content.items.find((i) => i.id === id)?.name ?? id;
  const fill: Record<string, string> = {};
  if ('suspect' in fact) fill.s = suspect(fact.suspect);
  if ('item' in fact) fill.i = item(fact.item);
  if ('room' in fact) fill.r = room(fact.room);
  if ('rooms' in fact) {
    fill.r = room(fact.rooms[0]);
    fill.r2 = room(fact.rooms[1]);
  }
  if ('suspects' in fact) {
    fill.a = suspect(fact.suspects[0]);
    fill.b = suspect(fact.suspects[1]);
  }
  return rng.pick(templates[fact.type]).replace(/\{(\w+)\}/g, (_, k: string) => fill[k] ?? k);
}
