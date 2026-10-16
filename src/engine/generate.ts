import { roomAdjacency } from './house.ts';
import { WORDLE_BLANK, cluePool, type ClueContext } from './clues.ts';
import { canLocate, plainText, wordClue } from './wording.ts';
import { Rng, hashSeed } from './rng.ts';
import { allCandidates, countSolutions, filterCandidates } from './solver.ts';
import type { Case, Clue, ClueDelivery, ClueFact, ClueType, Content, Difficulty, GameKind, GameSpec } from './types.ts';

interface DifficultySettings {
  suspects: number;
  /** Clues she gets for free at the start. */
  freeClues: number;
  /** Most sudoku statements that unlock early from coordinate squares. */
  located: number;
  catSize: number;
  sudoku: { size: 6 | 9; givens: number };
  /** Relative chance of each clue type being tried. 0 = never used. */
  weights: Partial<Record<ClueType, number>>;
  /** Most clues of a type allowed in one case. */
  caps: Partial<Record<ClueType, number>>;
}

export const DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: {
    suspects: 4,
    freeClues: 2,
    located: 2,
    catSize: 6,
    sudoku: { size: 6, givens: 16 },
    weights: {
      'suspect-room': 1,
      'suspect-item': 1,
      'suspect-not-room': 3,
      'suspect-not-item': 3,
      'item-room': 2,
      'suspect-either-room': 2,
      'suspect-next-to-room': 1,
    },
    caps: { 'suspect-room': 1, 'suspect-item': 1 },
  },
  medium: {
    suspects: 4,
    freeClues: 2,
    located: 2,
    catSize: 7,
    sudoku: { size: 6, givens: 13 },
    weights: {
      'suspect-not-room': 2,
      'suspect-not-item': 2,
      'item-room': 1,
      'item-not-room': 2,
      'suspect-either-room': 2,
      'suspect-next-to-room': 2,
      'suspects-adjacent': 1,
      'suspects-not-adjacent': 1,
    },
    caps: { 'item-room': 1 },
  },
  hard: {
    suspects: 5,
    freeClues: 3,
    located: 3,
    catSize: 8,
    sudoku: { size: 9, givens: 32 },
    weights: {
      'suspect-not-room': 2,
      'suspect-not-item': 2,
      'item-not-room': 2,
      'suspect-either-room': 2,
      'suspect-next-to-room': 3,
      'suspects-adjacent': 2,
      'suspects-not-adjacent': 2,
    },
    caps: {},
  },
};

/** Difficulty curve for the campaign: a few easy cases, then mostly medium with every third hard. */
export function campaignDifficulty(caseNumber: number): Difficulty {
  if (caseNumber <= 3) return 'easy';
  return caseNumber % 3 === 0 ? 'hard' : 'medium';
}


export function generateCase(
  content: Content,
  caseNumber: number,
  difficulty: Difficulty = campaignDifficulty(caseNumber),
): Case {
  const seed = hashSeed(`case-${caseNumber}-${difficulty}`);
  const rng = new Rng(seed);
  const settings = DIFFICULTY[difficulty];
  const n = settings.suspects;
  const { house } = content;

  // 1. Roll the truth.
  const suspects = rng.shuffle(content.suspects.map((s) => s.id)).slice(0, n);
  const rooms = rng.shuffle(house.rooms.map((r) => r.id)).slice(0, n);
  const items = rng.shuffle(content.items.map((i) => i.id)).slice(0, n);
  const solution = { room: rng.shuffle(rooms), item: rng.shuffle(items) };
  const murdererIndex = rng.int(n);

  // 2. Every true clue.
  const ctx: ClueContext = { suspects, adjacency: roomAdjacency(house) };
  const allRooms = house.rooms.map((r) => r.id);
  const pool = cluePool(solution, ctx, rooms, items, allRooms, rng);

  // 3. Add clues in a weighted-random order until only one solution is left.
  //    A clue is kept only if it rules something out.
  const ordered = pool
    .map((fact) => ({ fact, w: settings.weights[fact.type] ?? 0 }))
    .filter((x) => x.w > 0)
    .map((x) => ({ fact: x.fact, key: -Math.log(1 - rng.next()) / x.w }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.fact);

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
    throw new Error(`Case ${caseNumber}: clue pool could not pin down a single solution`);
  }

  // 4. Trim: drop any clue the others make redundant.
  let minimal = chosen.slice();
  for (const fact of rng.shuffle(chosen)) {
    const without = minimal.filter((f) => f !== fact);
    if (countSolutions(candidates, without, ctx, 1) === 1) minimal = without;
  }

  // 5. Hand out the clues. A few are free (witness testimony). The sudoku
  //    delivers more testimony: each "located" statement unlocks early when
  //    her digits in two marked squares point to its room on the map, and
  //    finishing the grid gives the rest. The cats find the remainder as
  //    physical evidence. Wordle unlocks the scene.
  const order = rng.shuffle(minimal);
  const free = Math.min(settings.freeClues, order.length - 2);
  const rest = order.slice(free);
  const sudokuShare = rest.length >= 3 ? Math.max(2, Math.floor(rest.length / 2)) : 1;
  const locatedFacts: ClueFact[] = rest.filter(canLocate).slice(0, Math.min(settings.located, sudokuShare - 1));
  const completionFacts = rest.filter((f) => !locatedFacts.includes(f)).slice(0, sudokuShare - locatedFacts.length);
  const deliveryOf = (f: ClueFact, i: number): ClueDelivery =>
    i < free ? 'given' : locatedFacts.includes(f) || completionFacts.includes(f) ? 'sudoku' : 'cats';

  const clues: Clue[] = order.map((fact, i) => {
    const delivery = deliveryOf(fact, i);
    const source = delivery === 'cats' ? 'evidence' : 'testimony';
    const isLocated = locatedFacts.includes(fact) && canLocate(fact);
    const w = wordClue(fact, source, content, suspects, rng, isLocated);
    const clue: Clue = { id: `c${i + 1}`, fact, delivery, source, speaker: w.speaker, body: w.body, text: plainText(w, content) };
    if (isLocated && w.located) {
      const room = house.rooms.find((r) => r.id === fact.room)!;
      clue.location = { ...w.located, target: rng.pick(room.cells) };
    }
    return clue;
  });

  // The scene is always a Wordle: "The body was found by the _____."
  const sceneRoom = solution.room[murdererIndex];
  const scene = house.rooms.find((r) => r.id === sceneRoom)!;
  const sceneWord = rng.pick(scene.objects);
  const sceneClue = {
    text: `The body was found by the ${sceneWord.toLowerCase()} in the ${scene.name}.`,
    delivery: 'wordle' as const,
    wordle: { answer: sceneWord, teaser: `The body was found by the ${WORDLE_BLANK}.` },
  };

  const idsFor = (kind: GameKind) => clues.filter((c) => c.delivery === kind).map((c) => c.id);
  const games: GameSpec[] = [
    { kind: 'wordle', seed: hashSeed(`${seed}-wordle`), clues: [], unlocksScene: true, size: 5 },
    { kind: 'cats', seed: hashSeed(`${seed}-cats`), clues: idsFor('cats'), unlocksScene: false, size: settings.catSize },
    {
      kind: 'sudoku',
      seed: hashSeed(`${seed}-sudoku`),
      clues: idsFor('sudoku'),
      unlocksScene: false,
      size: settings.sudoku.size,
      givens: settings.sudoku.givens,
      located: clues.filter((c) => c.location).map((c) => c.id),
    },
  ];

  return {
    number: caseNumber,
    seed,
    difficulty,
    houseId: house.id,
    suspects,
    rooms,
    items,
    solution,
    sceneRoom,
    murderer: suspects[murdererIndex],
    weapon: solution.item[murdererIndex],
    sceneClue,
    clues,
    games,
  };
}
