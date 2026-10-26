# Casebook UI

- **Adding a minigame**: give it a kind and spec in `src/engine/types.ts`
  and its role in `src/engine/gameKinds.ts`, then an entry in
  `games/registry.tsx` (name, how its puzzle is built, its screen).
  `GameScreen` and `CluesPanel` read everything from the registry; don't
  switch on the kind of game anywhere else. Use `isSceneGame` /
  `isInterrogation` to narrow a `GameSpec`, not optional fields.

- **Game styles go in a CSS module.** A game's own styles live in
  `<Game>.module.css` next to its component and are used as `styles.x`, so a
  class in one game can't restyle another (the dog fight's `.tarot-card svg`
  once shrank every Tarot card). Shared pieces stay global in `styles.css`:
  colour and type variables, buttons, hint notes, `Dialog`, layout, and
  classes two games use (`.grid-*`, `.number-grid`). To style a global class
  from a module, write `:global(.x)` inside a rule scoped by a local class.
  e2e can't use scoped names: give the element a `data-testid` or find it by
  role or label. Older games still in `styles.css` move over one at a time.
- **Names follow the dinner.** `suspectName(id, c.guests)` and
  `suspectInitials(id, c.guests)` (`names.ts`, via `guestName`). A lone heir is
  "The Heir" when the other heir is not in `c.guests`; the victim counts as
  present. Clue sentences are already worded by the engine. Above the opening,
  one line names the body: "The Financier was found dead after dinner." A later
  campaign round says "later that night" instead.
- **Map and grid share one source of truth** (`state.ts`): a counter is in a
  room exactly when its suspect×room cell is ticked; a weapon is in a room
  when item×room is ticked and held when suspect×item is ticked (a held
  weapon follows its holder). Ticking a suspect's room and weapon also ticks
  that weapon in that room. Change `state.ts`, not the panels.
- **The grid is one staircase**: suspects (as their counters) then weapons
  down the side, rooms | weapons across, bottom-right corner empty. Keep the
  weapons×rooms block: item-room clues have nowhere else to go. At 5 suspects
  cells are ~27px wide (40px tall), the one accepted exception to the 44px
  rule. With 7 guests a tick only rules out its row in rooms;
  who holds which weapon stays one per row and column (`oneTickPerColumn`).
- **Number grid hand cards**: the dog fight passes `oneHand` (signs then numbers in one wrapping row). Its cards are 37px wide, the one other accepted exception to the 44px rule (owner approved); the grid slots stay 44px.
- **Clues stay reachable while working**: Map and Grid have a clue drawer
  above the tab bar (`ClueDrawer`). Every grid label is a button that filters
  the drawer to the clues naming it (`mentions`).
- **Map and grid hints** (`gridHints.ts`) only use clues she has found. The
  cat circles wrong marks, then paws at the next square her clues settle,
  then shows why (the clue in the drawer, or "your marks"). It fills a square
  only once she has every clue in the case (before that, asking again repeats
  the pointer); when nothing more is settled it
  sends her to another puzzle. State is `Progress.gridHints`.
- **Accusations are who + weapon.** The room is always the scene. She can
  accuse from the map: the one person in the scene room and their weapon.
- **Scene word games** show as one row in the casebook; she picks one from a
  chooser, and the finale counts them as done once one is. In Play cases
  (`c.sceneGiven`) they are separate clue games like the rest, picked from
  Get a clue (`GetClue.tsx`); the scene is given from the start, each word
  game shows its half-heard clue (`Clue.blank.teaser`) and the finale opens
  when every other game is done.
- **Campaign rounds are explored** (`docs/exploration-mode.md`): `CampaignRounds`
  hands the casebook copies of the rounds with `explore: true` (a UI flag the
  engine never sets, so cases are unchanged). It makes `sceneUnlocked` true, so
  the scene is known and the scene word games are not offered. `explore.ts` has
  the pure parts (`roomContents`, the clock, `canOpen`); `ExploreMap` replaces
  `MapPanel` in these rounds (Map is the first tab, no clue drawer or cat hint);
  `Progress.at` is the room she is in. People show on the explore map in rooms she has
  entered (`Progress.seen`, the scene from the start); tap one in the room to talk, or from another
  room for the clues she has. The talk dialog is her portrait on the left, theirs on the right, with
  Talk, Minigame and Clues. Guests, objects and flavour lines are
  seeded from `c.seed`, never the truth. At midnight (`atMidnight`) the Accuse
  tab opens once and the map and puzzles are frozen. Quick play keeps `MapPanel`.
  The talk section is shared (`TalkSection`) by `SuspectSheet` and the person screen.
  A wrong person plays `NextMurderScene` (a `Dialog` with `placement="scene"`); the escaped ending stays a dialog.
- **Word games type with the phone's keyboard** through `TypingInput` (one
  hidden input; tapping the board focuses it). No on-screen keyboards.
  Buttons beside a focused board use `onPointerDown={(e) =>
  e.preventDefault()}` so the keyboard stays up. Autofocus only with a fine
  pointer.
- **Touch.** Test with real touch events (CDP `Input.dispatchTouchEvent`): a
  tap sends a late `click` that can land on whatever it just opened. All
  pop-ups go through `Dialog`, which handles this; don't build another.
- **Dragging goes through `usePointerDrag`** (`src/game/usePointerDrag.ts`):
  window listeners (no pointer capture), an 8 px threshold, short tap vs
  drop, a second finger never starts a second drag, and the ghost is moved
  through its ref with no React state per move. Set state only when what's
  under the finger changes. The case board's extras (turning, hover tips)
  live in `board/useBoardDrag.ts`; board UI state (undo, toast, flags) is
  the pure reducer in `board/boardUi.ts`. No React Compiler (measured, no
  gain; see `docs/code-review-followups.md`).
- **Map**: a short tap on a counter or weapon opens its clues; dragging moves
  it. Keep the tray of unplaced pieces right under the map so every drag fits
  on one phone screen.
- **Case board UI** lives in `board/` (`CaseBoard`, pure rules in `boardSave.ts`). Pair rules (touching, apart, a guest's pieces in one place) never refuse a drop: the pieces get a red outline and a note, so one wrong piece can't lock another out. A piece's own rules (rooms ruled out) and pinned partners do refuse. The end board (`EndBoardPanel`, a Jigsaw tab that replaces the Grid tab when she picks "Final puzzle: Jigsaw", `ref.endBoard`; Play cases always show Map, Grid and Jigsaw) is rebuilt whenever she finds a clue; her moves are kept per set of clues (`Progress.endBoard`).
- **Saves**: only one Quick case (a Play case, or an old Quick start one) and
  one campaign are saved at a time; a new Play case replaces the saved one.
  Saved data is checked, never cast (`saveGuards.ts`): a bad field falls back
  on its own, a bad game record resets that game, and a game's bad data goes
  through `savedOr` in the registry (start over, or its answer if finished). A
  new game or saved field needs its guard and a malformed-save test.
  A `history` key (same prefix) keeps finished runs: 30 rows each for Quick and campaign plus
  running totals (`history.ts`, `sanitizeHistory`). A finished save gets a `historyId` and its
  row is recorded once (`recordQuick` / `recordCampaign`, from `App.tsx`). `clearSaves` leaves it.
- **Cases are built in a worker.** UI code never calls `caseFor`,
  `newPlayCase`, `newPickCase`, `newQuickCase` or `roundCase` directly: add a
  job to `caseJobs.ts` and `await generate(job)` (`caseClient.ts`) behind the
  `Shuffling` overlay. The client falls back to building on the main thread
  when workers fail; tests call the engine (or `runCaseJob`) directly. Board
  rebuilds (`endBoard`, `boardPuzzle`) stay on the main thread (≤60 ms on a PC).
- **Campaign opening** (`docs/campaign-opening.md`): round 1 starts on `OpeningScene` (shown by
  `CampaignView` while `Progress.opening` exists and isn't done). She talks to each guest once and the
  cat shows the rest; the free clues arrive by who speaks them (`openingScript`), and Skip hands over
  all of them. State is `Progress.opening`; a save without it goes straight to the casebook. The body
  can lie in another room (`bodyRoom`, about 1 in 4); accusations and the end board still use the
  scene room. `openingSweeps.ts` checks it in `check-cases`.
