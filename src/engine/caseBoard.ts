// From a case to a case board (`boardTypes.ts`, built by `board.ts`).
//
// Every clue is a piece: one per guest it names. A guest's pieces go where the
// clues prove they were, or in Unknown when nothing proves it; weapons the
// same. What a clue says becomes marks on its pieces where the board can show
// it (rooms ruled out or allowed, a guest with a weapon, two guests together
// or apart); the rest ("next door", "alone", "empty-handed") gives its piece
// with no mark, and the shapes carry it.
//
// - The case board puzzle (a rotating game) is built from the free clues plus
//   its own reward clues, whose pieces stay blank until it's solved: the only
//   way the pieces fit is what all of them prove together, so solving it
//   proves the reward.
// - The end board (a starting option) is built from the clues she has found,
//   plus a grey piece for each puzzle she hasn't played, and the body once she
//   knows the scene. It shows what her clues prove before she accuses.

import { houseById } from '../content/houses.ts';
import { buildBoard } from './board.ts';
import { UNKNOWN, type Board, type BoardPiecePlan, type BoardPlan } from './boardTypes.ts';
import { caseContext, caseSpace } from './caseFacts.ts';
import { pinnedIds } from '../game/board/boardSave.ts';
import { Rng, hashSeed } from './rng.ts';
import { anyMatching } from './search.ts';
import { gameLevel, type CaseLevels } from './settings.ts';
import type { Case, Clue, ClueFact, Content, Difficulty, GameSpec } from './types.ts';

/** What a board needs to know about a case (the generator calls it before the case is finished). */
export type BoardCase = Pick<Case, 'suspects' | 'rooms' | 'items' | 'shared' | 'seed' | 'sceneRoom'> & { clues: readonly BoardClue[] };
type BoardClue = Pick<Clue, 'id' | 'fact' | 'delivery'>;

/** Most pieces one guest gets; past this, more clues about them only add marks. */
const MAX_PIECES_PER_GUEST = 2;

/** What the facts prove: each guest's and weapon's room, or UNKNOWN. */
export function provenSections(content: Content, c: Pick<Case, 'suspects' | 'rooms' | 'items' | 'shared'> & { houseId?: string }, facts: readonly ClueFact[]): Record<string, string> {
  const space = caseSpace(c);
  const ctx = caseContext(c.houseId ? houseById(c.houseId) : content.house, c);
  const only = (test: (room: string) => ClueFact) => {
    const rooms = c.rooms.filter((room) => anyMatching(space, [...facts, test(room)], ctx));
    return rooms.length === 1 ? rooms[0] : UNKNOWN;
  };
  const out: Record<string, string> = {};
  for (const suspect of c.suspects) out[suspect] = only((room) => ({ type: 'suspect-room', suspect, room }));
  for (const item of c.items) out[item] = only((room) => ({ type: 'item-room', item, room }));
  return out;
}

/** Guests a fact names. */
const guestsIn = (f: ClueFact): string[] => ('suspect' in f ? [f.suspect] : 'suspects' in f ? [...f.suspects] : []);

interface PlanInput {
  content: Content;
  c: BoardCase;
  /** Clues whose pieces carry their marks. */
  shown: readonly BoardClue[];
  /** Clues she doesn't have yet whose pieces are on the board blank (the puzzle's reward). */
  hidden: readonly BoardClue[];
  /** What the board's answer is: what these facts prove. */
  proven: Record<string, string>;
  /** Rooms on the board. */
  rooms: string[];
  /** Weapons on the board. */
  items: string[];
  greys: number;
  fog: number;
  /** The scene room, to put the body in, once she knows it. */
  body: string | null;
  seed: number;
  /** Guests and weapons whose pieces must never start pinned (they'd give the answer away). */
  neverPinWho: string[];
}

/** Turns clues into pieces, marks and pairs. */
function plan(o: PlanInput): BoardPlan {
  const pieces: BoardPiecePlan[] = [];
  const touches: [string, string][] = [];
  const apart: [string, string][] = [];
  const weaponPiece = (item: string) => {
    let p = pieces.find((x) => x.kind === 'weapon' && x.who === item);
    if (!p) {
      p = { id: `w-${item}`, kind: 'weapon', who: item, section: o.proven[item] ?? UNKNOWN, not: [], only: null, clue: null };
      pieces.push(p);
    }
    return p;
  };
  for (const item of o.items) weaponPiece(item);
  let n = 0;
  const guestPiece = (guest: string, clue: BoardClue, hidden: boolean): BoardPiecePlan => {
    const mine = pieces.filter((x) => x.kind === 'guest' && x.who === guest);
    // Past the cap, a clue adds its marks to the guest's last piece instead (never to a hidden one).
    const reuse = mine.length >= MAX_PIECES_PER_GUEST ? mine.filter((x) => !!x.hidden === hidden).pop() : undefined;
    if (reuse) return reuse;
    const p: BoardPiecePlan = { id: `g${++n}-${guest}`, kind: 'guest', who: guest, section: o.proven[guest] ?? UNKNOWN, not: [], only: null, clue: clue.id, ...(hidden && { hidden: true }) };
    pieces.push(p);
    return p;
  };
  const onBoard = (room: string) => o.rooms.includes(room);
  const addNot = (p: BoardPiecePlan, room: string) => { if (onBoard(room) && !p.not.includes(room)) p.not.push(room); };
  const addOnly = (p: BoardPiecePlan, rooms: readonly string[]) => {
    const here = rooms.filter(onBoard);
    p.only = p.only ? p.only.filter((r) => here.includes(r)) : here;
  };
  const clues = [...o.shown.map((clue) => ({ clue, hidden: false })), ...o.hidden.map((clue) => ({ clue, hidden: true }))];
  for (const { clue, hidden } of clues) {
    const f = clue.fact;
    const gs = guestsIn(f).map((g) => guestPiece(g, clue, hidden));
    if (hidden) continue; // a hidden clue's pieces carry nothing until it's solved
    switch (f.type) {
      case 'suspect-room': addOnly(gs[0], [f.room]); break;
      case 'suspect-not-room': addNot(gs[0], f.room); break;
      case 'suspect-either-room': addOnly(gs[0], f.rooms); break;
      case 'suspect-item': if (o.items.includes(f.item)) touches.push([gs[0].id, weaponPiece(f.item).id]); break;
      // With your own room and weapon each, not holding it means not in its room.
      case 'suspect-not-item': if (!o.c.shared && o.items.includes(f.item)) apart.push([gs[0].id, weaponPiece(f.item).id]); break;
      case 'item-room': if (o.items.includes(f.item)) addOnly(weaponPiece(f.item), [f.room]); break;
      case 'item-not-room': if (o.items.includes(f.item)) addNot(weaponPiece(f.item), f.room); break;
      case 'suspects-together': touches.push([gs[0].id, gs[1].id]); break;
      case 'suspects-apart': apart.push([gs[0].id, gs[1].id]); break;
      // Next door, adjacent, alone, empty-handed: the piece, no mark.
      default: break;
    }
  }
  for (let i = 0; i < o.greys; i++) pieces.push({ id: `grey${i + 1}`, kind: 'grey', who: null, section: UNKNOWN, not: [], only: null, clue: null });
  if (o.body) pieces.push({ id: 'body', kind: 'body', who: null, section: o.body, not: [], only: null, clue: null });
  // An "only" that left nothing on the board can't be shown: drop it (the shapes carry it).
  for (const p of pieces) if (p.only && !p.only.length) p.only = null;
  // Duplicate pairs (two clues saying the same) count once.
  const uniq = (pairs: [string, string][]) => [...new Map(pairs.filter(([a, b]) => a !== b).map(([a, b]) => [[a, b].sort().join('|'), [a, b] as [string, string]])).values()];
  return {
    seed: o.seed,
    rooms: o.rooms,
    pieces,
    touches: uniq(touches),
    apart: uniq(apart),
    fog: o.fog,
    clues: { shown: o.shown.map((cl) => cl.id), hidden: o.hidden.map((cl) => cl.id) },
    neverPin: pieces.filter((p) => ((p.kind === 'guest' || p.kind === 'weapon') && o.neverPinWho.includes(p.who!)) || p.hidden).map((p) => p.id),
  };
}

const freeClues = (c: BoardCase) => c.clues.filter((cl) => cl.delivery === 'given');

/**
 * The case board puzzle for one of a case's games: the free clues as pieces,
 * and its own clues as blank pieces. Its answer is what all of them prove, so
 * solving it proves its clues. Small: only the rooms its pieces need.
 */
export function boardPuzzlePlan(content: Content, c: BoardCase, spec: Pick<GameSpec, 'seed' | 'clues'>): BoardPlan {
  const shown = freeClues(c);
  const hidden = c.clues.filter((cl) => spec.clues.includes(cl.id));
  const facts = [...shown, ...hidden].map((cl) => cl.fact);
  const proven = provenSections(content, c, facts);
  const named = new Set([...shown, ...hidden].flatMap((cl) => guestsIn(cl.fact)));
  // Weapons only when a clue names them.
  const items = c.items.filter((i) => [...shown, ...hidden].some((cl) => 'item' in cl.fact && cl.fact.item === i));
  // Rooms: where its pieces go, then rooms its clues mention, then any, until there are three.
  const rooms: string[] = [];
  const want = (r: string) => { if (r !== UNKNOWN && c.rooms.includes(r) && !rooms.includes(r)) rooms.push(r); };
  [...named].forEach((g) => want(proven[g]));
  items.forEach((i) => want(proven[i]));
  for (const cl of [...shown, ...hidden]) {
    const f = cl.fact;
    if ('room' in f) want(f.room);
    if ('rooms' in f) f.rooms.forEach(want);
  }
  const extra = c.rooms.filter((r) => !rooms.includes(r));
  while (rooms.length < 3 && extra.length) rooms.push(extra.shift()!);
  // Who the reward places: never pinned.
  const before = provenSections(content, c, shown.map((cl) => cl.fact));
  // Guests and weapons the reward places: their pieces must never start pinned, or the reward shows before it's earned.
  const revealed = [...named, ...items].filter((x) => before[x] !== proven[x]);
  return plan({
    content, c, shown, hidden, proven, rooms: c.rooms.filter((r) => rooms.includes(r)), items,
    greys: 0, fog: 1, body: null, seed: spec.seed, neverPinWho: revealed,
  });
}

/** The puzzle's board, or null if none can be built for these clues. */
/**
 * Built boards, by what they were built from. A board takes up to a second on a
 * phone, and the same one is asked for again (the generator checks a puzzle's
 * board, then the game opens it; the Board tab remounts on every visit).
 */
const built = new Map<string, Board | null>();
function cached(key: string, make: () => Board | null): Board | null {
  if (built.has(key)) return built.get(key)!;
  const board = make();
  if (built.size >= 24) built.delete(built.keys().next().value!);
  built.set(key, board);
  return board;
}

/** The level the board game is played at: a Play case's own roll for it, else the case's minigame level. */
export const boardLevel = (levels: CaseLevels): Difficulty => gameLevel(levels, 'board') ?? levels.minigames;

/** Fewest pieces she must place herself (not pinned at her level, not the body) before a board is padded. */
export const MIN_TO_PLACE: Record<Difficulty, number> = { easy: 5, medium: 8, hard: 11 };
/** Most loose Noticed pieces a board is padded with: a little over hard's minimum, since a repair pin can eat a piece. */
export const MAX_FILLER = 12;
/** Biggest group of Noticed pieces that touch each other, per level. */
export const MAX_GROUP: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
/** Different cuts tried for each filler count (the first uses the plan's own seed). A repair pin can eat a piece, another cut may not. */
const PAD_CUTS = 4;

/** Pieces she places herself at a level: everything not pinned there, bar the body. */
export function piecesToPlace(board: Board, level: Difficulty): number {
  const pinned = new Set(pinnedIds(board, level));
  return board.pieces.filter((p) => p.kind !== 'body' && !pinned.has(p.id)).length;
}

/** How n filler pieces split into groups of 2 or more, none bigger than max; 4 or more always make two groups so both kinds appear. */
export function fillerGroups(n: number, max: number): number[] {
  if (n < 2) return [];
  const k = Math.max(Math.ceil(n / max), n >= 4 ? 2 : 1);
  return Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));
}

/**
 * The plan with n loose Noticed pieces added, in groups whose pieces touch in a
 * chain. A group fits only one room of the board or only Unknown, the kinds
 * alternating from a seeded start (so with two or more groups there is one of
 * each); rooms are picked in a seeded order. Same plan, same n, same filler.
 */
export function padPlan(plan: BoardPlan, n: number, level: Difficulty): BoardPlan {
  const rng = new Rng(hashSeed(`${plan.seed}-filler-${n}`));
  const rooms = rng.shuffle(plan.rooms.filter((r) => r !== UNKNOWN));
  const sizes = fillerGroups(n, MAX_GROUP[level]);
  const start = rng.int(2);
  const pieces = plan.pieces.slice();
  const touches = plan.touches.slice();
  sizes.forEach((size, gi) => {
    const room = (gi + start) % 2 === 0 && rooms.length ? rooms[Math.floor((gi + start) / 2) % rooms.length] : null;
    const ids: string[] = [];
    for (let j = 0; j < size; j++) {
      const id = `noticed${gi + 1}-${j + 1}`;
      ids.push(id);
      pieces.push({ id, kind: 'fog', who: null, section: room ?? UNKNOWN, not: [], only: room ? [room] : null, clue: null, loose: true, group: `noticed${gi + 1}` });
      if (j) touches.push([ids[j - 1], id]);
    }
  });
  return { ...plan, pieces, touches };
}

/**
 * Build the puzzle's board for its level. The plain board (no filler) comes
 * first and is returned as is when it already has enough pieces to place, so
 * those boards never change. A thin one is padded with loose Noticed
 * pieces (from the shortfall up to MAX_FILLER; a few cuts each, the same plan with a derived build seed): the first
 * that reaches the minimum wins, else the one with most to place (ties: fewer
 * filler, then the earlier cut). Null only when the plain board can't be built.
 */
function buildPadded(plan: BoardPlan, level: Difficulty): Board | null {
  const base = buildBoard(plan);
  if (!base) return null;
  const want = MIN_TO_PLACE[level];
  let best = base;
  let bestN = piecesToPlace(base, level);
  if (bestN >= want) return base;
  // Start at what's missing (fewer would fall short); pins can still eat a piece, so keep going up.
  for (let n = Math.max(2, want - bestN); n <= MAX_FILLER; n++) {
    const padded = padPlan(plan, n, level);
    for (let cut = 0; cut < PAD_CUTS; cut++) {
      const seed = cut ? hashSeed(`${plan.seed}-pad${n}-${cut}`) : plan.seed;
      const b = buildBoard({ ...padded, seed });
      if (!b) continue;
      const got = piecesToPlace(b, level);
      if (got >= want) return b;
      if (got > bestN) { best = b; bestN = got; }
    }
  }
  return best;
}

export const boardPuzzle = (content: Content, c: BoardCase, spec: Pick<GameSpec, 'seed' | 'clues'>, level: Difficulty): Board | null =>
  cached(`puzzle-${level}-${c.seed}-${spec.seed}-${spec.clues.join(',')}`, () => buildPadded(boardPuzzlePlan(content, c, spec), level));

/**
 * The end board for the clues she has found: every room and weapon in the
 * case, a grey piece for each puzzle still to play (up to 3), and the body
 * once she knows the scene. Built again whenever she finds more clues.
 */
export function endBoardPlan(content: Content, c: Case, found: ReadonlySet<string>, sceneKnown: boolean, puzzlesLeft: number): BoardPlan {
  const shown = c.clues.filter((cl) => found.has(cl.id));
  const proven = provenSections(content, c, shown.map((cl) => cl.fact));
  const unknownGuests = c.suspects.filter((s) => proven[s] === UNKNOWN);
  const ids = shown.map((cl) => cl.id).sort().join(',');
  return plan({
    content, c, shown, hidden: [], proven, rooms: [...c.rooms], items: [...c.items],
    greys: Math.min(3, puzzlesLeft), fog: unknownGuests.length >= 3 ? 3 : unknownGuests.length ? 2 : 0,
    body: sceneKnown ? c.sceneRoom : null,
    seed: hashSeed(`${c.seed}-end-board-${sceneKnown ? 'scene' : ''}-${ids}`),
    neverPinWho: unknownGuests,
  });
}

export function endBoard(content: Content, c: Case, found: ReadonlySet<string>, sceneKnown: boolean, puzzlesLeft: number): Board | null {
  const plan = endBoardPlan(content, c, found, sceneKnown, puzzlesLeft);
  return cached(`end-${plan.seed}-${puzzlesLeft}`, () => buildBoard(plan));
}
