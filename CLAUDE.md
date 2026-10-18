# Brain Training

Brain-training games for one player (the owner's wife) plus a murder-mystery
campaign: each minigame she wins unlocks a clue, and she solves the case on a
floor-plan map and logic grids. Played mostly on her phone.

Plan and design decisions: the "Murder Mystery Mode — Build Plan" doc (owner
has the link). README has setup, layout and how a case is generated.

## Status

Phases 1–4 done (content, generator/solver, casebook UI, minigames), plus
testimony/evidence clues, sudoku map coordinates, weapons on the map, a
Wordle word list, the staircase grid with clue drawer, interrogations
(rotating "Questioning" game and a "Final questioning" on hard cases), and
a choice of three scene word games (Wordle, mini crossword, word search)
that all type with the phone's own keyboard.
Phase 5 under way: case settings as levels, a home screen with Quick start
(one case in progress, replayable case codes), and 7-guest cases with shared
rooms (a Quick start choice), and the campaign: one long mystery over up to
3 rounds. Next: rumours and the time grid (see the build plan), and
playtesting.
Known gaps: medium and hard cat puzzles are unique but not
checked for how much look-ahead they need (easy ones are).

## Rules that are easy to break

- **Puzzle first, clue as reward.** Every minigame is a complete puzzle on its
  own. Its answer is never a room, suspect or weapon name, because the case
  has so few of those that she could guess. Winning reveals the clue.
- **She can never get stuck.** Every minigame has a "Solve puzzle" button
  that asks "Are you sure? This can't be undone" (an in-app dialog, not
  `window.confirm`), then reveals the answer and still unlocks the clue. Record
  the game as `revealed`, not `won`, so stats can tell them apart.
- **Hints come from the house cat** helping on the case (`cats` in
  `src/content/`, picked by case number; not part of `Content`, so they never
  change puzzle words). Each ask gives the next step on a gentle-to-strong
  ladder: point out wrong letters/moves (red pencil), then where to look,
  then fill in one square. The logic is a pure `…Hint()` function in
  `src/games/` with tests that following hints always reaches a win; the UI
  is `HintButton` + `HintNote` (`Hints.tsx`), the copy says what the cat did.
  Save the hint count in the game's data; a game won with hints is still
  `won`. Where the move has a reason (sudoku singles, the cat puzzle's
  simple steps), a "why" step comes before the fill, and the board lights up
  what the hint is about (paw on the square). Done: crossword, sudoku, cat
  puzzle. To do: Wordle, word search, interrogation.
  **Map and grid hints** (`src/game/gridHints.ts`, Hint button in the case
  header on those tabs) only use clues she has found, never ones still
  locked in a puzzle. The cat points the way and doesn't fill: wrong marks
  circled, then the next square her clues settle (paw on it, its room/piece
  lit on the map), then why (paw on the clue in the drawer, or "your marks").
  It fills a square only once she has every clue in the case; before that,
  asking again repeats the pointer. When nothing more is settled, it sends
  her to play another puzzle. Hint state is `Progress.gridHints`.
- **Each case has three scene word games plus one to three rotating games**
  (two at the presets) drawn from cat puzzle, sudoku and interrogation; hard logic adds a finale
  interrogation that opens once the others are done and uses her casebook
  as evidence. The scene games (Wordle, mini crossword, word search) all have
  `unlocksScene`; she picks one from a chooser and any one reveals the scene
  (the casebook shows them as one row, and the finale counts them as done
  once one is). Each hides its own word in `spec.scene` and reveals its own
  sentence (`sceneText`), always naming the scene room. The cat puzzle unlocks physical evidence ("found by the
  cats"); the sudoku and interrogations unlock testimony. Each sudoku statement has two marked squares whose digits are
  a row and column on the floor plan pointing at its room; it unlocks the
  moment both are right, and finishing the grid gives one more. 2–3
  testimony clues are free at the start. Every clue is true, and a witness
  never vouches for themselves. Puzzles are rebuilt from `GameSpec.seed`; only her moves are saved.
  Generate a puzzle once per game screen, never per render or per move.
- **Generated puzzles must be fair**: cat puzzles have exactly one answer and
  even-ish zones; sudoku has one answer and is solvable by singles alone.
  Easy cat puzzles (`GameSpec.easy`) have exactly one one-square zone, as a
  forced first move, and must pass `solvableBySimpleSteps`; other cat puzzles
  have no one-square zone.
- **Interrogations**: the suspect answers 8 possible questions truthfully
  except exactly one (the lie). She asks up to 5 (6 in the finale) and
  presents exactly `proof.length` pieces of evidence; any set that
  logically disproves the lie (checked by `disproves`) wins. Easy: one card
  disproves it; harder: only two together. Interrogation clues are the
  suspect's confession, in their voice. True answers she drew out and the
  evidence cards join her casebook when it ends; the lie never does.
  `npm run check-cases` verifies every interrogation in 300 cases.
- **Wordle answers come from room `objects`** (5-letter words). Words may
  repeat across rooms; the revealed clue names the room. Teasers must never
  show the room or the word (tested). **The crossword and word search hide a
  room `thing`** (4–9 letters, no J/X/Z). The crossword is a real
  interlocking grid (up to 7×7, across and down words crossing, no stray
  runs, tested); shaded squares numbered 1, 2, 3... spell the word, spread
  over different words, and she wins once they're right. The word search's
  leftover letters spell it, every listed word appears exactly once, and she
  can type the word early. Their fill comes from `src/content/words.ts`
  (common words with clues), never from `words.txt`, and never uses a theme
  word (`themeWords`). `npm run check-cases` builds both for all 300 cases.
- **Word games type with the phone's keyboard**, through `TypingInput` (one
  hidden input; tapping the board focuses it). Don't build on-screen
  keyboards. Buttons that sit beside a focused board use
  `onPointerDown={(e) => e.preventDefault()}` so the keyboard stays up.
  Autofocus only with a fine pointer; phones need the tap.
- **Guesses are checked against `public/words.txt`** (4–9 letters, from the
  `word-list` package via `npm run build-words`; committed, fetched on demand,
  precached for offline). It's full of obscure words: use it only to accept
  guesses, never to pick answers or set targets (that needs a common-word
  list, still to add). Until it loads, any guess is accepted. Every room
  object must be in it (tested).
- **Every case must have exactly one solution** and a minimal clue set.
  Never ship a generator change without `npm run check-cases` passing.
- **Case settings are levels** (`src/engine/settings.ts`): suspects (4, 5 or 7),
  logic, minigames and length, each a few fixed values. `caseSettings`
  turns them into generator settings and clamps anything unsafe;
  `clueShares` gives every rotating game 1 to 7 clues and hands the rest
  out free. A refactor must keep the easy, medium and hard presets producing
  the same cases (compare against the last commit); a content change may
  change them, with a storage prefix bump. `npm run check-cases` checks
  every combination of levels.
- **7 guests share 5 rooms and 5 weapons.** The killer was alone in the
  scene room holding the weapon; two guests hold nothing (`null` in
  `Solution.item`). There are too many answers to list, so these cases use
  the search in `src/engine/search.ts` (fill rooms, then holders, checking
  each clue as soon as it can be), and the generator picks room clues, then
  weapon clues, before trimming. Classic 4–5 suspect cases keep their own
  code path untouched. Shared-only clue types (together, apart, alone,
  empty-handed) never appear in classic pools. On the grid, a tick only
  rules out its row in rooms (a room can hold several people or weapons);
  who holds which weapon stays one per row and column (`oneTickPerColumn`).
- **The campaign** (`src/engine/campaign.ts`, saved play in
  `src/game/campaign.ts`): 7 guests, one killer, up to 3 rounds, each a
  body at a later time. A round is built from the campaign and the victims
  before it. A wrong person becomes the next body, and after the third the
  killer escapes; the right person with the wrong weapon costs nothing. She
  plays any `budget` of a round's 3 puzzles (easy 3, medium 2, hard 1; the
  word game is free). Before the last round, decoys keep every choice of
  puzzles at 2 or 3 possible killers (never fewer); in the last round the
  free clues settle the weapon and any one puzzle settles the killer.
  Rounds don't need exactly one solution: `roundProblems` checks this
  instead, and `npm run check-cases` walks every wrong-guess path.
- **Map and grid share one source of truth**: a counter is in a room exactly
  when the suspect×room cell is ticked; a weapon tag is in a room when
  item×room is ticked, and held when suspect×item is ticked (a held weapon
  follows its holder). Ticking a suspect's room and weapon in the grid also
  ticks that weapon in that room. Change `src/game/state.ts`, not the panels.
- **The grid is one staircase**: suspects (as their map counters) and then
  weapons down the side, rooms | weapons across, bottom-right corner empty.
  Keep the weapons×rooms block: item-room clues have nowhere else to go.
  At 5 suspects cells are ~27px wide (40px tall), the one accepted exception
  to the 44px rule, so the whole grid fits without sideways scroll.
- **Clues stay reachable while working**: the Map and Grid tabs have a clue
  drawer above the tab bar (`ClueDrawer`). Don't make her switch tabs to
  read a clue. Every grid label (suspect, room, weapon) is a button that
  filters the drawer to the clues naming it (`mentions` in `state.ts`).
- **Accusations are who + weapon.** The room is always where the body was
  found (the scene word game), so it isn't asked. She can accuse from the map: the one
  person in the scene room and the weapon they hold.
- **Room colours and all names live in `src/content/`.** Bump the storage
  prefix in `src/game/storage.ts` when saved data stops matching the cases.
- **Content is data.** Names, rooms, objects and items live only in
  `src/content/`; code must not refer to them by name. The theme is still
  placeholder.
- **Same ref = same case.** Each mode seeds from its own text (`case-6-easy`,
  `quick-K7QF2-medium`; see `src/engine/caseRef.ts`), so modes never share
  cases. A case code like `K7QF2-MN` rebuilds a Quick start case exactly;
  `#dev` can load and play one. Only one Quick start case is saved at a time.
  All randomness goes through the seeded `Rng`; never use `Math.random()` in
  the engine (the UI picks new codes with `crypto`).
- **A case name is its code in words** ("The Yellow Gazebo Scandal at
  Brockcote": the code's number in adjective, noun and place, the kind word
  for its levels), so either one replays the case (`caseName`,
  `parseCase`). Never change, reorder or add to the lists in
  `src/content/caseNames.ts`; that would rename every case (a test pins one).
  Names never use theme words (tested).

## Design

- Target device: Samsung Galaxy S26, **360 × 780 CSS px**, portrait. Check
  every screen at 360px wide with no sideways scroll; touch targets ≥ 44px.
- Test interactions with real touch events (CDP `Input.dispatchTouchEvent`),
  not just mouse clicks: a touch tap sends a late `click` that can land on
  whatever the tap just opened. All pop-ups go through `Dialog`, which
  handles this; don't build another.
- On the map, a short tap on a counter or weapon opens its clues; dragging
  moves it. Keep the tray of unplaced pieces right under the map so every
  drag starts and ends on one phone screen.
- Look: a card table in the manor library. Green baize background, ivory
  cards, brass suspect counters, red-pencil crosses, serif headings. The floor
  plan is the one bold element; keep everything else quiet.
- Colours and type are CSS variables at the top of `src/styles.css`.
- Write UI copy in plain sentence case, from her point of view.

## Working on it

- Stack: React 19 + TypeScript + Vite, PWA via vite-plugin-pwa. No backend;
  progress is saved in localStorage (`src/game/storage.ts`, always guarded).
- Keep logic in plain TS (`src/engine/`, `src/game/state.ts`) with node tests
  next to it; React components stay thin.
- Checks before committing: `npm test`, `npm run check-cases`, `npm run build`.
  In a cloud session without `node_modules`, at least run the global `tsc`
  over the non-React files (`src/engine`, `src/games`, `src/game/state.ts`)
  with `--strict --noUnusedLocals --noUnusedParameters`; CI catches the rest.
  (`@types/react` can be sparse-cloned from DefinitelyTyped on GitHub, with
  `csstype`, to type-check the components too.)
- Tests run on Node's built-in runner with type stripping (`node --test`), so
  TS in `src/engine` and `src/game/*.ts` must be erasable syntax only.
- Cloud Claude sessions cannot reach the npm registry. New dependencies must
  be added and tested on the owner's machine (Windows) or via CI. That
  machine has Node 20, so run scripts there as `npx -y node@22 <script>`.
- Pushing to `main` runs tests, the case check and the build, then deploys to
  https://ptra243.github.io/brain-training/. `#dev` opens the case inspector.
- Update this file's Status section at the end of each phase, and add a rule
  here whenever a decision changes how code should be written.
