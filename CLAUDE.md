# Brain Training

Brain-training games for one player (the owner's wife) plus a murder-mystery
campaign: each minigame she wins unlocks a clue, and she solves the case on a
floor-plan map and logic grids. Played mostly on her phone.

Plan, design decisions and status: the "Murder Mystery Mode — What's Left" doc
(https://claude.ai/code/artifact/0af63967-9517-43d8-89a2-6c09dd2e2a71), the
"Questioning variants — Build Plan" doc
(https://claude.ai/code/artifact/d133c2ba-5666-435a-a751-3a388c6c3fa2; read
both with the Claude Docs reader, not WebFetch) and the README (setup, layout,
how a case is made). The original "Murder Mystery Mode — Build Plan"
(https://claude.ai/code/artifact/d0571578-5078-425b-8c62-56b3b55a1326) is
history and about 16k tokens: read one section with a search, never whole.
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
- Checks before committing: `npm test` (includes the golden case snapshot), `npm run check-cases`, `npm run build`.
  Needs Node 22.18 or newer (the owner's machine has Node 24): run scripts
  directly, e.g. `node scripts/check-cases.ts`.
- Python isn't installed. Edit files with the Edit tool; for scripted bulk
  edits, use a Node script in the scratchpad.
- Write any script longer than a line to a file in the scratchpad and run
  it; never inline it with `node -e "…"` or a heredoc (`$`, backticks and
  apostrophes break the shell quoting).
- `git add -p` and other interactive commands don't work here. To commit only
  some of a file's changes, ask the owner or commit the whole file.
- The repo is in OneDrive, which can touch files mid-session: if Edit says the
  file changed since it was read, re-read it once; if the dev server misses an
  edit, reload it.
- After pushing, check the deploy with `gh run list --limit 1` (then
  `gh run watch <id> --exit-status` in the background).
- Claude Docs edits (the plan docs): target a block by its id rather than
  quoting text; if a quote must be used, quote a long distinctive phrase or add
  `nth`. One paragraph per block, no newlines inside one. On a `deny`, read
  `detail` and change the call; never resend the same payload.
- Cloud sessions can't reach the npm registry: add new dependencies on the
  owner's machine or via CI. Without `node_modules`, at least run the global
  `tsc` over the non-React files with `--strict --noUnusedLocals
  --noUnusedParameters`; CI catches the rest.
- Pushing to `main` runs tests, the case check and the build, then deploys to
  https://ptra243.github.io/brain-training/. `#dev` opens the case inspector,
  which can also load and play a case code.
- Add a rule here (or in the folder's CLAUDE.md) whenever a decision changes
  how code should be written. Keep status in the README, not here.

## Token budget

Long sessions re-read their whole context every turn, so keep them short.

- **Delegating is authorised and expected, even mid-iteration.** Once the
  design decisions for a task are settled, and before writing the code, stop
  and list the pieces. Hand each well-defined piece to the `implementer`
  agent (Sonnet, never `general`) with a full brief (files, behaviour, how to
  test); it starts with no context. Any change to more than two code files
  (`.ts`, `.tsx`, `.css`, tests; not `.md`), anything you can describe in a few
  sentences, and any bug fix with a known cause goes to it. Edit directly only
  for one-line tweaks, for docs, or while you're still working out the design.
  A `PostToolUse` hook (`.claude/hooks/delegate-reminder.mjs`) reminds you
  after the 3rd distinct code file you edit yourself; it is a reminder, not a
  rule that replaces judgement. Always delegate:
  - content lists (word lists, clues, theme text) of more than ~20 entries
  - test updates after a rule change, once the new rule is decided
  - CSS and copy changes you can describe exactly
  Keep in the main session: design decisions, generator tuning that needs
  experiments, ambiguous bugs, cross-cutting refactors.
  Say in one line which pieces you're delegating and which you're keeping.
- Keep design decisions, ambiguous bugs and cross-cutting refactors in the
  main session.
- Keep command output small: run tests, builds and `check-cases` quietly
  (`2>&1 | tail -20`, or a pass/fail count) and only re-run with full output
  when something fails. Never dump a whole file or log into context to look
  at one part; use Grep or Read with offset and limit.
- Run browser and screenshot checks through the `browser-check` agent and ask
  for a short pass/fail report, so screenshots stay out of the main context.
- After each commit, or when context is large, suggest starting a new session.
  Also suggest it when the topic changes (say, from one minigame's rules to
  theme content). Suggest only; don't write handoff files or split unasked.
  The suggestion names the handoff documents worth writing (file name and
  what goes in each; skip what's already in the repo) and the sessions to
  start (what each does, which docs it reads first, a one-line starting
  prompt). A `UserPromptSubmit` hook (`.claude/hooks/session-length.mjs`)
  adds a reminder when the transcript passes 1.5 MB; it is a reminder, not
  a rule that replaces judging topic drift.
  Session ideas worth starting fresh live in `docs/next-sessions.md`, each
  with a `Last touched` date and a starting prompt; a `SessionStart` hook
  (`stale-sessions.mjs`) flags entries untouched for 14 days. When you
  suggest a split, offer to add or refresh the entry.
