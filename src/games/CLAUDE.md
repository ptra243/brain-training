# Minigame puzzles

Pure puzzle logic, no React. Components live in `src/game/games/`.

- **Generated puzzles must be fair.** Cat puzzles: exactly one answer,
  even-ish zones; easy ones (`GameSpec.easy`) have exactly one one-square zone
  as a forced first move and pass `solvableBySimpleSteps`, others have none.
  Sudoku: one answer, solvable by singles alone. Known gap: medium and hard
  cat puzzles aren't checked for how much look-ahead they need.
- **Levels.** Give every new minigame easy, medium and hard where the puzzle
  can scale (size, givens, harder words, fewer hints in the clues). Wire it
  through `MINIGAMES` in `settings.ts` and add its Play roll last in
  `PLAY_ROLLED`. If it can't scale, say why in its entry here. Each level must
  stay fair and solvable, and `check-cases` must cover all three.
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
- **Nosing around** (`nosing.ts` on `nosingBoard.ts`, `mentalMaths.ts`,
  `speedRound.ts`, `lock.ts`; design in `docs/nosing-around.md`): a maths board
  game on the floor plan, a Play-only stand-in for any game holding 3 or more
  clues (a picked one may hold 1 or 2: `nosingSplit` gives the lock 1 and the
  search squares the rest, so share 1 has no search clue). The saved state is only her moves (`{ moves, hints, solved? }`);
  `nosingView` replays them, `nosingStep` validates and appends, and rolls come
  from `rollFor(nosingRollSeed(seed, board.attempt), level, turn)`. Search
  clues unlock when their square is answered right (`onFound`); the rest, and
  any search square she never landed on, come with the lock, so every clue is
  guaranteed. Hints are `nosingHint` (question ladder, then `lockHint`), never in
  the speed round. The exact turn bounds model ladders, snakes and the `steps` bonus (shared helpers in `nosingBoard.ts`), so every run, however she answers, takes `NOSING_LEVELS[level].turns`. Tests drive bots that follow hints, are always wrong, and answer at random,
  on a few fixed seeds per level; the 100-seed sweeps live in `nosingSweeps.ts`
  and run from `check-cases` (sampled quick, all with `--full`), which also
  covers every scene room at every level.
- **Number grid** (`numberGrid.ts`): the shared way she builds a number, used
  by the lock and the dog fight. Up to 3 rows of at most 3 numbers; × ÷ before
  + − inside a row, then a running total top down; only whole positive results.
  A lock target must be reachable *in the grid's shape* (`solveGrid`), never
  just with free brackets. Moves are `place`, `clear` and `clearAll`; old
  `combine` and `undo` lock moves are dropped on load by `nosingUpgrade`.
- **Dog fight** (`dogFight.ts`, cards in `src/content/dogCards.ts`): one
  per Nosing run, on a seeded snake head. The dog only plays what she can
  answer with her hand; on attack it is strict-tiered (a third of turns
  doubleable, the rest only beatable). The dog stops the cat as it passes
  (a roll, `steps` or a ladder onto or past its square). Following hints always wins; a win
  carries the cat on to where the move was going and never gives `steps`, a
  loss slides it; `nosingBounds` models the stop, so turn bounds hold.
