# Brain Training

Brain-training games for one player (the owner's wife) plus a murder-mystery
campaign: each minigame she wins unlocks a clue, and she solves the case on a
floor-plan map and logic grids. Played mostly on her phone.

Plan, design decisions and status live in three Claude Docs: "Murder Mystery
Mode — What's Left" (https://claude.ai/code/artifact/0af63967-9517-43d8-89a2-6c09dd2e2a71),
"Questioning variants — Build Plan"
(https://claude.ai/code/artifact/d133c2ba-5666-435a-a751-3a388c6c3fa2) and
"Grid cases — Build Plan" (https://claude.ai/artifact/Vkrc5ipo8cJ91ofWiUbmAj).
Read them with the Claude Docs reader, not WebFetch; how to edit them is in
`docs/plan-docs.md`. The README covers setup, layout and how a case is made.

Folder rules live next to the code: `src/engine/CLAUDE.md` (case generation),
`src/games/CLAUDE.md` (minigame puzzles), `src/game/CLAUDE.md` (casebook UI),
`src/dev/CLAUDE.md` (dev previews and scenarios), `e2e/CLAUDE.md` (Playwright).

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
  the dinner party with a hidden tarot layer (`docs/theme-draft.md`): 10
  guests, each case seats some and one more is the victim.
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
- Before committing, run `npm run checks` (parallel, one pass/fail line each;
  `-- --full` for the full case check): `npm run lint` (React Compiler hooks
  rules: no ref writes during render, `useEffectEvent` for "latest handler"
  listeners; an `eslint-disable` needs a reason beside it), `npm test`
  (includes the golden snapshot), `npm run check-cases`, `npm run build`.
  Re-run just the failing check while fixing. For UI changes also run
  `npm run e2e`. Generator changes: see `src/engine/CLAUDE.md`.
- Design questions: read the code first, then ask once with a concrete
  proposal (the numbers, a table of what each setting does, what stays
  unchanged) and the alternatives beside it.
- Needs Node 22.18 or newer (the owner has 24): run scripts directly, e.g.
  `node scripts/check-cases.ts`. Python isn't installed. Edit with the Edit
  tool; for bulk edits, or any script longer than a line, write a Node script
  to the scratchpad and run it (never `node -e` or a heredoc: `$`, backticks
  and apostrophes break the quoting).
- `git add -p` and other interactive commands don't work here. To commit only
  some of a file's changes, ask the owner or commit the whole file.
- The repo is in OneDrive, which can touch files mid-session: if Edit says the
  file changed since it was read, re-read it once; if the dev server misses an
  edit, reload it.
- Pushing to `main` runs tests, the case check and the build, then deploys to
  https://ptra243.github.io/brain-training/. Check with `gh run list --limit 1`
  (then `gh run watch <id> --exit-status` in the background). `#dev` lists the
  dev pages; `#dev/cases` is the case inspector and can load and play a code.
- Cloud sessions can't reach the npm registry: add new dependencies on the
  owner's machine or via CI. Without `node_modules`, at least run the global
  `tsc` over the non-React files with `--strict --noUnusedLocals
  --noUnusedParameters`.
- Add a rule here (or in the folder's CLAUDE.md) whenever a decision changes
  how code should be written. Keep status in the README, not here.

## Token budget

Long sessions re-read their whole context every turn, so keep them short.
Details, with the reasons, are in `docs/workflow.md`: read it before briefing
an agent or proposing a split.

- **Delegate.** Once the design is settled, list the pieces and hand each
  well-defined one to the `implementer` agent (Sonnet, never `general`) with a
  full brief. Anything touching more than two code files, anything you can
  describe in a few sentences, and any bug fix with a known cause goes to it.
  A change the owner asks for directly in chat counts too, not only
  next-sessions entries. Edit directly only for one-line tweaks, docs, or while
  working out the design. Before the first code edit, say in one line what you
  delegate and what you keep, and why.
- **Write a handoff file first** (`.claude/handoff/<task-slug>.md`,
  gitignored) with what the agent would otherwise redo; give its absolute path
  in the brief. A brief of about 15 lines with nothing measured to pass on can
  go straight in the prompt instead.
- **Keep output small:** run checks quietly (`2>&1 | tail -20`), and read part
  of a file with Grep or Read offset and limit, never the whole thing.
- **Looking at a screen:** open `#dev/<id>` when `src/dev/CLAUDE.md` lists a
  preview and give `browser-check` that URL only; to play from a state open
  `#dev/load/<id>`. Never solve puzzles or play earlier rounds to get there.
  When a task adds or changes a screen or state, add or update its preview or
  scenario.
- **Suggest a new session** after each commit, when context is large, or when
  the topic changes. Suggest only; don't write handoff files or split unasked.
  Ideas worth starting fresh live in `docs/next-sessions.md`; the
  `SessionStart` hook shows them as a menu.
