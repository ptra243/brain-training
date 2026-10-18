// Builds the word games that reveal the scene. Each hides its own word
// (`spec.scene.answer`, a thing in the scene room); she only needs to solve one.

import { content } from '../content/index.ts';
import { clueWords } from '../content/words.ts';
import { Rng } from '../engine/rng.ts';
import { caseSettings } from '../engine/settings.ts';
import type { Case, Content, GameSpec } from '../engine/types.ts';
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

export function sceneCrossword(spec: GameSpec, theme: Content = content): CrosswordPuzzle {
  return generateCrossword(spec.scene!.answer, clueWords, themeWords(theme), new Rng(spec.seed));
}

export function sceneWordSearch(c: Case, spec: GameSpec, theme: Content = content): WordSearchPuzzle {
  return generateWordSearch(
    spec.scene!.answer,
    clueWords.map((w) => w.word),
    themeWords(theme),
    caseSettings(c.levels).wordSearchLevel,
    new Rng(spec.seed),
    spec.size,
  );
}
