// What a case is made of, as a few fixed levels she (or a preset) picks, and
// the generator settings each combination turns into. Every combination is
// checked by `npm run check-cases`, so only levels listed here can ship.

import type { Rng } from './rng.ts';
import type { ClueType, Difficulty, GameKind } from './types.ts';

export type Length = 'short' | 'normal' | 'long';

export interface CaseLevels {
  /**
   * Suspects. With 4 or 5, each has their own room and weapon (5 is the most
   * that fits one to one at 360px). With 7, there are 5 rooms and 5 weapons:
   * rooms are shared and two guests hold nothing. The grid stays as wide.
   */
  suspects: 4 | 5 | 7;
  /** How hard the deduction is: which clue types are used, free clues, a finale. */
  logic: Difficulty;
  /** How hard each minigame is: cat and sudoku size, interrogation, word search. */
  minigames: Difficulty;
  /** How many rotating games share the clues: 1, 2 or 3. */
  length: Length;
  /**
   * Play mode only: a difficulty per game, falling back to `minigames` for any
   * game without one (the wordle has no roll).
   */
  perGame?: Partial<Record<GameKind, Difficulty>>;
}

/** The difficulty rolled for one game in a Play case, if any. */
export const gameLevel = (levels: CaseLevels, kind: GameKind): Difficulty | undefined => levels.perGame?.[kind];

export const SUSPECT_COUNTS: readonly CaseLevels['suspects'][] = [4, 5, 7];
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
export const LENGTHS: readonly Length[] = ['short', 'normal', 'long'];

/** The three presets cases have always used. Their cases must never change. */
export const PRESETS: Record<Difficulty, CaseLevels> = {
  easy: { suspects: 4, logic: 'easy', minigames: 'easy', length: 'normal' },
  medium: { suspects: 4, logic: 'medium', minigames: 'medium', length: 'normal' },
  hard: { suspects: 5, logic: 'hard', minigames: 'hard', length: 'normal' },
};

/** Every combination of levels, for the case check. */
export function allLevels(): CaseLevels[] {
  return SUSPECT_COUNTS.flatMap((suspects) =>
    DIFFICULTIES.flatMap((logic) =>
      DIFFICULTIES.flatMap((minigames) => LENGTHS.map((length) => ({ suspects, logic, minigames, length }))),
    ),
  );
}

/** The preset these levels match, if any. */
export function presetOf(levels: CaseLevels): Difficulty | undefined {
  return DIFFICULTIES.find((d) => {
    const p = PRESETS[d];
    return p.suspects === levels.suspects && p.logic === levels.logic && p.minigames === levels.minigames && p.length === levels.length;
  });
}

/** A short stable name for the levels, used in seeds: a preset keeps its old name so its cases don't change. */
export function levelsKey(levels: CaseLevels): string {
  return presetOf(levels) ?? `${levels.suspects}-${levels.logic}-${levels.minigames}-${levels.length}`;
}

export interface CaseSettings {
  suspects: number;
  /** Rooms and weapons in play: one each per suspect, or 5 with 7 guests. */
  rooms: number;
  /** Several suspects can share a room (7 guests). */
  shared: boolean;
  /** Clues she gets for free at the start, at least. More are given when the games can't hold them all. */
  freeClues: number;
  /** Most sudoku statements that unlock early from coordinate squares. */
  located: number;
  /** End with a finale interrogation using her casebook. */
  finale: boolean;
  /** How many of the cat puzzle, sudoku and interrogation are played. */
  games: number;
  /** Most clues one rotating game may unlock; the rest are given free. */
  maxPerGame: number;
  catSize: number;
  /** Cat puzzle starts from a one-square zone and needs no looking ahead. */
  catEasy: boolean;
  sudoku: { size: 6 | 9; givens: number };
  /** Interrogations need two pieces of evidence, not one. */
  hardInterrogation: boolean;
  /** Word search: 1 (across and down) to 3 (any direction, backwards). */
  wordSearchLevel: 1 | 2 | 3;
  /** Crossword grid width and height; past 7 it scrolls on her phone, and harder words come in. */
  crosswordSize: 7 | 9 | 11;
  /** Relative chance of each clue type being tried. 0 = never used. */
  weights: Partial<Record<ClueType, number>>;
  /** Most clues of a type allowed in one case. */
  caps: Partial<Record<ClueType, number>>;
}

const LOGIC: Record<Difficulty, Pick<CaseSettings, 'freeClues' | 'located' | 'finale' | 'weights' | 'caps'>> = {
  easy: {
    freeClues: 2,
    located: 2,
    finale: false,
    weights: {
      'suspect-room': 1,
      'suspect-item': 1,
      'suspect-not-room': 3,
      'suspect-not-item': 3,
      'item-room': 2,
      'suspect-either-room': 2,
      'suspect-next-to-room': 1,
      'suspects-together': 2,
      'suspect-alone': 2,
      'suspect-empty-handed': 3,
      'suspects-apart': 1,
    },
    caps: { 'suspect-room': 1, 'suspect-item': 1 },
  },
  medium: {
    freeClues: 2,
    located: 2,
    finale: false,
    weights: {
      'suspect-not-room': 2,
      'suspect-not-item': 2,
      'item-room': 1,
      'item-not-room': 2,
      'suspect-either-room': 2,
      'suspect-next-to-room': 2,
      'suspects-adjacent': 1,
      'suspects-not-adjacent': 1,
      'suspects-together': 2,
      'suspects-apart': 2,
      'suspect-alone': 1,
      'suspect-empty-handed': 2,
    },
    caps: { 'item-room': 1 },
  },
  hard: {
    freeClues: 3,
    located: 3,
    finale: true,
    weights: {
      'suspect-not-room': 2,
      'suspect-not-item': 2,
      'item-not-room': 2,
      'suspect-either-room': 2,
      'suspect-next-to-room': 3,
      'suspects-adjacent': 2,
      'suspects-not-adjacent': 2,
      'suspects-together': 1,
      'suspects-apart': 2,
      'suspect-alone': 1,
      'suspect-empty-handed': 2,
    },
    caps: {},
  },
};

const MINIGAMES: Record<Difficulty, Pick<CaseSettings, 'catSize' | 'catEasy' | 'sudoku' | 'hardInterrogation' | 'wordSearchLevel' | 'crosswordSize'>> = {
  easy: { catSize: 6, catEasy: true, sudoku: { size: 6, givens: 16 }, hardInterrogation: false, wordSearchLevel: 1, crosswordSize: 7 },
  medium: { catSize: 7, catEasy: false, sudoku: { size: 6, givens: 13 }, hardInterrogation: true, wordSearchLevel: 2, crosswordSize: 9 },
  hard: { catSize: 8, catEasy: false, sudoku: { size: 9, givens: 32 }, hardInterrogation: true, wordSearchLevel: 3, crosswordSize: 11 },
};

const GAMES: Record<Length, number> = { short: 1, normal: 2, long: 3 };

/** One rotating game unlocks at most this many clues; past it, clues are handed out free. */
const MAX_PER_GAME = 7;

/** Generator settings for these levels, with anything unsafe clamped. */
export function caseSettings(levels: CaseLevels): CaseSettings {
  return {
    // Clamped to what the grid fits at 360px and what the content holds.
    suspects: levels.suspects === 7 ? 7 : Math.min(5, Math.max(4, levels.suspects)),
    rooms: Math.min(5, levels.suspects),
    shared: levels.suspects > 5,
    ...LOGIC[levels.logic],
    ...MINIGAMES[levels.minigames],
    ...(levels.perGame && {
      catSize: MINIGAMES[levels.perGame.cats ?? levels.minigames].catSize,
      catEasy: MINIGAMES[levels.perGame.cats ?? levels.minigames].catEasy,
      sudoku: MINIGAMES[levels.perGame.sudoku ?? levels.minigames].sudoku,
      hardInterrogation: MINIGAMES[levels.perGame.interrogation ?? levels.minigames].hardInterrogation,
      wordSearchLevel: MINIGAMES[levels.perGame.wordsearch ?? levels.minigames].wordSearchLevel,
      crosswordSize: MINIGAMES[levels.perGame.crossword ?? levels.minigames].crosswordSize,
    }),
    games: GAMES[levels.length],
    maxPerGame: MAX_PER_GAME,
  };
}

export interface ClueShares {
  /** Clues given free at the start. */
  free: number;
  /** Clues for the finale interrogation. */
  finale: number;
  /** Clues for each rotating game, in play order. */
  games: number[];
}

const LEVEL_WEIGHT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

/**
 * Play cases: no free clues, the finale's two as usual, and the rest split by
 * each game's level (easy 1 : medium 2 : hard 3; a game without a level
 * counts as easy). Every game gets at least one and at most `maxPerGame`; the
 * clues left over after the split go one each to random games. A sudoku gets
 * two when it can. Throws when the games can't hold every clue.
 */
export function playShares(total: number, s: CaseSettings, kinds: readonly GameKind[], levels: CaseLevels, rng: Rng): ClueShares {
  const k = kinds.length;
  const finale = s.finale ? Math.max(0, Math.min(2, total - k)) : 0;
  const rest = total - finale;
  if (rest > k * s.maxPerGame) throw new Error('too many clues for the games');
  if (rest < k) return { free: 0, finale, games: kinds.map((_, i) => (i < rest ? 1 : 0)) };
  const weights = kinds.map((kind) => LEVEL_WEIGHT[levels.perGame?.[kind] ?? 'easy']);
  const sum = weights.reduce((a, b) => a + b, 0);
  const games = weights.map((w) => Math.min(s.maxPerGame, Math.max(1, Math.floor((rest * w) / sum))));
  // Rounding up to one can overshoot: take back from the biggest shares.
  while (games.reduce((a, b) => a + b, 0) > rest) games[games.indexOf(Math.max(...games))]--;
  for (let left = rest - games.reduce((a, b) => a + b, 0); left > 0; left--) {
    const open = games.flatMap((g, i) => (g < s.maxPerGame ? [i] : []));
    games[rng.pick(open)]++;
  }
  const sudokuAt = kinds.indexOf('sudoku');
  if (sudokuAt >= 0 && games[sudokuAt] < 2) {
    const most = Math.max(...games.filter((_, i) => i !== sudokuAt));
    if (most > 1) {
      games[games.findIndex((g, i) => i !== sudokuAt && g === most)]--;
      games[sudokuAt]++;
    }
  }
  return { free: 0, finale, games };
}

/**
 * How a case's clues are shared out. Every rotating game unlocks at least one
 * clue and at most `maxPerGame`; a sudoku gets two when it can (one located,
 * one for finishing the grid). Free clues make up the rest, at least
 * `freeClues` while every game still gets one.
 */
export function clueShares(total: number, s: CaseSettings, sudokuAt: number): ClueShares {
  const k = s.games;
  let free = Math.min(s.freeClues, total - 2);
  const finale = s.finale ? Math.min(2, total - free - 2) : 0;
  let rest = total - free - finale;
  // Too few clues for every game to get one: give fewer away free.
  if (rest < k) {
    free = Math.max(0, free - (k - rest));
    rest = total - free - finale;
  }
  // Too many for the games to hold: give the overflow away free.
  if (rest > k * s.maxPerGame) {
    free += rest - k * s.maxPerGame;
    rest = k * s.maxPerGame;
  }
  let games: number[];
  if (k === 2) {
    // The split cases have always used.
    const first = sudokuAt === 0 ? (rest >= 3 ? Math.max(2, Math.floor(rest / 2)) : 1) : Math.ceil(rest / 2);
    games = [first, rest - first];
  } else {
    games = Array.from({ length: k }, (_, i) => Math.floor(rest / k) + (i < rest % k ? 1 : 0));
    // A sudoku likes two: one located, one for finishing.
    if (sudokuAt >= 0 && games[sudokuAt] < 2 && rest >= k + 1) {
      const donor = games.findIndex((g, i) => i !== sudokuAt && g > 1);
      if (donor >= 0) {
        games[donor]--;
        games[sudokuAt]++;
      }
    }
  }
  return { free, finale, games };
}
