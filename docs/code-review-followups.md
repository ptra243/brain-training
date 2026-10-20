# Code review follow-ups

From a whole-codebase review on 2026-10-21. Already done since: lockfile and `npm ci`, ESLint with the
React Compiler hooks rules, cases built in a web worker, Playwright e2e tests (free port per run).
What's left is below, grouped as in `docs/next-sessions.md`. Delete an item once it's done.

## 1. Sudoku touch targets (small)

- The sudoku number pad buttons are about 41×48 px and "Clear square" 43×48 px at 360 px wide: under the 44 px rule.
- e2e catches it: `e2e/games.spec.ts`, "game screens fit the phone", marked `test.fail(seed === 10, …)`.
  Fix the CSS (`src/styles.css`, sudoku pad), then remove that `test.fail` line; Playwright fails a
  test that is marked to fail but passes.

## 2. Board UI: split CaseBoard and share dragging with the map

- `src/game/board/CaseBoard.tsx` is about 900 lines with 11 `useState`s and about 10 refs: drag
  handling, toasts, undo, hints and drawing in one component.
  - Move pointer drag (window listeners, ghost position, turn while held, wheel/`R` to turn) into a
    `useBoardDrag` hook. The listeners already use `useEffectEvent` after the lint pass.
  - Put undo stack, toast and flagged pieces in one `useReducer`.
  - `occupancy`, `clashes`, `unmetTouches` and `metSyms` are recomputed on every render, including
    while dragging. Memoise on `(rules, viewSave)` or let the React Compiler do it (below).
- `src/game/MapPanel.tsx` (about 450 lines) has its own drag code. A shared pointer-drag hook for
  "press, move past a threshold, drop on a target, short tap = select" would serve both.
- Consider the React Compiler (`babel-plugin-react-compiler` via `@vitejs/plugin-react`'s babel option).
  The lint rules it needs are already on. Measure first: a drag on CaseBoard with React DevTools
  profiler, before and after.
- Behaviour must not change. The e2e map drag test (`e2e/map.spec.ts`) covers the map. Add a similar
  touch-drag test for the case board before refactoring it.

## 3. Small performance and bundle wins

- `src/game/CampaignView.tsx`, `CampaignRounds`: the `allowed` `useMemo` depends on `save`, which
  changes on every move, so `stillPossible` reruns on every tap when "only possible killers" is on.
  Depend on the clues she has found (or the round's unlocked clue ids) instead.
- `src/main.tsx` imports `CaseInspector` (the `#dev` page) eagerly, so it ships in the main bundle.
  Load it with `React.lazy` only on `#dev`.
- `public/words.txt` is 1.3 MB and the PWA downloads it into the offline cache on install. Check
  which word lengths the games accept (`src/games/dictionary.ts`, `scripts/build-words.ts`) and
  drop the rest.
- Class names are long template strings (e.g. `MapPanel.tsx` counters and weapons). `clsx` (0.2 KB)
  would tidy them. Optional.

## 4. Validate saved data

- `src/game/storage.ts` and the game registry cast saved data (`a.saved as WordleData`) instead of
  checking it. Today a malformed save crashes into the error boundary, which clears everything.
- Add small schemas (Valibot, about 1–2 KB, or hand-written guards) for `QuickSave`, `CampaignSave`
  and each game's data in `src/game/games/saveData.ts`. A bad game record should reset just that
  game; a bad progress field should fall back to `emptyProgress()` for that field.
- No storage prefix bump needed: valid saves stay valid.

## 5. Property tests for the engine (exploratory)

- `npm run check-cases` already sweeps fixed seeds. `fast-check` would generate seeds and settings
  and shrink a failure to the smallest example. Candidates: every clue is true, exactly one
  solution, a witness never vouches for themselves, same ref = same case.
- Keep it opt-in or capped so `npm test` stays around 15 s.
