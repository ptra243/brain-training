import { caseContext, caseSpace } from './caseFacts.ts';
import { WORDLE_BLANK, cluePool, compileClue, type ClueContext } from './clues.ts';
import { canLocate, plainText, wordClue } from './wording.ts';
import { Rng, hashSeed } from './rng.ts';
import { allHoldings, allRoomings, countMatching } from './search.ts';
import { allCandidates, countSolutions, filterCandidates } from './solver.ts';
import { BOARD_SHARE, CLUE_SOURCE, ROTATION, SCENE_GAMES } from './gameKinds.ts';
import { boardPuzzle } from './caseBoard.ts';
import type { Case, Clue, ClueDelivery, ClueFact, ClueType, Content, Difficulty, GameKind, GameSpec, Interrogation, RotatingKind, Solution, CampaignRound } from './types.ts';
import { buildInterrogation, type CaseFacts } from './interrogation.ts';
import { PRESETS, caseSettings, clueShares, levelsKey, type CaseLevels, type CaseSettings, type ClueShares } from './settings.ts';

/** Difficulty curve for the campaign: a few easy cases, then mostly medium with every third hard. */
export function campaignDifficulty(caseNumber: number): Difficulty {
  if (caseNumber <= 3) return 'easy';
  return caseNumber % 3 === 0 ? 'hard' : 'medium';
}

/** A numbered case from a preset ("easy") or any levels. Same number and levels, same case. */
export function generateCase(
  content: Content,
  caseNumber: number,
  levelsOrPreset: Difficulty | CaseLevels = campaignDifficulty(caseNumber),
): Case {
  const levels = typeof levelsOrPreset === 'string' ? PRESETS[levelsOrPreset] : levelsOrPreset;
  return buildCase(content, `case-${caseNumber}-${levelsKey(levels)}`, caseNumber, String(caseNumber), levels);
}

/**
 * The case for a seed text. Each mode seeds from its own text ("case-6-easy",
 * "quick-K7QF2-medium"), so modes never share cases. `number` and `code`
 * only label it.
 */
export function buildCase(content: Content, seedText: string, caseNumber: number, code: string, levels: CaseLevels): Case {
  const seed = hashSeed(seedText);
  const rng = new Rng(seed);
  const settings = caseSettings(levels);

  // 1–4. The truth, and a minimal set of clues that pins it down.
  const truth = settings.shared ? sharedTruth(content, settings, rng, code) : classicTruth(content, settings, rng, code);
  const { minimal } = truth;

  // 5. Pick tonight's games: a word game of her choice gives the scene; one to
  //    three of the cat puzzle, sudoku and interrogation share the clues. Hard
  //    logic ends with a finale interrogation that uses her casebook as evidence.
  const order = rng.shuffle(minimal);
  const picked = rng.shuffle(ROTATION).slice(0, settings.games);
  const rotating = ROTATION.filter((k) => picked.includes(k));
  const kinds = settings.finale ? [...rotating, 'finale' as const] : rotating;

  const shares = clueShares(order.length, settings, rotating.indexOf('sudoku'));
  return assemble({ content, seed, rng, settings, levels, caseNumber, code, truth, order, rotating, kinds, shares });
}

/** Everything `assemble` needs: the truth, its clues in hand-out order, and how they're shared. */
export interface Layout {
  content: Content;
  seed: number;
  rng: Rng;
  settings: CaseSettings;
  levels: CaseLevels;
  caseNumber: number;
  code: string;
  truth: Truth;
  /** Clues in hand-out order: the free ones, each rotating game's share, then the finale's. */
  order: ClueFact[];
  rotating: RotatingKind[];
  kinds: (RotatingKind | 'finale')[];
  shares: ClueShares;
  campaign?: CampaignRound;
}

/** Words the clues, builds the interrogations, the scene and the game specs. */
export function assemble(o: Layout): Case {
  const { content, seed, rng, settings, levels, caseNumber, code, order, shares } = o;
  // The case board puzzle may stand in for one of the drawn games.
  const slot = boardSlot(o);
  const swap = <K extends string>(k: K, i: number) => (i === slot ? ('board' as const) : k);
  const rotating = o.rotating.map(swap);
  const kinds = o.kinds.map(swap);
  const { suspects, rooms, items, solution, murdererIndex, ctx } = o.truth;
  const difficulty = levels.logic;
  const { house } = content;

  // 6. Hand out the clues, in order: the free ones, each rotating game's
  //    share, then up to two for the finale. A sudoku's "located" statements
  //    unlock early from two coordinate squares.
  const free = shares.free;
  const gameFacts = new Map<GameKind, ClueFact[]>();
  let at = free;
  rotating.forEach((k, i) => {
    gameFacts.set(k, order.slice(at, at + shares.games[i]));
    at += shares.games[i];
  });
  const finaleFacts = order.slice(at, at + shares.finale);
  const shareOf = (k: GameKind) => gameFacts.get(k) ?? [];
  const sudokuFacts = shareOf('sudoku');
  // Sudoku: room clues first so they can be located, and keep one back for finishing the grid.
  const locatedFacts: ClueFact[] = sudokuFacts.filter(canLocate).slice(0, Math.min(settings.located, sudokuFacts.length - 1));
  const deliveryOf = (f: ClueFact, i: number): ClueDelivery => {
    if (i < free) return 'given';
    if (finaleFacts.includes(f)) return 'finale';
    return kinds.find((k) => shareOf(k).includes(f)) ?? 'given';
  };
  const wordAs = (fact: ClueFact, i: number, speaker?: string): Clue => {
    const delivery = deliveryOf(fact, i);
    const isLocated = locatedFacts.includes(fact) && canLocate(fact);
    const w = wordClue(fact, CLUE_SOURCE[delivery], content, suspects, rng, isLocated, speaker);
    const clue: Clue = { id: `c${i + 1}`, fact, delivery, source: CLUE_SOURCE[delivery], speaker: w.speaker, body: w.body, text: plainText(w, content) };
    if (isLocated && w.located) {
      const room = house.rooms.find((r) => r.id === fact.room)!;
      clue.location = { ...w.located, target: rng.pick(room.cells) };
    }
    return clue;
  };
  const clues: Clue[] = order.map((fact, i) => wordAs(fact, i));

  // 7. Interrogations. Their clues are the suspect's confession, so they're
  //    reworded in that suspect's voice once we know who is in the chair.
  const cf: CaseFacts = { suspects, rooms, items, solution, ctx, shared: settings.shared };
  const known = order;
  const interrogations: Partial<Record<'interrogation' | 'finale', Interrogation>> = {};
  if (kinds.includes('interrogation')) {
    interrogations.interrogation = buildInterrogation({
      cf, content, rng: new Rng(hashSeed(`${seed}-interrogation`)), idPrefix: 'iq-', delivery: 'interrogation', hard: settings.hardInterrogation, known,
    });
  }
  if (kinds.includes('finale')) {
    interrogations.finale = buildInterrogation({
      cf, content, rng: new Rng(hashSeed(`${seed}-finale`)), idPrefix: 'fq-', delivery: 'finale', hard: true, known,
      caseClues: clues.filter((c) => c.delivery !== 'finale'),
    });
  }
  order.forEach((fact, i) => {
    const kind = clues[i].delivery;
    const chair = kind === 'interrogation' || kind === 'finale' ? interrogations[kind]?.suspect : undefined;
    if (chair) clues[i] = { ...wordAs(fact, i, chair), id: clues[i].id };
  });

  // The scene is a hidden word, found by whichever word game she picks: "The body was found by the _____."
  const sceneRoom = solution.room[murdererIndex];
  const scene = house.rooms.find((r) => r.id === sceneRoom)!;
  const sceneWord = rng.pick(scene.objects);
  const sceneText = (word: string) => `The body was found by the ${word.toLowerCase()} in the ${scene.name}.`;
  const sceneClue = {
    text: sceneText(sceneWord),
    delivery: 'wordle' as const,
    wordle: { answer: sceneWord, teaser: `The body was found by the ${WORDLE_BLANK}.` },
  };

  const idsFor = (kind: GameKind) => clues.filter((c) => c.delivery === kind).map((c) => c.id);
  const games: GameSpec[] = [
    // Seeded separately so adding word games never changes the case itself.
    // The Wordle hides a 5-letter object; the others hide a room thing of any length.
    ...SCENE_GAMES.map((kind): GameSpec => {
      const answer = kind === 'wordle' ? sceneWord : new Rng(hashSeed(`${seed}-${kind}-word`)).pick(scene.things);
      return {
        kind,
        seed: hashSeed(`${seed}-${kind}`),
        clues: [],
        unlocksScene: true,
        size: kind === 'wordle' ? 5 : 7,
        scene: { answer, text: sceneText(answer) },
      };
    }),
    ...kinds.map((kind): GameSpec => {
      const base = { seed: hashSeed(`${seed}-${kind}`), clues: idsFor(kind), unlocksScene: false as const };
      if (kind === 'cats') return { kind, ...base, size: settings.catSize, ...(settings.catEasy && { easy: true }) };
      if (kind === 'board') return { kind, ...base };
      if (kind === 'sudoku')
        return {
          kind,
          ...base,
          size: settings.sudoku.size,
          givens: settings.sudoku.givens,
          located: clues.filter((c) => c.location).map((c) => c.id),
        };
      return { kind, ...base, interrogation: interrogations[kind]! };
    }),
  ];

  return {
    number: caseNumber,
    code,
    seed,
    difficulty,
    levels,
    shared: settings.shared,
    ...(o.campaign && { campaign: o.campaign }),
    houseId: house.id,
    suspects,
    rooms,
    items,
    solution,
    sceneRoom,
    murderer: suspects[murdererIndex],
    weapon: solution.item[murdererIndex]!,
    sceneClue,
    clues,
    games,
  };
}

/**
 * Which drawn game the case board puzzle stands in for, or -1. Decided on a
 * seed of its own, so a case that keeps its games is the same as before, and
 * only when a board can be built from the free clues and that game's share.
 */
function boardSlot(o: Layout): number {
  const pick = new Rng(hashSeed(`${o.seed}-board-game`));
  if (!o.rotating.length || pick.next() >= BOARD_SHARE) return -1;
  const slot = pick.int(o.rotating.length);
  const { suspects, rooms, items, solution, murdererIndex } = o.truth;
  // Clue ids as `assemble` numbers them: c1, c2, … in hand-out order.
  const clues = o.order.map((fact, i) => ({ id: `c${i + 1}`, fact, delivery: (i < o.shares.free ? 'given' : 'board') as ClueDelivery }));
  const start = o.shares.free + o.shares.games.slice(0, slot).reduce((a, b) => a + b, 0);
  const share = clues.slice(start, start + o.shares.games[slot]).map((cl) => cl.id);
  const c = { suspects, rooms, items, shared: o.settings.shared, seed: o.seed, sceneRoom: solution.room[murdererIndex], clues };
  return boardPuzzle(o.content, c, { seed: hashSeed(`${o.seed}-board`), clues: share }) ? slot : -1;
}

export interface Truth {
  suspects: string[];
  rooms: string[];
  items: string[];
  solution: Solution;
  murdererIndex: number;
  /** A minimal set of true clues with exactly one answer. */
  minimal: ClueFact[];
  ctx: ClueContext;
}

/** Clues in a weighted-random order: more likely types tend to come first. */
export function weightedOrder(pool: readonly ClueFact[], settings: CaseSettings, rng: Rng): ClueFact[] {
  return pool
    .map((fact) => ({ fact, w: settings.weights[fact.type] ?? 0 }))
    .filter((x) => x.w > 0)
    .map((x) => ({ fact: x.fact, key: -Math.log(1 - rng.next()) / x.w }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.fact);
}

/** Everyone in their own room with their own weapon. */
function classicTruth(content: Content, settings: CaseSettings, rng: Rng, code: string): Truth {
  const n = settings.suspects;
  const { house } = content;

  // 1. Roll the truth.
  const suspects = rng.shuffle(content.suspects.map((s) => s.id)).slice(0, n);
  const rooms = rng.shuffle(house.rooms.map((r) => r.id)).slice(0, n);
  const items = rng.shuffle(content.items.map((i) => i.id)).slice(0, n);
  const solution = { room: rng.shuffle(rooms), item: rng.shuffle(items) };
  const murdererIndex = rng.int(n);

  // 2. Every true clue.
  const ctx = caseContext(house, { suspects });
  const allRooms = house.rooms.map((r) => r.id);
  const pool = cluePool(solution, ctx, rooms, items, allRooms, rng);

  // 3. Add clues in a weighted-random order until only one solution is left.
  //    A clue is kept only if it rules something out.
  const ordered = weightedOrder(pool, settings, rng);
  const candidates = allCandidates(rooms, items);
  let remaining = candidates;
  const chosen: ClueFact[] = [];
  const used: Partial<Record<ClueType, number>> = {};
  for (const fact of ordered) {
    if (remaining.length === 1) break;
    const cap = settings.caps[fact.type];
    if (cap !== undefined && (used[fact.type] ?? 0) >= cap) continue;
    const next = filterCandidates(remaining, [fact], ctx);
    if (next.length < remaining.length) {
      remaining = next;
      chosen.push(fact);
      used[fact.type] = (used[fact.type] ?? 0) + 1;
    }
  }
  if (remaining.length !== 1) {
    throw new Error(`Case ${code}: clue pool could not pin down a single solution`);
  }

  // 4. Trim: drop any clue the others make redundant.
  let minimal = chosen.slice();
  for (const fact of rng.shuffle(chosen)) {
    const without = minimal.filter((f) => f !== fact);
    if (countSolutions(candidates, without, ctx, 1) === 1) minimal = without;
  }
  return { suspects, rooms, items, solution, murdererIndex, minimal, ctx };
}

/**
 * Where everyone was and who held what in a 7-guest case: the killer alone at
 * a scene room with a weapon, everyone else spread over the other rooms, and
 * all but `items.length` guests empty-handed.
 */
export function rollShared(rng: Rng, suspects: readonly string[], rooms: readonly string[], items: readonly string[], killer: number): { scene: string; solution: Solution } {
  const scene = rng.pick(rooms);
  const elsewhere = rooms.filter((r) => r !== scene);
  const room = suspects.map((_, i) => (i === killer ? scene : rng.pick(elsewhere)));
  const others = rng.shuffle(suspects.map((_, i) => i).filter((i) => i !== killer));
  const holders = [killer, ...others.slice(0, items.length - 1)];
  const dealt = rng.shuffle(items);
  const item = new Array<string | null>(suspects.length).fill(null);
  holders.forEach((s, j) => (item[s] = dealt[j]));
  return { scene, solution: { room, item } };
}

/** Clue types that say only where people were (the rest need who held what). */
const ITEM_TYPES: ReadonlySet<ClueType> = new Set(['suspect-item', 'suspect-not-item', 'suspect-empty-handed', 'item-room', 'item-not-room']);

/**
 * 7 guests, 5 rooms, 5 weapons. The killer was alone in the scene room with
 * a weapon; everyone else is spread over the other rooms, and two guests hold
 * nothing. There are too many possible answers to list, so clues are chosen
 * in two passes: room clues until everyone's room is certain (78,125
 * roomings to start), then weapon clues until every holder is (2,520).
 * Together they leave one answer, and trimming checks that with the search.
 */
function sharedTruth(content: Content, settings: CaseSettings, rng: Rng, code: string): Truth {
  const n = settings.suspects;
  const { house } = content;

  // 1. Roll the truth.
  const suspects = rng.shuffle(content.suspects.map((s) => s.id)).slice(0, n);
  const rooms = rng.shuffle(house.rooms.map((r) => r.id)).slice(0, settings.rooms);
  const items = rng.shuffle(content.items.map((i) => i.id)).slice(0, settings.rooms);
  const murdererIndex = rng.int(n);
  const { solution } = rollShared(rng, suspects, rooms, items, murdererIndex);
  const { room, item } = solution;

  // 2. Every true clue.
  const ctx = caseContext(house, { suspects });
  const pool = cluePool(solution, ctx, rooms, items, house.rooms.map((r) => r.id), rng, true);

  // 3. Two passes over one weighted order: rooms, then weapon holders.
  const ordered = weightedOrder(pool, settings, rng);
  let roomings: Solution[] = allRoomings(rooms, n).map((r) => ({ room: r, item }));
  let holdings: Solution[] = allHoldings(items, n).map((i) => ({ room, item: i }));
  const chosen: ClueFact[] = [];
  const used: Partial<Record<ClueType, number>> = {};
  for (const fact of ordered) {
    if (roomings.length === 1 && holdings.length === 1) break;
    const cap = settings.caps[fact.type];
    if (cap !== undefined && (used[fact.type] ?? 0) >= cap) continue;
    const test = compileClue(fact, ctx);
    const forItems = ITEM_TYPES.has(fact.type);
    const before = forItems ? holdings : roomings;
    const after = before.filter(test);
    if (after.length < before.length) {
      if (forItems) holdings = after;
      else roomings = after;
      chosen.push(fact);
      used[fact.type] = (used[fact.type] ?? 0) + 1;
    }
  }
  if (roomings.length !== 1 || holdings.length !== 1) {
    throw new Error(`Case ${code}: clue pool could not pin down a single solution`);
  }

  // 4. Trim: drop any clue the others make redundant.
  const space = caseSpace({ suspects, rooms, items, shared: true });
  let minimal = chosen.slice();
  for (const fact of rng.shuffle(chosen)) {
    const without = minimal.filter((f) => f !== fact);
    if (countMatching(space, without, ctx, 1) === 1) minimal = without;
  }
  return { suspects, rooms, items, solution, murdererIndex, minimal, ctx };
}
