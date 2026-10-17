import { roomAdjacency } from './house.ts';
import { WORDLE_BLANK, cluePool, type ClueContext } from './clues.ts';
import { canLocate, plainText, wordClue } from './wording.ts';
import { Rng, hashSeed } from './rng.ts';
import { allCandidates, countSolutions, filterCandidates } from './solver.ts';
import { SCENE_GAMES, type Case, type Clue, type ClueDelivery, type ClueFact, type ClueSource, type ClueType, type Content, type Difficulty, type GameKind, type GameSpec, type Interrogation } from './types.ts';
import { buildInterrogation, type CaseFacts } from './interrogation.ts';

interface DifficultySettings {
  suspects: number;
  /** Clues she gets for free at the start. */
  freeClues: number;
  /** Most sudoku statements that unlock early from coordinate squares. */
  located: number;
  /** End with a finale interrogation using her casebook. */
  finale: boolean;
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
    finale: false,
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
    finale: false,
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
    finale: true,
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

  // 5. Pick tonight's games: a word game of her choice gives the scene; two of the
  //    cat puzzle, sudoku and interrogation share the clues. Hard cases end
  //    with a finale interrogation that uses her casebook as evidence.
  const order = rng.shuffle(minimal);
  const ROTATION: GameKind[] = ['cats', 'sudoku', 'interrogation'];
  const picked = rng.shuffle(ROTATION).slice(0, 2);
  const kinds = ROTATION.filter((k) => picked.includes(k));
  if (settings.finale) kinds.push('finale');

  // 6. Hand out the clues. A few are free testimony. The finale gets up to
  //    two; the rest are split between the two rotating games. A sudoku's
  //    "located" statements unlock early from two coordinate squares.
  const free = Math.min(settings.freeClues, order.length - 2);
  let rest = order.slice(free);
  const finaleFacts = settings.finale ? rest.slice(-Math.min(2, rest.length - 2)) : [];
  rest = rest.filter((f) => !finaleFacts.includes(f));
  const [gameA, gameB] = kinds;
  const shareA =
    gameA === 'sudoku' ? (rest.length >= 3 ? Math.max(2, Math.floor(rest.length / 2)) : 1) : Math.ceil(rest.length / 2);
  const shareOf = (k: GameKind) => (k === gameA ? rest.slice(0, shareA) : k === gameB ? rest.slice(shareA) : []);
  const sudokuFacts = shareOf('sudoku');
  // Sudoku: room clues first so they can be located, and keep one back for finishing the grid.
  const locatedFacts: ClueFact[] = sudokuFacts.filter(canLocate).slice(0, Math.min(settings.located, sudokuFacts.length - 1));
  const deliveryOf = (f: ClueFact, i: number): ClueDelivery => {
    if (i < free) return 'given';
    if (finaleFacts.includes(f)) return 'finale';
    return kinds.find((k) => shareOf(k).includes(f)) ?? 'given';
  };
  const SOURCE: Record<ClueDelivery, ClueSource> = {
    given: 'testimony',
    sudoku: 'testimony',
    interrogation: 'testimony',
    finale: 'testimony',
    cats: 'evidence',
    wordle: 'testimony',
    crossword: 'testimony',
    wordsearch: 'testimony',
  };

  const wordAs = (fact: ClueFact, i: number, speaker?: string): Clue => {
    const delivery = deliveryOf(fact, i);
    const isLocated = locatedFacts.includes(fact) && canLocate(fact);
    const w = wordClue(fact, SOURCE[delivery], content, suspects, rng, isLocated, speaker);
    const clue: Clue = { id: `c${i + 1}`, fact, delivery, source: SOURCE[delivery], speaker: w.speaker, body: w.body, text: plainText(w, content) };
    if (isLocated && w.located) {
      const room = house.rooms.find((r) => r.id === fact.room)!;
      clue.location = { ...w.located, target: rng.pick(room.cells) };
    }
    return clue;
  };
  const clues: Clue[] = order.map((fact, i) => wordAs(fact, i));

  // 7. Interrogations. Their clues are the suspect's confession, so they're
  //    reworded in that suspect's voice once we know who is in the chair.
  const cf: CaseFacts = { suspects, rooms, items, solution, ctx };
  const known = order;
  const interrogations: Partial<Record<GameKind, Interrogation>> = {};
  if (kinds.includes('interrogation')) {
    interrogations.interrogation = buildInterrogation({
      cf, content, rng: new Rng(hashSeed(`${seed}-interrogation`)), idPrefix: 'iq-', delivery: 'interrogation', hard: difficulty !== 'easy', known,
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
      const base = { kind, seed: hashSeed(`${seed}-${kind}`), clues: idsFor(kind), unlocksScene: false };
      if (kind === 'cats') return { ...base, size: settings.catSize };
      if (kind === 'sudoku')
        return {
          ...base,
          size: settings.sudoku.size,
          givens: settings.sudoku.givens,
          located: clues.filter((c) => c.location).map((c) => c.id),
        };
      return { ...base, size: 0, interrogation: interrogations[kind] };
    }),
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
