# Minigame puzzles

Pure puzzle logic, no React. Components live in `src/game/games/`.

- **Generated puzzles must be fair.** Cat puzzles: exactly one answer,
  even-ish zones; easy ones (`GameSpec.easy`) have exactly one one-square zone
  as a forced first move and pass `solvableBySimpleSteps`, others have none.
  Sudoku: one answer, solvable by singles alone. Known gap: medium and hard
  cat puzzles aren't checked for how much look-ahead they need.
- **Generate a puzzle once per game screen**, never per render or per move.
- **Hints** are a pure `…Hint()` function here, with a test that following
  hints always reaches a win. Ladder, gentle to strong: red-pencil wrong
  letters/moves, then where to look, then fill one square; where the move has
  a reason (sudoku singles, cat simple steps) a "why" step comes first and
  the board lights it up. Save the hint count in the game's data; a game won
  with hints is still `won`. The UI is `HintButton` + `HintNote`
  (`src/game/games/Hints.tsx`). Done: crossword, sudoku, cat puzzle. To do:
  Wordle, word search, interrogation.
- **Sudoku statements** have two marked squares whose digits are a row and
  column on the floor plan, pointing at their room; each unlocks the moment
  both are right, and finishing the grid gives one more clue.
- **Scene words.** Wordle answers come from room `objects` (5 letters); the
  crossword and word search hide a room `thing` (4–9 letters, no J/X/Z).
  Words may repeat across rooms, since the revealed sentence names the room. Each
  reveals its own sentence naming the scene room. Teasers never show the room
  or the word (tested).
- **Crossword**: a real interlocking grid (no stray runs); shaded squares
  numbered 1, 2, 3… spell the word across different entries. Easy 7×7 with
  everyday words, medium 9×9 adding `mediumClueWords`, hard 11×11 with
  medium + `hardClueWords` (`src/content/crosswordWords.ts`, glued with short
  everyday words). Grids past 7 keep 44px squares and slide sideways in
  their own box. She wins only when every square is right; once the shaded
  squares are right she may stop early with "Take the clue" (still `won`).
  **Word search**: leftover letters spell the word, every listed word appears
  exactly once, and she can type the word early.
- **Word lists.** Fill and answers come from `src/content/words.ts` (common
  words with clues; harder crossword fill in `crosswordWords.ts`) and never
  use a theme word (`themeWords`).
  `public/words.txt` (from `word-list` via `npm run build-words`) is full of
  obscure words: use it only to accept guesses. It's committed, fetched on
  demand and precached for offline; until it loads any guess is accepted.
  Every room object must be in it (tested).
