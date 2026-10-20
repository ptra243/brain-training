// Builds the word games that reveal the scene. Each hides its own word
// (`spec.scene.answer`, a thing in the scene room); she only needs to solve one.

import { content } from '../content/index.ts';
import { hardClueWords, mediumClueWords } from '../content/crosswordWords.ts';
import { clueWords, type ClueWord } from '../content/words.ts';
import { Rng } from '../engine/rng.ts';
import { caseSettings } from '../engine/settings.ts';
import type { Case, Content, SceneGameSpec } from '../engine/types.ts';
import { generateCrossword, type CrosswordPuzzle } from '../games/crossword.ts';
import { generateWordSearch, type WordSearchPuzzle } from '../games/wordsearch.ts';

/** Words that must not show up as fill: room, suspect and item names, and everything in any room. */
export function themeWords(theme: Content): Set<string> {
  const names = [
    ...theme.house.rooms.flatMap((r) => [r.name, ...r.objects, ...r.things]),
    ...theme.suspects.map((s) => s.name),
    ...theme.items.map((i) => i.name),
  ];
  return new Set(names.flatMap((n) => n.toUpperCase().split(/[^A-Z]+/)).filter((w) => w.length >= 3 && w !== 'THE'));
}

/** Fill for a crossword of this size: bigger grids (medium and hard cases) bring in harder words. */
export function crosswordWords(size: number): readonly ClueWord[] {
  if (size <= 7) return clueWords;
  if (size <= 9) return [...clueWords, ...mediumClueWords];
  // Short everyday words still glue the long ones together.
  return [...clueWords.filter((w) => w.word.length <= 4), ...mediumClueWords, ...hardClueWords];
}

export function sceneCrossword(spec: SceneGameSpec, theme: Content = content): CrosswordPuzzle {
  return generateCrossword(spec.scene.answer, crosswordWords(spec.size), themeWords(theme), new Rng(spec.seed), spec.size);
}

export function sceneWordSearch(c: Case, spec: SceneGameSpec, theme: Content = content): WordSearchPuzzle {
  return generateWordSearch(
    spec.scene.answer,
    clueWords.map((w) => w.word),
    themeWords(theme),
    caseSettings(c.levels).wordSearchLevel,
    new Rng(spec.seed),
    spec.size,
  );
}
