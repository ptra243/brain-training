# Brain Training

Brain-training games for one player (the owner's wife) plus a murder-mystery
campaign: each minigame she wins unlocks a clue, and she solves the case on a
floor-plan map and logic grids. Played mostly on her phone.

Plan and design decisions: the "Murder Mystery Mode — Build Plan" doc (owner
has the link). README has setup, layout and how a case is generated.

## Status

Phases 1–3 done (content, generator/solver, casebook UI). Next: phase 4,
minigames that deliver clues. All clues are shown up front until then.

## Rules that are easy to break

- **Puzzle first, clue as reward.** Every minigame is a complete puzzle on its
  own. Its answer is never a room, suspect or weapon name, because the case
  has so few of those that she could guess. Winning reveals the clue.
- **She can never get stuck.** Every minigame has a "Solve puzzle" button
  that asks "Are you sure? This can't be undone" (an in-app dialog, not
  `window.confirm`), then reveals the answer and still unlocks the clue. Record
  the game as `revealed`, not `won`, so stats can tell them apart.
- **Wordle answers come from room `objects`** (5-letter words). Words may
  repeat across rooms; the revealed clue names the room. Teasers must never
  show the room or the word (tested).
- **Every case must have exactly one solution** and a minimal clue set.
  Never ship a generator change without `npm run check-cases` passing.
- **Map and grid share one source of truth**: a counter is in a room exactly
  when the suspect×room cell is ticked. Change `src/game/state.ts`, not the
  panels, to change that behaviour.
- **Content is data.** Names, rooms, objects and items live only in
  `src/content/`; code must not refer to them by name. The theme is still
  placeholder.
- **Same case number = same case.** All randomness goes through the seeded
  `Rng`; never use `Math.random()` in the engine.

## Design

- Target device: Samsung Galaxy S26, **360 × 780 CSS px**, portrait. Check
  every screen at 360px wide with no sideways scroll; touch targets ≥ 44px.
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
