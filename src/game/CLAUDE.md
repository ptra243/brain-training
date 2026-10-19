# Casebook UI

- **Adding a minigame**: give it a kind and spec in `src/engine/types.ts`
  and its role in `src/engine/gameKinds.ts`, then an entry in
  `games/registry.tsx` (name, how its puzzle is built, its screen).
  `GameScreen` and `CluesPanel` read everything from the registry; don't
  switch on the kind of game anywhere else. Use `isSceneGame` /
  `isInterrogation` to narrow a `GameSpec`, not optional fields.

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
  chooser, and the finale counts them as done once one is.
- **Word games type with the phone's keyboard** through `TypingInput` (one
  hidden input; tapping the board focuses it). No on-screen keyboards.
  Buttons beside a focused board use `onPointerDown={(e) =>
  e.preventDefault()}` so the keyboard stays up. Autofocus only with a fine
  pointer.
- **Touch.** Test with real touch events (CDP `Input.dispatchTouchEvent`): a
  tap sends a late `click` that can land on whatever it just opened. All
  pop-ups go through `Dialog`, which handles this; don't build another.
- **Map**: a short tap on a counter or weapon opens its clues; dragging moves
  it. Keep the tray of unplaced pieces right under the map so every drag fits
  on one phone screen.
- **Case board UI** lives in `board/` (`CaseBoard`, pure rules in `boardSave.ts`). Pair rules (touching, apart, a guest's pieces in one place) never refuse a drop: the pieces get a red outline and a note, so one wrong piece can't lock another out. A piece's own rules (rooms ruled out) and pinned partners do refuse. The end board (`EndBoardPanel`, a Jigsaw tab when she picks "Final puzzle: Jigsaw", `ref.endBoard`) is rebuilt whenever she finds a clue; her moves are kept per set of clues (`Progress.endBoard`).
- **Saves**: only one Quick start case and one campaign are saved at a time.
