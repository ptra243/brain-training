// What each kind of minigame is for. Adding a game starts here (and with its
// spec in `types.ts`); the UI side (name, puzzle, screen) is the registry in
// `src/game/games/registry.tsx`.

import type { ClueDelivery, ClueSource, GameSpec, InterrogationSpec, RotatingKind, SceneGameSpec, SceneKind } from './types.ts';

/** Word games that reveal the scene. Any one of them is enough. */
export const SCENE_GAMES: readonly SceneKind[] = ['wordle', 'crossword', 'wordsearch'];

/** Games that share a case's clues; a case plays one to three of them. Order matters: cases are drawn from it. */
export const ROTATION: readonly RotatingKind[] = ['cats', 'sudoku', 'interrogation'];

/**
 * How often the case board puzzle stands in for one of a case's drawn games.
 * It's decided on a seed of its own after the draw, so cases that keep their
 * games are the same as before; it only stands in when a board can be built.
 */
export const BOARD_SHARE = 0.35;

/** How clues read from each source: the cats find evidence, everyone else gives testimony. */
export const CLUE_SOURCE: Record<ClueDelivery, ClueSource> = {
  given: 'testimony',
  sudoku: 'testimony',
  interrogation: 'testimony',
  finale: 'testimony',
  cats: 'evidence',
  wordle: 'testimony',
  crossword: 'testimony',
  wordsearch: 'testimony',
  board: 'testimony',
};

export const isSceneGame = (g: GameSpec): g is SceneGameSpec => g.unlocksScene;
export const isInterrogation = (g: GameSpec): g is InterrogationSpec => 'interrogation' in g;

/** How many games a Play case draws (more when its clues need the room: each game holds at most 7). */
export const PLAY_GAMES_MIN = 3;
export const PLAY_GAMES_MAX = 5;
