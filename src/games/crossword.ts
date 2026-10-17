// Mini crossword: one across answer per row, offset so that one letter of
// each lines up in a shaded column. Read top to bottom, the shaded column
// spells the hidden word. She wins the moment the shaded column is right,
// so she can stop early once she's guessed the word from a few rows.

import type { Rng } from '../engine/rng.ts';

export interface ClueWordLike {
  word: string;
  clue: string;
}

export interface CrosswordRow {
  word: string;
  clue: string;
  /** Grid column of the word's first letter. */
  start: number;
}

export interface CrosswordPuzzle {
  answer: string;
  /** Grid width in columns. */
  width: number;
  /** The shaded column. */
  column: number;
  rows: readonly CrosswordRow[];
}

/** Fits 7 cells across a 360px phone at 44px each. */
export const CROSSWORD_WIDTH = 7;
const COLUMN = 3;

/**
 * Pick one clued word per letter of `answer`, each with that letter somewhere
 * it can sit in the shaded column without running off the grid.
 * `exclude` holds words that must not appear (theme names, the answer).
 */
export function generateCrossword(
  answer: string,
  words: readonly ClueWordLike[],
  exclude: ReadonlySet<string>,
  rng: Rng,
): CrosswordPuzzle {
  const used = new Set<string>();
  const rows: CrosswordRow[] = [];
  for (const letter of answer) {
    const options: { w: ClueWordLike; at: number }[] = [];
    for (const w of words) {
      if (used.has(w.word) || exclude.has(w.word) || w.word === answer || w.word.length < 3) continue;
      for (let at = 0; at < w.word.length; at++) {
        if (w.word[at] !== letter) continue;
        if (at > COLUMN || w.word.length - 1 - at > CROSSWORD_WIDTH - 1 - COLUMN) continue;
        options.push({ w, at });
      }
    }
    if (!options.length) throw new Error(`No crossword word for ${letter} in ${answer}`);
    // Prefer 4+ letters: three-letter answers are too easy to guess from the shading.
    const long = options.filter((o) => o.w.word.length >= 4);
    const { w, at } = rng.pick(long.length ? long : options);
    used.add(w.word);
    rows.push({ word: w.word, clue: w.clue, start: COLUMN - at });
  }
  return { answer, width: CROSSWORD_WIDTH, column: COLUMN, rows };
}

/** Index in a row's word of its shaded letter. */
export const shadedIndex = (p: CrosswordPuzzle, r: number) => p.column - p.rows[r].start;

/** Her letters, one string per row (one character per cell, ' ' for empty). */
export type CrosswordEntries = readonly string[];

export const emptyEntries = (p: CrosswordPuzzle): string[] => p.rows.map((row) => ' '.repeat(row.word.length));

export const rowSolved = (p: CrosswordPuzzle, entries: CrosswordEntries, r: number) => entries[r] === p.rows[r].word;

/** Won when every shaded square holds the right letter. */
export const crosswordWon = (p: CrosswordPuzzle, entries: CrosswordEntries) =>
  p.rows.every((row, r) => entries[r]?.[shadedIndex(p, r)] === row.word[shadedIndex(p, r)]);

/** Set one cell, returning new entries. */
export function setCell(entries: CrosswordEntries, r: number, i: number, letter: string): string[] {
  const next = entries.slice();
  const row = next[r];
  next[r] = row.slice(0, i) + (letter || ' ') + row.slice(i + 1);
  return next;
}
