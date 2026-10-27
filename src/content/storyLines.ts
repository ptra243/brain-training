import type { GameKind } from '../engine/types.ts';

/**
 * One line of scene-setting per minigame, shown on #shelf's Find a clue page in place of the game's
 * name. Three per game; the case picks one. Kept out of `content` like the cats, so they never change
 * a case. House, cat and objects only: never a guest, a case fact or a room name (the house may not
 * have that room, and it could hint at the scene).
 */
export const storyLines: Record<GameKind, readonly string[]> = {
  wordle: [
    'A five-letter word has been traced in the frost on a window pane.',
    'The cat has knocked the Scrabble tiles off the shelf, and five landed face up.',
    'Someone began a word on a steamed-up mirror and stopped.',
  ],
  crossword: [
    "A newspaper lies folded on the window seat, its crossword half done in someone else's ink.",
    'The evening paper is wedged under a teacup, a pencil still tucked in the fold.',
    'The cat is asleep on the paper, one paw over the crossword.',
  ],
  wordsearch: [
    "A child's puzzle book has fallen open behind the sofa cushions.",
    'The cat is batting at a sheet of letters pinned inside a cupboard door.',
    'A page of jumbled letters is tucked into the hymn book on the piano.',
  ],
  cats: [
    'The house cats have each claimed a different chair by the fire.',
    'A list of where the cats may sleep is propped on the kitchen dresser, half ticked off.',
    "The cat won't leave the hearth until its friends are seated just so.",
  ],
  sudoku: [
    "A grid of numbers is pencilled in the margin of the visitors' book.",
    'The mantel clock has stopped, and someone has left the key beside it.',
    'The cat is sitting on a card of numbers left on the piano stool.',
  ],
  interrogation: [
    'A chair has been pushed back from the dinner table, the napkin still on it.',
    'Two glasses stand on the window sill, one barely touched.',
    'The cat is staring at a closed door, ears flat, as if it heard something.',
  ],
  board: [
    'A plan of the house is pinned to the back of a door, with pins but no labels.',
    'The cat has scattered the counters from the games cupboard across the rug.',
    'Someone was arranging the place cards on the sideboard and stopped.',
  ],
  tarot: [
    'A tarot deck lies face down on the card table, half dealt.',
    'A single tarot card is propped against a candlestick.',
    'The cat has nosed a tarot card out from under a door.',
  ],
  nosing: [
    'The cat keeps trotting off down the passage and looking back at you.',
    'The cat sits by a closed door at the end of the passage and will not be moved.',
    'Muddy paw prints lead in from outside and up the back stairs.',
  ],
  finale: [
    'A door upstairs is locked, and the key is nowhere to be seen.',
    'Every clock in the house has been stopped at the same minute.',
    'The cat has gone very still on the top stair, watching the landing.',
  ],
};
