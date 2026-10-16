import { roomAdjacency } from './house.ts';
import { WORDLE_BLANK, canDeliverByWordle, cluePool, clueText, wordleClue, type ClueContext } from './clues.ts';
import { Rng, hashSeed } from './rng.ts';
import { allCandidates, countSolutions, filterCandidates } from './solver.ts';
import type { Case, Clue, ClueDelivery, ClueFact, ClueType, Content, Difficulty } from './types.ts';

interface DifficultySettings {
  suspects: number;
  /** Relative chance of each clue type being tried. 0 = never used. */
  weights: Partial<Record<ClueType, number>>;
  /** Most clues of a type allowed in one case. */
  caps: Partial<Record<ClueType, number>>;
}

export const DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: {
    suspects: 4,
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

const GAMES: readonly ClueDelivery[] = ['cat-zones', 'sudoku', 'number'];
const CLUES_PER_GAME = 3;

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

  // 5. Hand each clue to a minigame. One room clue goes to Wordle (the answer
  //    is an object in that room); the rest are split across the other games
  //    until phase 4 decides which game suits which clue type.
  const order = rng.shuffle(minimal);
  const wordleIndex = order.findIndex(canDeliverByWordle);
  let slot = 0;
  const clues: Clue[] = order.map((fact, i) => {
    const id = `c${i + 1}`;
    if (i === wordleIndex && canDeliverByWordle(fact)) {
      const w = wordleClue(fact, content, rng);
      return { id, fact, text: w.text, delivery: 'wordle', wordle: { answer: w.answer, teaser: w.teaser } };
    }
    const delivery = slot < GAMES.length * CLUES_PER_GAME ? GAMES[slot % GAMES.length] : 'given';
    slot++;
    return { id, fact, text: clueText(fact, content, rng), delivery };
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
  };
}
