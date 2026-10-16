# Brain Training

Brain-training games for one player (the owner's wife) plus a murder-mystery
campaign: each minigame she wins unlocks a clue, and she solves the case on a
floor-plan map and logic grids. Played mostly on her phone.

Plan and design decisions: the "Murder Mystery Mode — Build Plan" doc (owner
has the link). README has setup, layout and how a case is generated.

## Status

Phases 1–4 done (content, generator/solver, casebook UI, minigames), plus
testimony/evidence clues, sudoku map coordinates and weapons on the map.
Next: phase 5 (modes, campaign progression), playtesting, and the
interrogation minigame ("Catch the lie", see the plan's minigame ideas).
Known gaps: Wordle accepts any 5 letters (no dictionary yet: needs a word
list package added from the owner's machine); cat puzzles are unique but not
checked for how much look-ahead they need.

## Rules that are easy to break

- **Puzzle first, clue as reward.** Every minigame is a complete puzzle on its
  own. Its answer is never a room, suspect or weapon name, because the case
  has so few of those that she could guess. Winning reveals the clue.
- **She can never get stuck.** Every minigame has a "Solve puzzle" button
  that asks "Are you sure? This can't be undone" (an in-app dialog, not
  `window.confirm`), then reveals the answer and still unlocks the clue. Record
  the game as `revealed`, not `won`, so stats can tell them apart.
- **Each case has three games**: Wordle unlocks the scene; the cat puzzle
  unlocks physical evidence ("found by the cats"); the sudoku unlocks witness
  testimony. Each sudoku statement has two marked squares whose digits are
  a row and column on the floor plan pointing at its room; it unlocks the
  moment both are right, and finishing the grid gives one more. 2–3
  testimony clues are free at the start. Every clue is true, and a witness
  never vouches for themselves. Puzzles are rebuilt from `GameSpec.seed`; only her moves are saved.
  Generate a puzzle once per game screen, never per render or per move.
- **Generated puzzles must be fair**: cat puzzles have exactly one answer and
  even-ish zones; sudoku has one answer and is solvable by singles alone.
- **Wordle answers come from room `objects`** (5-letter words). Words may
  repeat across rooms; the revealed clue names the room. Teasers must never
  show the room or the word (tested).
- **Every case must have exactly one solution** and a minimal clue set.
  Never ship a generator change without `npm run check-cases` passing.
- **Map and grid share one source of truth**: a counter is in a room exactly
  when the suspect×room cell is ticked; a weapon tag is in a room when
  item×room is ticked, and held when suspect×item is ticked (a held weapon
  follows its holder). Change `src/game/state.ts`, not the panels.
- **Accusations are who + weapon.** The room is always where the body was
  found (the Wordle), so it isn't asked. She can accuse from the map: the one
  person in the scene room and the weapon they hold.
- **Room colours and all names live in `src/content/`.** Bump the storage
  prefix in `src/game/storage.ts` when saved data stops matching the cases.
- **Content is data.** Names, rooms, objects and items live only in
  `src/content/`; code must not refer to them by name. The theme is still
  placeholder.
- **Same case number = same case.** All randomness goes through the seeded
  `Rng`; never use `Math.random()` in the engine.

## Design

- Target device: Samsung Galaxy S26, **360 × 780 CSS px**, portrait. Check
  every screen at 360px wide with no sideways scroll; touch targets ≥ 44px.
- Test interactions with real touch events (CDP `Input.dispatchTouchEvent`),
  not just mouse clicks: a touch tap sends a late `click` that can land on
  whatever the tap just opened (fixed once already in `SuspectSheet`).
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
- Tests run on Node's built-in runner with type stripping (`node --test`), so
  TS in `src/engine` and `src/game/*.ts` must be erasable syntax only.
- Cloud Claude sessions cannot reach the npm registry. New dependencies must
  be added and tested on the owner's machine (Windows) or via CI.
- Pushing to `main` runs tests, the case check and the build, then deploys to
  https://ptra243.github.io/brain-training/. `#dev` opens the case inspector.
- Update this file's Status section at the end of each phase, and add a rule
  here whenever a decision changes how code should be written.
