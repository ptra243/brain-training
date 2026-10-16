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

/**
 * Wordle versions of room clues. `{o}` is the object word; the teaser shows a
 * blank in its place and leaves the room out, so the room is only revealed
 * once the Wordle is solved.
 */
const wordleTemplates: Partial<Record<ClueType, { full: string; teaser: string }>> = {
  'suspect-room': { full: '{s} was by the {o} in the {r}.', teaser: '{s} was by the {blank}.' },
  'suspect-not-room': { full: '{s} never went near the {o} in the {r}.', teaser: '{s} never went near the {blank}.' },
  'item-room': { full: 'The {i} was left beside the {o} in the {r}.', teaser: 'The {i} was left beside the {blank}.' },
  'item-not-room': { full: 'The {i} was nowhere near the {o} in the {r}.', teaser: 'The {i} was nowhere near the {blank}.' },
  'suspect-next-to-room': {
    full: '{s} could hear someone by the {o} in the {r}, through the wall.',
    teaser: '{s} could hear someone by the {blank}, through the wall.',
  },
};

export const WORDLE_BLANK = '_ _ _ _ _';

/** Whether a clue can be delivered by Wordle (it names exactly one room). */
export function canDeliverByWordle(fact: ClueFact): fact is Extract<ClueFact, { room: string }> {
  return fact.type in wordleTemplates;
}

function names(content: Content) {
  return {
    suspect: (id: string) => content.suspects.find((s) => s.id === id)?.name ?? id,
    room: (id: string) => content.house.rooms.find((r) => r.id === id)?.name ?? id,
    item: (id: string) => content.items.find((i) => i.id === id)?.name ?? id,
  };
}

const fillIn = (template: string, fill: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => fill[k] ?? k);

/** Full text and teaser for a Wordle-delivered room clue. */
export function wordleClue(
  fact: Extract<ClueFact, { room: string }>,
  content: Content,
  rng: Rng,
): { text: string; answer: string; teaser: string } {
  const n = names(content);
  const room = content.house.rooms.find((r) => r.id === fact.room)!;
  const answer = rng.pick(room.objects);
  const t = wordleTemplates[fact.type]!;
  const fill: Record<string, string> = { r: room.name, o: answer.toLowerCase(), blank: WORDLE_BLANK };
  if ('suspect' in fact) fill.s = n.suspect(fact.suspect);
  if ('item' in fact) fill.i = n.item(fact.item);
  return { text: fillIn(t.full, fill), answer, teaser: fillIn(t.teaser, fill) };
}

/** Human sentence for a clue, with names from the content files. */
export function clueText(fact: ClueFact, content: Content, rng: Rng): string {
  const { suspect, room, item } = names(content);
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
  return fillIn(rng.pick(templates[fact.type]), fill);
}
