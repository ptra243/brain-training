# Code review follow-ups

From a whole-codebase review on 2026-10-21. Already done since: lockfile and `npm ci`, ESLint with the
React Compiler hooks rules, cases built in a web worker, Playwright e2e tests (free port per run).
What's left is below, grouped as in `docs/next-sessions.md`. Delete an item once it's done.

Decided: no React Compiler. Measured 2026-10-21 on a scripted touch drag over the case board: no
gain (render time about the same or slightly worse), and a CPU profile showed the board's own logic
is tiny; nearly all render time in dev is React's dev-only `jsxDEV`. Revisit only if a production
profile on her phone shows a drag stutters.

## 3. Small performance and bundle wins

- Class names are long template strings (e.g. `MapPanel.tsx` counters and weapons). `clsx` (0.2 KB)
  would tidy them. Optional.

## 5. Property tests for the engine (exploratory)

- `npm run check-cases` already sweeps fixed seeds. `fast-check` would generate seeds and settings
  and shrink a failure to the smallest example. Candidates: every clue is true, exactly one
  solution, a witness never vouches for themselves, same ref = same case.
- Keep it opt-in or capped so `npm test` stays around 15 s.
