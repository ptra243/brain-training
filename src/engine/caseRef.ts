// Which case she's playing, by mode. Each mode seeds from its own text, so a
// quick case never repeats a numbered one. A Quick start case code like
// "K7QF2-MN" (the code, then difficulty and length, and a B for the big cast)
// rebuilds the case exactly, so a case can be replayed from #dev. A Play case
// is its bare code ("K7QF2") alone: the code rolls the levels too
// (`playLevels`). A case name says the same as the code in words; names now
// read back as Play cases, and old Quick start cases replay by their code.

import { buildCase, buildPlayCase } from './generate.ts';
import { Rng, hashSeed } from './rng.ts';
import { PRESETS, levelsKey, type CaseLevels, type Length } from './settings.ts';
import { capital } from './text.ts';
import type { Case, Content, Difficulty, GameKind } from './types.ts';

/** A Quick start case: a preset difficulty and a length, picked by her. */
export interface QuickRef {
  mode: 'quick';
  /** Five characters, no 0/O, 1/I/L or U, so it reads back without mix-ups. */
  code: string;
  difficulty: Difficulty;
  length: Length;
  /** 'big': 7 guests sharing 5 rooms. Saves from before it read as classic. */
  cast?: Cast;
  /** Starting option: a case board tab that fits her clues together before she accuses. Doesn't change the case. */
  endBoard?: boolean;
}

export type Cast = 'classic' | 'big';

/** A Play case: the code alone decides everything, levels included. */
export interface PlayRef {
  mode: 'play';
  code: string;
  /**
   * A picked case ("Choose games"): the games she chose, in `PICK_ORDER`
   * (at least `PICK_MIN`). Absent: the code draws the games itself.
   */
  games?: PickedGame[];
}

/** Games she can pick: the scene word games and the rotating ones, board, tarot and Nosing around included. */
export type PickedGame = 'wordle' | 'crossword' | 'wordsearch' | 'cats' | 'sudoku' | 'interrogation' | 'board' | 'tarot' | 'nosing';

/** The fixed order a picked case stores and writes its games in. */
export const PICK_ORDER: readonly PickedGame[] = ['wordle', 'crossword', 'wordsearch', 'cats', 'sudoku', 'interrogation', 'board', 'tarot', 'nosing'];
const PICK_LETTER: Record<PickedGame, string> = { wordle: 'W', crossword: 'C', wordsearch: 'F', cats: 'K', sudoku: 'S', interrogation: 'I', board: 'B', tarot: 'T', nosing: 'N' };
export const PICK_MIN = 3;
/** Picked games in canonical order, without repeats. */
export const pickedInOrder = (games: readonly PickedGame[]): PickedGame[] => PICK_ORDER.filter((g) => games.includes(g));

/** Refs to Quick start and Play cases. Campaign rounds have their own ref in campaign.ts. */
export type CaseRef = QuickRef | PlayRef;

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 5;
export const CODE_COUNT = ALPHABET.length ** CODE_LENGTH;

const DIFFICULTY_LETTER: Record<Difficulty, string> = { easy: 'E', medium: 'M', hard: 'H' };
const LENGTH_LETTER: Record<Length, string> = { short: 'S', normal: 'N', long: 'L' };

/** The code for a number (any whole number; it wraps). */
export function codeFor(n: number): string {
  let rest = ((Math.floor(n) % CODE_COUNT) + CODE_COUNT) % CODE_COUNT;
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out = ALPHABET[rest % ALPHABET.length] + out;
    rest = Math.floor(rest / ALPHABET.length);
  }
  return out;
}

/** The number behind a code. */
export function codeNumber(code: string): number {
  return [...code].reduce((n, ch) => n * ALPHABET.length + ALPHABET.indexOf(ch), 0);
}

export const quickLevels = (ref: QuickRef): CaseLevels => ({
  ...PRESETS[ref.difficulty],
  length: ref.length,
  ...(ref.cast === 'big' && { suspects: 7 as const }),
});

/** Games that roll a difficulty in a Play case, in rolling order. */
const PLAY_ROLLED: readonly GameKind[] = ['cats', 'sudoku', 'interrogation', 'board', 'wordsearch', 'crossword', 'tarot', 'nosing'];

/**
 * The levels a Play code rolls, from a seed of its own, in this fixed order
 * (plain independent rolls): logic difficulty (easy 1 : medium 2 : hard 1),
 * guests (7 one time in 4, else 4 or 5 evenly), then one difficulty per game.
 * The crossword's, then tarot's and then Nosing around's rolls were appended last (appending keeps earlier rolls the
 * same); the wordle has none. Games without a roll
 * fall back to `minigames`.
 */
export function playLevels(code: string): CaseLevels {
  const rng = new Rng(hashSeed(`play-${code}-levels`));
  const logic: Difficulty = (['easy', 'medium', 'medium', 'hard'] as const)[rng.int(4)];
  const big = rng.int(4) === 0;
  const classic = rng.int(2) === 0 ? 4 : 5;
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  const perGame: Partial<Record<GameKind, Difficulty>> = {};
  for (const kind of PLAY_ROLLED) perGame[kind] = difficulties[rng.int(3)];
  return { suspects: big ? 7 : classic, logic, minigames: 'easy', length: 'long', perGame };
}

/** The code she'd read out to replay this case: "K7QF2" for Play, "K7QF2+WCK" for a picked case (the games' letters), "K7QF2-MN" (or "K7QF2-MNB" with the big cast) for Quick start. */
export function caseCode(ref: CaseRef): string {
  if (ref.mode === 'play') return ref.games ? `${ref.code}+${pickedInOrder(ref.games).map((g) => PICK_LETTER[g]).join('')}` : ref.code;
  return `${ref.code}-${DIFFICULTY_LETTER[ref.difficulty]}${LENGTH_LETTER[ref.length]}${ref.cast === 'big' ? 'B' : ''}`;
}

/** Reads a case code back, forgiving case, spaces and a missing dash. */
export function parseCaseCode(text: string): CaseRef | null {
  const t = text.toUpperCase().replace(/\s+/g, '');
  const pick = /^([0-9A-Z]{5})\+([A-Z]+)$/.exec(t);
  if (pick) {
    if ([...pick[1]].some((ch) => !ALPHABET.includes(ch))) return null;
    const games: PickedGame[] = [];
    for (const ch of pick[2]) {
      const g = PICK_ORDER.find((k) => PICK_LETTER[k] === ch);
      if (!g || games.includes(g)) return null;
      games.push(g);
    }
    return games.length < PICK_MIN ? null : { mode: 'play', code: pick[1], games: pickedInOrder(games) };
  }
  if (/^[0-9A-Z]{5}$/.test(t)) return [...t].every((ch) => ALPHABET.includes(ch)) ? { mode: 'play', code: t } : null;
  const m = /^([0-9A-Z]{5})-?([EMH])([SNL])(B?)$/.exec(t);
  if (!m || [...m[1]].some((ch) => !ALPHABET.includes(ch))) return null;
  const difficulty = (Object.keys(DIFFICULTY_LETTER) as Difficulty[]).find((d) => DIFFICULTY_LETTER[d] === m[2])!;
  const length = (Object.keys(LENGTH_LETTER) as Length[]).find((l) => LENGTH_LETTER[l] === m[3])!;
  return { mode: 'quick', code: m[1], difficulty, length, ...(m[4] && { cast: 'big' as const }) };
}

/** The case a ref names. Same ref, same case. */
export function caseFor(content: Content, ref: CaseRef): Case {
  if (ref.mode === 'play' && ref.games) return pickedCase(content, ref.code, ref.games);
  if (ref.mode === 'play') return buildPlayCase(content, `play-${ref.code}`, codeNumber(ref.code), ref.code, playLevels(ref.code));
  const levels = quickLevels(ref);
  return buildCase(content, `quick-${ref.code}-${levelsKey(levels)}`, codeNumber(ref.code), ref.code, levels);
}

/** How many seed suffixes a picked case tries (`pick-<code>-<letters>`, then `-1`, `-2`, ...). */
const PICK_TRIES = 30;

/**
 * A picked case: the same code and so the same levels she saw, with the first
 * seed text that builds. Deterministic, so the same ref is always the same case.
 */
function pickedCase(content: Content, code: string, games: readonly PickedGame[]): Case {
  const letters = pickedInOrder(games).map((g) => PICK_LETTER[g]).join('');
  const levels = playLevels(code);
  let last: unknown;
  for (let i = 0; i < PICK_TRIES; i++) {
    try {
      return buildPlayCase(content, `pick-${code}-${letters}${i ? `-${i}` : ''}`, codeNumber(code), code, levels, pickedInOrder(games));
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`Could not build a case with those games: ${last instanceof Error ? last.message : last}`);
}

/** A new picked case for a code she's seen (the picker rolls the code). */
export function newPickCase(content: Content, code: string, games: readonly PickedGame[]): { ref: PlayRef; c: Case } {
  const ref: PlayRef = { mode: 'play', code, games: pickedInOrder(games) };
  return { ref, c: caseFor(content, ref) };
}

/**
 * A new Quick start case. `random` gives whole numbers (the UI passes the
 * browser's crypto; the engine itself stays seeded). A code whose case can't
 * be built is skipped for the next one.
 */
export function newQuickCase(
  content: Content,
  difficulty: Difficulty,
  length: Length,
  cast: Cast,
  random: () => number,
): { ref: QuickRef; c: Case } {
  for (let tries = 0; tries < 20; tries++) {
    const ref: QuickRef = { mode: 'quick', code: codeFor(random()), difficulty, length, ...(cast === 'big' && { cast }) };
    try {
      return { ref, c: caseFor(content, ref) };
    } catch {
      // Try another code.
    }
  }
  throw new Error('Could not build a new case');
}

/** A new Play case, like `newQuickCase`: a code whose case can't be built is skipped. */
export function newPlayCase(content: Content, random: () => number): { ref: PlayRef; c: Case } {
  for (let tries = 0; tries < 20; tries++) {
    const ref: PlayRef = { mode: 'play', code: codeFor(random()) };
    try {
      return { ref, c: caseFor(content, ref) };
    } catch {
      // Try another code.
    }
  }
  throw new Error('Could not build a new case');
}

/** Word lists for case names, from `src/content/`. */
export interface CaseNameWords {
  adjectives: readonly string[];
  nouns: readonly string[];
  placeStarts: readonly string[];
  placeEnds: readonly string[];
  /** One per difficulty × length × cast (18). */
  kinds: readonly string[];
}

const DIFFICULTY_ORDER = Object.keys(DIFFICULTY_LETTER) as Difficulty[];
const LENGTH_ORDER = Object.keys(LENGTH_LETTER) as Length[];

/**
 * The case's name, "The Black Dahlia Scandal at Ashcombe": the code's number
 * written in words, and the kind of case for its levels. It says the same as
 * the case code, so either one replays the case.
 */
export function caseName(ref: CaseRef, words: CaseNameWords): string {
  const { adjectives, nouns, placeStarts, placeEnds, kinds } = words;
  let n = codeNumber(ref.code);
  const digit = (size: number) => {
    const d = n % size;
    n = Math.floor(n / size);
    return d;
  };
  const adjective = adjectives[digit(adjectives.length)];
  const noun = nouns[digit(nouns.length)];
  const place = placeStarts[digit(placeStarts.length)] + placeEnds[digit(placeEnds.length)];
  let slot: number;
  if (ref.mode === 'play') {
    // The kind word for the rolled logic and guests, in the 'normal' length slot.
    const levels = playLevels(ref.code);
    slot = (DIFFICULTY_ORDER.indexOf(levels.logic) * LENGTH_ORDER.length + 1) * 2 + (levels.suspects === 7 ? 1 : 0);
  } else {
    slot = (DIFFICULTY_ORDER.indexOf(ref.difficulty) * LENGTH_ORDER.length + LENGTH_ORDER.indexOf(ref.length)) * 2 + (ref.cast === 'big' ? 1 : 0);
  }
  const kind = kinds[slot];
  return `The ${capital(adjective)} ${capital(noun)} ${capital(kind)} at ${capital(place)}`;
}

/** Reads a case name back, forgiving case, punctuation, a missing "the" or "at" and a split place. */
export function parseCaseName(text: string, words: CaseNameWords): PlayRef | null {
  const { adjectives, nouns, placeStarts, placeEnds, kinds } = words;
  const tokens = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t && t !== 'the' && t !== 'at');
  if (tokens.length === 5) tokens.splice(3, 2, tokens[3] + tokens[4]);
  if (tokens.length !== 4) return null;
  const [adjective, noun, kind, place] = tokens;
  const a = adjectives.indexOf(adjective);
  const b = nouns.indexOf(noun);
  const k = kinds.indexOf(kind);
  const start = placeStarts.findIndex((s) => place.startsWith(s) && placeEnds.includes(place.slice(s.length)));
  if (a < 0 || b < 0 || k < 0 || start < 0) return null;
  const end = placeEnds.indexOf(place.slice(placeStarts[start].length));
  const n = a + adjectives.length * (b + nouns.length * (start + placeStarts.length * end));
  if (n >= CODE_COUNT) return null;
  // Any kind word is accepted: the code alone decides a Play case.
  return { mode: 'play', code: codeFor(n) };
}

/** A case code or a case name, whichever she typed. */
export const parseCase = (text: string, words: CaseNameWords): CaseRef | null =>
  parseCaseCode(text) ?? parseCaseName(text, words);
