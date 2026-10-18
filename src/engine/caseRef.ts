// Which case she's playing, by mode. Each mode seeds from its own text, so a
// quick case never repeats a numbered one. A case code like "K7QF2-MN" (the
// code, then difficulty and length) rebuilds the case exactly, so a case can
// be replayed from #dev.

import { buildCase } from './generate.ts';
import { PRESETS, levelsKey, type CaseLevels, type Length } from './settings.ts';
import type { Case, Content, Difficulty } from './types.ts';

/** A Quick start case: a preset difficulty and a length, picked by her. */
export interface QuickRef {
  mode: 'quick';
  /** Five characters, no 0/O, 1/I/L or U, so it reads back without mix-ups. */
  code: string;
  difficulty: Difficulty;
  length: Length;
}

/** Campaign refs join this in a later step. */
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

export const quickLevels = (ref: QuickRef): CaseLevels => ({ ...PRESETS[ref.difficulty], length: ref.length });

/** The code she'd read out to replay this case: "K7QF2-MN". */
export function caseCode(ref: CaseRef): string {
  return `${ref.code}-${DIFFICULTY_LETTER[ref.difficulty]}${LENGTH_LETTER[ref.length]}`;
}

/** Reads a case code back, forgiving case, spaces and a missing dash. */
export function parseCaseCode(text: string): QuickRef | null {
  const m = /^([0-9A-Z]{5})-?([EMH])([SNL])$/.exec(text.toUpperCase().replace(/\s+/g, ''));
  if (!m || [...m[1]].some((ch) => !ALPHABET.includes(ch))) return null;
  const difficulty = (Object.keys(DIFFICULTY_LETTER) as Difficulty[]).find((d) => DIFFICULTY_LETTER[d] === m[2])!;
  const length = (Object.keys(LENGTH_LETTER) as Length[]).find((l) => LENGTH_LETTER[l] === m[3])!;
  return { mode: 'quick', code: m[1], difficulty, length };
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
  random: () => number,
): { ref: QuickRef; c: Case } {
  for (let tries = 0; tries < 20; tries++) {
    const ref: QuickRef = { mode: 'quick', code: codeFor(random()), difficulty, length };
    try {
      return { ref, c: caseFor(content, ref) };
    } catch {
      // Try another code.
    }
  }
  throw new Error('Could not build a new case');
}
