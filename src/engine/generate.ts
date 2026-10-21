import { caseContext, caseSpace } from './caseFacts.ts';
import { WORDLE_BLANK, cluePool, compileClue, type ClueContext } from './clues.ts';
import { canLocate, plainText, wordClue } from './wording.ts';
import { Rng, hashSeed } from './rng.ts';
import { allHoldings, allRoomings, countMatching } from './search.ts';
import { allCandidates, countSolutions, filterCandidates } from './solver.ts';
import { BOARD_SHARE, CLUE_SOURCE, PLAY_GAMES_MAX, PLAY_GAMES_MIN, NOSING_SHARE, ROTATION, SCENE_GAMES, TAROT_SHARE } from './gameKinds.ts';
import { tarotClueCards, tarotPairsFor } from './tarotCards.ts';
import { boardPuzzle } from './caseBoard.ts';
import { nosingLadders, nosingSnakes } from '../content/nosing.ts';
import { buildNosing, nosingSeed } from '../games/nosing.ts';
import type { Case, Clue, ClueDelivery, ClueFact, ClueType, Content, Difficulty, GameKind, GameSpec, Interrogation, RotatingKind, SceneKind, Solution, CampaignRound } from './types.ts';
import { buildInterrogation, type CaseFacts } from './interrogation.ts';
import { PRESETS, caseSettings, clueShares, gameLevel, levelsKey, playShares, type CaseLevels, type CaseSettings, type ClueShares } from './settings.ts';

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

/**
 * A Play case: one code rolls the levels, every game is in the case (unless
 * dropped to leave each one a clue), the scene is given from the start with
 * no free clues, and the three word games are clue games. Each hides an
 * object word that fills the blank in one of its clues.
 */
export function buildPlayCase(
  content: Content,
  seedText: string,
  caseNumber: number,
  code: string,
  levels: CaseLevels,
  /** Picked cases: the games she chose. Any failure of one of them throws; extras (to leave each game a clue room) may be swapped or dropped. */
  picks?: readonly GameKind[],
): Case {
  const seed = hashSeed(seedText);
  const rng = new Rng(seed);
  const settings = caseSettings(levels);
  const truth = settings.shared ? sharedTruth(content, settings, rng, code) : classicTruth(content, settings, rng, code);
  const { suspects, rooms, items, solution, murdererIndex } = truth;
  const sceneRoom = solution.room[murdererIndex];
  const shuffled = rng.shuffle(truth.minimal);
  // Separate seeded streams so the wording above never moves the choices below.
  const dropRng = new Rng(hashSeed(`${seed}-play-drop`));
  const blankRng = new Rng(hashSeed(`${seed}-play-blank`));
  const atScene = (f: ClueFact) => canLocate(f) && f.room === sceneRoom;

  // 3 to 5 games (more if the clues need them), drawn on a seed of their own;
  // a game that can't take its share is swapped for the next one drawn.
  type Name = SceneKind | RotatingKind;
  const drawable: Name[] = picks ? [...SCENE_GAMES, ...ROTATION, 'board', 'tarot'] : [...SCENE_GAMES, ...ROTATION, 'board'];
  // Nosing around is only ever a chosen game here (never drawn), so it joins `all` after the shuffle's list.
  const all: Name[] = picks ? [...drawable, 'nosing'] : drawable;
  const mine = new Set<Name>(picks as Name[] | undefined);
  const fail = (what: string): never => {
    throw new Error(`Case ${code}: ${what}`);
  };
  const pickRng = new Rng(hashSeed(`${seed}-play-games`));
  const drawn = pickRng.shuffle(drawable);
  const atLeast = Math.ceil((shuffled.length - (settings.finale ? 2 : 0)) / settings.maxPerGame);
  const count = Math.min(all.length, Math.max(atLeast, PLAY_GAMES_MIN + pickRng.int(PLAY_GAMES_MAX - PLAY_GAMES_MIN + 1)));
  let chosen = new Set(drawn.slice(0, count));
  let spare = drawn.slice(count);
  if (picks) {
    // Her games, topped up from the draw when the clues need more games.
    chosen = new Set(mine);
    for (const d of drawn) if (chosen.size < atLeast && !chosen.has(d)) chosen.add(d);
    spare = drawn.filter((d) => !chosen.has(d));
  }
  const without = (n: Name) => {
    chosen.delete(n);
    if (spare.length) chosen.add(spare.shift()!);
  };
  for (;;) {
    const names = all.filter((n) => chosen.has(n));
    if (!names.length) throw new Error(`Case ${code}: no game could be given a clue`);
    const shares = playShares(shuffled.length, settings, names, levels, new Rng(hashSeed(`${seed}-play-shares`)));
    // Every game left must get a clue: otherwise drop one, seeded.
    if (shares.games.some((g) => g < 1)) {
      if (picks) {
        const extras = names.filter((n) => !mine.has(n));
        if (!extras.length) fail('her games cannot all get a clue');
        const gone = extras[dropRng.int(extras.length)];
        chosen = new Set(names.filter((n) => n !== gone));
        continue;
      }
      chosen = new Set(names.filter((_, i) => i !== dropRng.int(names.length)));
      continue;
    }
    // Word games: each blanks a clue that names one room, the scene room's first.
    const words = names.filter((n): n is SceneKind => SCENE_GAMES.includes(n as SceneKind));
    const taken = new Set<ClueFact>();
    const blanks = new Map<SceneKind, Extract<ClueFact, { room: string }>>();
    let failed: SceneKind | undefined;
    for (const w of words) {
      const free = shuffled.filter((f) => canLocate(f) && !taken.has(f));
      const pool = free.filter(atScene).length ? free.filter(atScene) : free;
      if (!pool.length) {
        failed = w;
        break;
      }
      const fact = blankRng.pick(pool);
      taken.add(fact);
      blanks.set(w, fact as Extract<ClueFact, { room: string }>);
    }
    if (failed) {
      if (mine.has(failed)) fail(`${failed} has no clue to blank`);
      without(failed);
      continue;
    }
    // Their other clues come from the scene room's first.
    const fillers = [...shuffled.filter((f) => !taken.has(f) && atScene(f)), ...shuffled.filter((f) => !taken.has(f) && !atScene(f))];
    const wordFacts: ClueFact[] = [];
    words.forEach((w, i) => wordFacts.push(blanks.get(w)!, ...fillers.splice(0, shares.games[i] - 1)));
    const placed = new Set(wordFacts);
    const order = [...wordFacts, ...shuffled.filter((f) => !placed.has(f))];
    // The case board puzzle must build from its share.
    const at = names.indexOf('board');
    if (at >= 0) {
      const start = shares.games.slice(0, at).reduce((a, b) => a + b, 0);
      const clues = order.map((fact, i) => ({ id: `c${i + 1}`, fact, delivery: 'board' as ClueDelivery }));
      const share = clues.slice(start, start + shares.games[at]).map((cl) => cl.id);
      const c = { suspects, rooms, items, shared: settings.shared, seed, sceneRoom, clues };
      if (!boardPuzzle(content, c, { seed: hashSeed(`${seed}-board`), clues: share })) {
        if (mine.has('board')) fail('the board puzzle will not build');
        without('board');
        continue;
      }
    }

    // Each word game hides an object of the room its blank names; no two hide the same word when the lists allow.
    const hidden = new Set<string>();
    const wordList = words.map((kind) => {
      const blank = blanks.get(kind)!;
      const room = content.house.rooms.find((r) => r.id === blank.room)!;
      const all = kind === 'wordle' ? room.objects : room.things;
      const fresh = all.filter((w) => !hidden.has(w.toUpperCase()));
      const answer = new Rng(hashSeed(`${seed}-play-${kind}-word`)).pick(fresh.length ? fresh : all);
      hidden.add(answer.toUpperCase());
      return { kind, blank, answer };
    });
    const rotating = names.filter((n): n is RotatingKind => !SCENE_GAMES.includes(n as SceneKind));
    const kinds = settings.finale ? [...rotating, 'finale' as const] : rotating;
    const layout: Layout = { content, seed, rng, settings, levels, caseNumber, code, truth, order, rotating, kinds, shares, words: wordList };
    if (picks) {
      // Tarot is a real chosen game here: its pairs are for its own slot, and no random stand-in happens.
      const slot = rotating.indexOf('tarot');
      const pairs = slot >= 0 ? tarotPairsAt(layout, slot) : 0;
      if (pairs === null) {
        if (mine.has('tarot')) fail('the tarot pairs do not fit');
        without('tarot');
        continue;
      }
      const nosingAt = rotating.indexOf('nosing');
      if (nosingAt >= 0 && !nosingFits(layout, nosingAt, 1)) fail('the nosing game cannot take its clues');
      layout.picked = { tarotPairs: pairs };
    }
    return assemble(layout);
  }
}

/** A Play word game: the clue it blanks and the object word that fills the blank. */
export interface PlayWord {
  kind: SceneKind;
  blank: Extract<ClueFact, { room: string }>;
  answer: string;
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
  /**
   * Play cases: the word games that share clues, taken before the rotating
   * games in hand-out order (`shares.games` lists them first). Each blanks
   * one clue. Absent for every other mode, which `assemble` handles as before.
   */
  words?: PlayWord[];
  /**
   * The games are chosen (Picked Play cases, campaign rounds with fewer clues
   * per puzzle): no stand-ins, and tarot, if there, has this many pairs (0 if absent).
   */
  picked?: { tarotPairs: number };
}

/** Words the clues, builds the interrogations, the scene and the game specs. */
export function assemble(o: Layout): Case {
  const { content, seed, rng, settings, levels, caseNumber, code, order, shares } = o;
  // The case board puzzle may stand in for one of the drawn games (not when the games are chosen).
  const slot = o.words || o.picked ? -1 : boardSlot(o);
  // Play only: tarot match may stand in for one of the drawn games, on its own seed, after the board.
  const tarot = o.picked ? { slot: -1, pairs: o.picked.tarotPairs } : o.words ? tarotSlot(o) : null;
  // Then Nosing around, on its own seed, never on the board's or tarot's slot.
  const nosing = o.words && !o.picked ? nosingSlot(o, [slot, tarot?.slot ?? -1]) : -1;
  const wordKinds: SceneKind[] = o.words?.map((w) => w.kind) ?? [];
  const swap = <K extends string>(k: K, i: number) => (i === slot ? ('board' as const) : tarot && i === tarot.slot ? ('tarot' as const) : i === nosing ? ('nosing' as const) : k);
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
  [...wordKinds, ...rotating].forEach((k, i) => {
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
    return [...wordKinds, ...kinds].find((k) => shareOf(k).includes(f)) ?? 'given';
  };
  const wordAs = (fact: ClueFact, i: number, speaker?: string): Clue => {
    const delivery = deliveryOf(fact, i);
    const blankOf = o.words?.find((pw) => pw.blank === fact);
    const isLocated = (locatedFacts.includes(fact) && canLocate(fact)) || blankOf !== undefined;
    const w = wordClue(fact, CLUE_SOURCE[delivery], content, suspects, rng, isLocated, speaker);
    const clue: Clue = { id: `c${i + 1}`, fact, delivery, source: CLUE_SOURCE[delivery], speaker: w.speaker, body: w.body, text: plainText(w, content) };
    if (blankOf && w.located) {
      // A Play word game's clue, with its room hidden behind the word.
      clue.blank = { game: blankOf.kind, answer: blankOf.answer, teaser: `${w.located.before}the room with the ${WORDLE_BLANK}${w.located.after}` };
    } else if (isLocated && w.located && canLocate(fact)) {
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
  // Play shows the scene sentence from the start, so it never names a word a word game hides.
  const sceneWord = rng.pick(o.words ? scene.objects.filter((w) => !o.words!.some((pw) => pw.answer === w)) : scene.objects);
  const sceneText = (word: string) => `The body was found by the ${word.toLowerCase()} in the ${scene.name}.`;
  const sceneClue = {
    text: sceneText(sceneWord),
    delivery: 'wordle' as const,
    wordle: { answer: sceneWord, teaser: `The body was found by the ${WORDLE_BLANK}.` },
  };

  const idsFor = (kind: GameKind) => clues.filter((c) => c.delivery === kind).map((c) => c.id);
  const levelOf = (kind: GameKind) => {
    const level = gameLevel(levels, kind);
    return level && { level };
  };
  const games: GameSpec[] = [
    // Play: clue games, each hiding the word that fills its blanked clue.
    ...(o.words ?? []).map((w): GameSpec => ({
      kind: w.kind,
      seed: hashSeed(`${seed}-${w.kind}`),
      clues: idsFor(w.kind),
      unlocksScene: true,
      size: w.kind === 'wordle' ? 5 : w.kind === 'crossword' ? settings.crosswordSize : 7,
      scene: { answer: w.answer, text: clues.find((c) => c.blank?.game === w.kind)!.text },
      ...(w.kind === 'wordsearch' && levelOf(w.kind)),
    })),
    // Seeded separately so adding word games never changes the case itself.
    // The Wordle hides a 5-letter object; the others hide a room thing of any length.
    ...(o.words ? [] : SCENE_GAMES).map((kind): GameSpec => {
      const answer = kind === 'wordle' ? sceneWord : new Rng(hashSeed(`${seed}-${kind}-word`)).pick(scene.things);
      return {
        kind,
        seed: hashSeed(`${seed}-${kind}`),
        clues: [],
        unlocksScene: true,
        size: kind === 'wordle' ? 5 : kind === 'crossword' ? settings.crosswordSize : 7,
        scene: { answer, text: sceneText(answer) },
      };
    }),
    ...kinds.map((kind): GameSpec => {
      const base = { seed: hashSeed(`${seed}-${kind}`), clues: idsFor(kind), unlocksScene: false as const, ...(kind !== 'finale' && levelOf(kind)) };
      if (kind === 'cats') return { kind, ...base, size: settings.catSize, ...(settings.catEasy && { easy: true }) };
      if (kind === 'board') return { kind, ...base };
      if (kind === 'tarot') return { kind, ...base, pairs: tarot!.pairs };
      if (kind === 'nosing') return { kind, ...base };
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
    ...(o.words && { sceneGiven: true as const }),
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

/**
 * Which drawn Play game tarot match stands in for (and its pairs), or slot -1.
 * Decided on a seed of its own, after the board stand-in and the draw, so a
 * case that keeps its games is the same as before; only when that game's
 * clues name no more cards than a board of 12 pairs holds.
 */
function tarotSlot(o: Layout): { slot: number; pairs: number } {
  const none = { slot: -1, pairs: 0 };
  const pick = new Rng(hashSeed(`${o.seed}-tarot-game`));
  if (!o.rotating.length || pick.next() >= TAROT_SHARE) return none;
  const slot = pick.int(o.rotating.length);
  const pairs = tarotPairsAt(o, slot);
  return pairs === null ? none : { slot, pairs };
}

/**
 * Which drawn Play game Nosing around stands in for, or -1. Decided on a seed
 * of its own, after tarot's, so a case that keeps its games is the same as
 * before; never on a slot in `taken` (the board's and tarot's) or a drawn
 * board game, and only when that game holds 3 or more clues and the board builds.
 */
function nosingSlot(o: Layout, taken: number[]): number {
  const pick = new Rng(hashSeed(`${o.seed}-nosing-game`));
  if (!o.rotating.length || pick.next() >= NOSING_SHARE) return -1;
  const slot = pick.int(o.rotating.length);
  if (taken.includes(slot) || o.rotating[slot] === 'board') return -1;
  return nosingFits(o, slot, 3) ? slot : -1;
}

/** Whether the rotating game at `slot` can be Nosing around: `minShare` or more clues (3 for the Quick play stand-in, 1 for a picked game) and a board that builds. */
function nosingFits(o: Layout, slot: number, minShare: number): boolean {
  const level = gameLevel(o.levels, 'nosing');
  const words = o.words?.length ?? 0;
  const share = o.shares.games[words + slot];
  if (!level || share < minShare) return false;
  const at = o.shares.games.slice(0, words + slot).reduce((a, b) => a + b, o.shares.free);
  const { solution, murdererIndex } = o.truth;
  try {
    buildNosing({
      house: o.content.house,
      seed: nosingSeed(hashSeed(`${o.seed}-nosing`)),
      level,
      sceneRoom: solution.room[murdererIndex],
      clues: Array.from({ length: share }, (_, i) => `c${at + i + 1}`),
      ladders: nosingLadders,
      snakes: nosingSnakes,
    });
    return true;
  } catch {
    return false;
  }
}

/** How many pairs tarot match gets for the rotating game at `slot`, or null when its clues name too many cards. */
function tarotPairsAt(o: Layout, slot: number): number | null {
  // Play's shares list the word games first, then the rotating ones.
  const at = o.shares.games.slice(0, (o.words?.length ?? 0) + slot).reduce((a, b) => a + b, o.shares.free);
  const mine = o.order.slice(at, at + o.shares.games[(o.words?.length ?? 0) + slot]);
  const others = o.order.filter((f) => !mine.includes(f));
  const { suspects, items, rooms } = o.truth;
  const cards = tarotClueCards({ suspects, items, rooms }, mine, others);
  return tarotPairsFor(o.settings.tarotPairs, cards.reward.length);
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
