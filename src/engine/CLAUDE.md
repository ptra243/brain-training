# Engine: case generation

- **Every case has exactly one solution** and a minimal clue set. Never ship
  a generator change without `npm run check-cases` passing.
- **Case settings are levels** (`settings.ts`): suspects (4, 5 or 7), logic,
  minigames and length. `caseSettings` turns them into generator settings and
  clamps anything unsafe; `clueShares` gives every rotating game 1 to 7 clues
  and hands the rest out free. Only levels listed there can ship;
  `check-cases` runs every combination.
- **A new game joins on its own seed stream, after the existing draw, never
  inside it.** Don't add to `ROTATION`, reorder anything, or change what the
  draw consumes. Copy `boardSlot`: a separate seed decides whether the new
  game stands in for a drawn one, so cases that don't get it stay identical.
  Its Play level roll goes last in `PLAY_ROLLED`. The golden snapshot test
  fails on any other change; regenerate the snapshot only on purpose, in the
  same commit as the storage prefix bump.
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
  every wrong-guess path. **Clues per puzzle** (`ref.perPuzzle`, a starting
  option; absent = 3, the original rounds, which `tryRound` builds and must
  not change): at 2 a round also offers the case board, at 1 the board and
  tarot (`ROUND_PUZZLES`), with one more to play per extra puzzle
  (`roundBudget`). These rounds (`wideRound`, own seed text `-per<n>`) fix
  their games (no stand-ins, `Layout.picked`), and no puzzle settles it
  alone: every guest the puzzles must rule out is ruled out, alone with the
  free clues, by clues in `offered - budget + 1` different puzzles.
- **Play cases** (Quick play, `buildPlayCase`, seed `play-<code>`): the bare
  code rolls everything (`playLevels`, its own seed; a new game's roll goes
  last so earlier rolls stay the same; the crossword's roll sets its grid size,
  the wordle has none). A case draws 3 to 5 games (more only when its clues
  need the room; `PLAY_GAMES_MIN/MAX`), each with its own `level`, and
  `playShares` splits the clues by level (easy 1 : medium 2 : hard 3, the
  leftovers to random games); no free clues, the scene is given (`sceneGiven`), and the
  word games are clue games: each blanks one room-naming clue (`Clue.blank`),
  scene-room clues first, and hides an object of that room. A game that can't take its share is swapped
  for the next one drawn. Changing how Play cases are built changes saved
  ones: bump `PLAY_VERSION` in `src/game/storage.ts`. Other modes never set `perGame`, `level`,
  `blank` or `sceneGiven`, so their cases are unchanged.
  **Picked cases** ("Choose games"; `PlayRef.games`, code `K7QF2+WCK`: the
  Play code, then one fixed letter per game in `PICK_ORDER`, at least 3): the
  code rolls the levels exactly like a Play case, so what she saw is what she
  plays. `caseFor` tries seed texts `pick-<code>-<letters>`, then `-1`, `-2`,
  ... (30) and returns the first that builds; never retry with another code.
  Her games are kept (any failure of one throws, so the next suffix is tried);
  only when the clues need more games (`atLeast`) are extras added from the
  seeded draw, and extras may be swapped or dropped. Tarot is a real chosen
  game here (`tarotPairsAt` for its own slot, `Layout.picked`), never the
  random stand-in, which only plain Play cases use.
  **Nosing around** (`NOSING_SHARE` 0.2, `nosingSlot`, seed `<seed>-nosing-game`)
  stands in for a Play game after tarot's stand-in, never on the board's or
  tarot's slot, only when that slot holds 3 or more clues and its board builds;
  a picked nosing (letter `N`) only needs 1 or more clues (`nosingFits` `minShare`
  3 for the stand-in, 1 picked) and a board that builds, else the suffix fails. Its level roll is last in `PLAY_ROLLED`. Not in presets, campaigns or
  wide rounds.
- **A case name is its code in words** ("The Black Dahlia Scandal at
  Ashcombe": the code's number as a descriptor, a cat or flower word and a
  place, then the kind word for its levels), so either replays the case
  (`caseName`, `parseCase`). Never change, reorder or add to the lists in
  `src/content/caseNames.ts`: that renames every case (a test pins one).
  Names never use theme words (tested).
- **Character sets** (`sets.ts`, talk): built from the talk content and a seed, never from a `Case`, so
  nothing in them can depend on the killer, and on their own stream so cases never change. In a campaign
  they are seeded from the campaign and built over the whole cast (victims included), so a guest sounds
  the same every round; only their mood moves, rolled per guest from the campaign seed and round number.
  Talk content lives in `src/content/talk.ts`, outside `Content`: the golden hash covers the whole
  `Case`, so never add talk fields to `Case` or `Content`.
- **Golden snapshot** (`golden.ts`, `golden.json`): hashes of 77 fixed cases
  across presets, campaign rounds, Play and Quick. If `golden.test.ts` fails on
  an unintended change, fix the code. If the change is intended (say, a
  content change), run `npm run update-golden`, and bump the storage prefix in
  `src/game/storage.ts` when saved progress would break.
