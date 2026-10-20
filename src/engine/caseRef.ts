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
}

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
const PLAY_ROLLED: readonly GameKind[] = ['cats', 'sudoku', 'interrogation', 'board', 'wordsearch'];

/**
 * The levels a Play code rolls, from a seed of its own, in this fixed order
 * (plain independent rolls): logic difficulty (easy 1 : medium 2 : hard 1),
 * guests (7 one time in 4, else 4 or 5 evenly), then one difficulty per game.
 * The crossword's roll will be appended last when it gets levels (appending
 * keeps earlier rolls the same); the wordle has none. Games without a roll
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

/** The code she'd read out to replay this case: "K7QF2" for Play, "K7QF2-MN" (or "K7QF2-MNB" with the big cast) for Quick start. */
export function caseCode(ref: CaseRef): string {
  if (ref.mode === 'play') return ref.code;
  return `${ref.code}-${DIFFICULTY_LETTER[ref.difficulty]}${LENGTH_LETTER[ref.length]}${ref.cast === 'big' ? 'B' : ''}`;
}

/** Reads a case code back, forgiving case, spaces and a missing dash. */
export function parseCaseCode(text: string): CaseRef | null {
  const t = text.toUpperCase().replace(/\s+/g, '');
  if (/^[0-9A-Z]{5}$/.test(t)) return [...t].every((ch) => ALPHABET.includes(ch)) ? { mode: 'play', code: t } : null;
  const m = /^([0-9A-Z]{5})-?([EMH])([SNL])(B?)$/.exec(t);
  if (!m || [...m[1]].some((ch) => !ALPHABET.includes(ch))) return null;
  const difficulty = (Object.keys(DIFFICULTY_LETTER) as Difficulty[]).find((d) => DIFFICULTY_LETTER[d] === m[2])!;
  const length = (Object.keys(LENGTH_LETTER) as Length[]).find((l) => LENGTH_LETTER[l] === m[3])!;
  return { mode: 'quick', code: m[1], difficulty, length, ...(m[4] && { cast: 'big' as const }) };
}

/** The case a ref names. Same ref, same case. */
export function caseFor(content: Content, ref: CaseRef): Case {
  if (ref.mode === 'play') return buildPlayCase(content, `play-${ref.code}`, codeNumber(ref.code), ref.code, playLevels(ref.code));
  const levels = quickLevels(ref);
  return buildCase(content, `quick-${ref.code}-${levelsKey(levels)}`, codeNumber(ref.code), ref.code, levels);
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
