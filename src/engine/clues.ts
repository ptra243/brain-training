import type { ClueFact, Solution } from './types.ts';
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
    case 'suspects-together': {
      const a = idx(fact.suspects[0]);
      const b = idx(fact.suspects[1]);
      return (sol) => sol.room[a] === sol.room[b];
    }
    case 'suspects-apart': {
      const a = idx(fact.suspects[0]);
      const b = idx(fact.suspects[1]);
      return (sol) => sol.room[a] !== sol.room[b];
    }
    case 'suspect-alone': {
      const s = idx(fact.suspect);
      return (sol) => sol.room.every((r, i) => i === s || r !== sol.room[s]);
    }
    case 'suspect-empty-handed': {
      const s = idx(fact.suspect);
      return (sol) => sol.item[s] === null;
    }
  }
}

/**
 * Every true statement of the supported types about this solution. With
 * `shared` rooms (7 guests) it adds who was together, apart, alone or
 * empty-handed; a classic pool is exactly as it always was.
 */
export function cluePool(
  solution: Solution,
  ctx: ClueContext,
  caseRooms: readonly string[],
  caseItems: readonly string[],
  allRooms: readonly string[],
  rng: Rng,
  shared = false,
): ClueFact[] {
  const pool: ClueFact[] = [];
  const { suspects, adjacency } = ctx;

  suspects.forEach((suspect, i) => {
    const room = solution.room[i];
    const item = solution.item[i];
    pool.push({ type: 'suspect-room', suspect, room });
    if (item === null) pool.push({ type: 'suspect-empty-handed', suspect });
    else pool.push({ type: 'suspect-item', suspect, item });
    if (shared && solution.room.every((r, j) => j === i || r !== room)) pool.push({ type: 'suspect-alone', suspect });
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
      const same = solution.room[a] === solution.room[b];
      const touching = adjacency.get(solution.room[a])?.has(solution.room[b]);
      if (shared) pool.push({ type: same ? 'suspects-together' : 'suspects-apart', suspects: pair });
      // Together is not "not neighbouring": that would read as a trick.
      if (!same) pool.push({ type: touching ? 'suspects-adjacent' : 'suspects-not-adjacent', suspects: pair });
    }
  }
  return pool;
}

export const WORDLE_BLANK = '_ _ _ _ _';
