// Which case she's playing, by mode. Each mode seeds from its own text, so a
// quick case never repeats a numbered one. A case code like "K7QF2-MN" (the
// code, then difficulty and length, and a B for the big cast) rebuilds the
// case exactly, so a case can be replayed from #dev.

import { buildCase } from './generate.ts';
import { PRESETS, levelsKey, type CaseLevels, type Length } from './settings.ts';
import { capital } from './text.ts';
import type { Case, Content, Difficulty } from './types.ts';

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

/** Refs to numbered and Quick start cases. Campaign rounds have their own ref in campaign.ts. */
export type CaseRef = QuickRef;

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

/** The code she'd read out to replay this case: "K7QF2-MN", or "K7QF2-MNB" with the big cast. */
export function caseCode(ref: CaseRef): string {
  return `${ref.code}-${DIFFICULTY_LETTER[ref.difficulty]}${LENGTH_LETTER[ref.length]}${ref.cast === 'big' ? 'B' : ''}`;
}

/** Reads a case code back, forgiving case, spaces and a missing dash. */
export function parseCaseCode(text: string): QuickRef | null {
  const m = /^([0-9A-Z]{5})-?([EMH])([SNL])(B?)$/.exec(text.toUpperCase().replace(/\s+/g, ''));
  if (!m || [...m[1]].some((ch) => !ALPHABET.includes(ch))) return null;
  const difficulty = (Object.keys(DIFFICULTY_LETTER) as Difficulty[]).find((d) => DIFFICULTY_LETTER[d] === m[2])!;
  const length = (Object.keys(LENGTH_LETTER) as Length[]).find((l) => LENGTH_LETTER[l] === m[3])!;
  return { mode: 'quick', code: m[1], difficulty, length, ...(m[4] && { cast: 'big' as const }) };
}

/** The case a ref names. Same ref, same case. */
export function caseFor(content: Content, ref: CaseRef): Case {
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
export function caseName(ref: QuickRef, words: CaseNameWords): string {
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
  const kind =
    kinds[(DIFFICULTY_ORDER.indexOf(ref.difficulty) * LENGTH_ORDER.length + LENGTH_ORDER.indexOf(ref.length)) * 2 + (ref.cast === 'big' ? 1 : 0)];
  return `The ${capital(adjective)} ${capital(noun)} ${capital(kind)} at ${capital(place)}`;
}

/** Reads a case name back, forgiving case, punctuation, a missing "the" or "at" and a split place. */
export function parseCaseName(text: string, words: CaseNameWords): QuickRef | null {
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
  const cast = k % 2 === 1;
  const levels = Math.floor(k / 2);
  return {
    mode: 'quick',
    code: codeFor(n),
    difficulty: DIFFICULTY_ORDER[Math.floor(levels / LENGTH_ORDER.length)],
    length: LENGTH_ORDER[levels % LENGTH_ORDER.length],
    ...(cast && { cast: 'big' as const }),
  };
}

/** A case code or a case name, whichever she typed. */
export const parseCase = (text: string, words: CaseNameWords): QuickRef | null =>
  parseCaseCode(text) ?? parseCaseName(text, words);
