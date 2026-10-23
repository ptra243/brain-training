# Target or another word game

Exploratory design, moved from `docs/next-sessions.md`. Reads first: `src/games/CLAUDE.md`,
`scripts/build-words.ts`, `src/games/dictionary.ts` and `src/game/games/WordleGame.tsx` (how the guess
list is fetched).

## Goal

Design, then build, a Target-style game (a 3×3 grid around one 9-letter word, find 4+ letter words that
use the centre letter), or another word game if that fits better.

## Proposed approach

- Two lists. Guesses are checked against a big list: `build-words.ts` also writes
  `public/words-4-9.txt` (the old 4–9 filter on `word-list`) and Wordle keeps its 5-letter file. The
  puzzle is built from a common-word list generated from SCOWL tiers (`wordlist-english` on npm;
  install it on the owner's machine), 4–9 letters, no proper nouns, plus a small blocklist. It is
  committed to `src/content/` and lazily imported by the game.
- The seed 9-letter word comes from the most common tiers only, and never a room, suspect or item name.
- Goals, the Solve answer and the cat's hints come from the common list. A guess that's only in the big
  list counts as a bonus word, not toward the goals.
- Editing the common list changes cases: bump the storage prefix in `src/game/storage.ts`, and add a
  golden test (one seed, its word and goal counts).

## Settle first

Target or another game, goal levels, what the clue reward is, and whether it joins the case rotation.
