# Brain Training

Brain-training games for one player (the owner's wife) plus a murder-mystery
campaign: each minigame she wins unlocks a clue, and she solves the case on a
floor-plan map and logic grids. Played mostly on her phone.

Plan, design decisions and status: the "Murder Mystery Mode — Build Plan" doc
(owner has the link) and the README (setup, layout, how a case is made).
Folder rules live next to the code: `src/engine/CLAUDE.md` (case generation),
`src/games/CLAUDE.md` (minigame puzzles), `src/game/CLAUDE.md` (casebook UI).

## Rules that apply everywhere

- **Puzzle first, clue as reward.** Every minigame is a complete puzzle on its
  own. Its answer is never a room, suspect or weapon name (there are so few
  she could guess). Winning reveals the clue.
- **She can never get stuck.** Every minigame has a Solve button with an
  in-app "Are you sure? This can't be undone" (`Dialog`, never
  `window.confirm`); it reveals the answer and still unlocks the clues. Record
  it as `revealed`, not `won`.
- **Hints come from the house cat** (`cats` in `src/content/`, picked by case
  number; kept out of `Content` so they never change puzzle words). The copy
  says what the cat did.
- **Every clue is true**, and a witness never vouches for themselves.
- **Content is data.** Names, rooms, objects, items and room colours live
  only in `src/content/`; code never refers to them by name. The theme is
  still placeholder.
- **Same ref = same case.** Each mode seeds from its own text (`case-6-easy`,
  `quick-K7QF2-medium`; `src/engine/caseRef.ts`). Puzzles are rebuilt from
  seeds; only her moves are saved. All engine randomness goes through the
  seeded `Rng`, never `Math.random()` (the UI picks new codes with `crypto`).
- **Don't change existing cases by accident.** A refactor must keep the
  presets and campaigns producing the same cases (dump some before and after
  and diff). A content change may change them, with a storage prefix bump in
  `src/game/storage.ts`.

## Design

- Target device: Samsung Galaxy S26, **360 × 780 CSS px**, portrait. Check
  every screen at 360px wide with no sideways scroll; touch targets ≥ 44px.
- Look: a card table in the manor library. Green baize, ivory cards, brass
  suspect counters, red-pencil crosses, serif headings. The floor plan is the
  one bold element; keep everything else quiet. Colours and type are CSS
  variables at the top of `src/styles.css`.
- Write UI copy in plain sentence case, from her point of view.

## Working on it

- Stack: React 19 + TypeScript + Vite, PWA via vite-plugin-pwa. No backend;
  progress is saved in localStorage (`src/game/storage.ts`, always guarded).
- Keep logic in plain TS (`src/engine/`, `src/games/`, `src/game/*.ts`) with
  node tests next to it; React components stay thin. Tests run with Node's
  type stripping, so that TS must be erasable syntax only.
- Checks before committing: `npm test`, `npm run check-cases`, `npm run build`.
  The owner's machine (Windows) has Node 20: run scripts as
  `npx -y node@22 <script>`.
- Cloud sessions can't reach the npm registry: add new dependencies on the
  owner's machine or via CI. Without `node_modules`, at least run the global
  `tsc` over the non-React files with `--strict --noUnusedLocals
  --noUnusedParameters`; CI catches the rest.
- Pushing to `main` runs tests, the case check and the build, then deploys to
  https://ptra243.github.io/brain-training/. `#dev` opens the case inspector,
  which can also load and play a case code.
- Add a rule here (or in the folder's CLAUDE.md) whenever a decision changes
  how code should be written. Keep status in the README, not here.
