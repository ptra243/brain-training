# Engine: case generation

- **Every case has exactly one solution** and a minimal clue set. Never ship
  a generator change without `npm run check-cases` passing.
- **Case settings are levels** (`settings.ts`): suspects (4, 5 or 7), logic,
  minigames and length. `caseSettings` turns them into generator settings and
  clamps anything unsafe; `clueShares` gives every rotating game 1 to 7 clues
  and hands the rest out free. Only levels listed there can ship;
  `check-cases` runs every combination.
- **Games in a case**: three scene word games (any one reveals the scene
  room) plus one to three rotating games from cat puzzle, sudoku and
  interrogation. Hard logic adds a finale interrogation that uses her
  casebook as evidence. The cat puzzle unlocks evidence ("found by the
  cats"); the rest unlock testimony (`CLUE_SOURCE` in `gameKinds.ts`). 2–3
  clues are free at the start. `GameSpec` is one type per kind of game;
  cases are drawn from the order of `ROTATION`, so don't reorder it.
- **The case board** (`boardTypes.ts`, `board.ts`, `caseBoard.ts`): a
  packing puzzle where every clue is a piece (one per guest it names, at most
  two per guest). A guest's pieces all go where the clues prove they were, or
  in Unknown; weapons the same. Marks show what a clue says where the board
  can (rooms ruled out or allowed, touching pairs, apart pairs); other clue
  types give a piece with no mark and the shapes carry them. `board.ts` draws
  the rectangle first and cuts it along a gilbert curve, then re-cuts (or
  pins) until exactly one way of sorting the pieces fits. It never adds
  clues. Two uses: the rotating **case board puzzle** (the free clues plus its
  own clues as blank pieces, so solving it proves them) stands in for one of
  a case's drawn games on a seed of its own (`BOARD_SHARE`, only when its
  board builds), so cases that keep their games are unchanged; and the **end
  board**, a starting option that doesn't change the case. `check-cases`
  builds every puzzle board and two end boards per case.
- **7 guests share 5 rooms and 5 weapons.** The killer was alone in the scene
  room holding the weapon; two guests hold nothing (`null` in
  `Solution.item`). These cases are checked with the search in `search.ts`
  (too many answers to list). Shared-only clue types (together, apart, alone,
  empty-handed) never appear in classic pools. Once a `Case` exists, build its
  context, search space and interrogation facts only through `caseFacts.ts`,
  so `shared` is never left out (forgetting it once let wrong evidence win).
- **Interrogations**: 8 questions, all answered truthfully except one lie.
  She asks up to 5 (6 in the finale) and presents exactly `proof.length`
  cards; any set that `disproves` the lie wins. Easy: one card; harder: two
  together. Their clues are the suspect's confession, in their own voice.
  True answers she drew out and the evidence cards join her casebook; the lie
  never does.
- **The campaign** (`campaign.ts`; saved play in `src/game/campaign.ts`): 7
  guests, one killer, up to 3 rounds, each a body later in the night, built
  from the campaign and the victims before it. A wrong person becomes the
  next body; after the third the killer escapes; the right person with the
  wrong weapon costs nothing. She plays any `budget` of a round's 3 puzzles
  (easy 3, medium 2, hard 1; the word game is free). Before the last round
  every choice of puzzles leaves 2 or 3 possible killers; in the last round
  the free clues settle the weapon and any one puzzle settles the killer.
  Rounds are checked by `roundProblems`, not uniqueness; `check-cases` walks
  every wrong-guess path.
- **A case name is its code in words** ("The Black Dahlia Scandal at
  Ashcombe": the code's number as a descriptor, a cat or flower word and a
  place, then the kind word for its levels), so either replays the case
  (`caseName`, `parseCase`). Never change, reorder or add to the lists in
  `src/content/caseNames.ts`: that renames every case (a test pins one).
  Names never use theme words (tested).
