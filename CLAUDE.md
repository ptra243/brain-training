# Brain Training

Brain-training games for one player (the owner's wife) plus a murder-mystery
campaign: each minigame she wins unlocks a clue, and she solves the case on a
floor-plan map and logic grids. Played mostly on her phone.

Plan, design decisions and status: the "Murder Mystery Mode — What's Left" doc
(https://claude.ai/code/artifact/0af63967-9517-43d8-89a2-6c09dd2e2a71), the
"Questioning variants — Build Plan" doc
(https://claude.ai/code/artifact/d133c2ba-5666-435a-a751-3a388c6c3fa2), the
"Grid cases — Build Plan" doc for the Murdoku-style mode
(https://claude.ai/artifact/Vkrc5ipo8cJ91ofWiUbmAj; read all three with the
Claude Docs reader, not WebFetch) and the README (setup, layout,
how a case is made). The original "Murder Mystery Mode — Build Plan"
(https://claude.ai/code/artifact/d0571578-5078-425b-8c62-56b3b55a1326) is
history and about 16k tokens: read one section with a search, never whole.
Folder rules live next to the code: `src/engine/CLAUDE.md` (case generation),
`src/games/CLAUDE.md` (minigame puzzles), `src/game/CLAUDE.md` (casebook UI),
`e2e/CLAUDE.md` (Playwright tests).

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
- Checks before committing: `npm run checks` runs these in parallel, one
  pass/fail line each (`-- --full` for the full case check): `npm run lint`
  (ESLint with the React Compiler hooks rules: no ref writes during render,
  use `useEffectEvent` for "latest handler" listeners; an `eslint-disable`
  needs a reason beside it), `npm test` (includes the golden case snapshot),
  `npm run check-cases` (the quick run), `npm run build`. While fixing one
  failure, re-run just that check.
  For UI changes also run `npm run e2e` (Playwright: layout rules and main flows at phone size).
- **Seed sweeps go in `check-cases`, not `npm test`.** A node test checks a
  few fixed seeds per level and stays under ~5 s alone. Checks over many seeds
  (bots, "rare" or "sometimes" rates) live in a `*Sweeps.ts` helper next to
  the code, called from `scripts/check-cases.ts`: quick samples seeds the test
  doesn't use, `--full` runs them all. Its closing "Time by section" and
  "Time by work" lines show where a slow run goes.
- **`check-cases:full` runs once, in the main session**, after generator
  changes (CI runs it too). Delegated pieces run only the quick check. Once
  they're all back, start the full run in the background and review, write
  docs and draft the commit message meanwhile. If it fails, fix generator
  failures here (this session has the context); delegate only a failure
  with an obvious cause (a test expectation, a check-script bug).
- **Don't re-run what a hand-back already passed.** When the implementer
  reports `npm run checks` passing after its last edit, re-run only what
  your own later edits could affect: docs need nothing, engine code needs
  `npm test` and `check-cases`.
- **Design questions: read the code first, then ask once with a proposal.**
  Make the recommended option concrete (the numbers, a table of what each
  setting does, what stays unchanged), with the alternatives beside it, so
  one round of questions settles the design.
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
  test); it starts with no context. Claude Code reads `model: sonnet` from
  `.claude/agents/implementer.md`; leave that line as it is. In Cursor, pass
  one of the following on the sub-session instead of inheriting this chat:
  Composer 2.5 for a mechanical brief (CSS, copy, content lists, test
  updates), or Grok 4.7 with Fast off when the brief touches the generator,
  seeds, or saves. Any change to more than two code files
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
- **Keep briefs small.** One layer per brief (engine and checks, then UI and
  e2e on a finished engine). Ask for reports of about 8 lines (detail goes in the handoff file). Brief tuning
  as one sweep with a results table (every setting combination), not one
  setting per round. A follow-up goes to a fresh agent with its own brief;
  don't resume an agent past about 100k tokens or pile new work onto one
  that's running.
- **Hand over what you already know in a handoff file.** Before briefing,
  write `.claude/handoff/<task-slug>.md` (gitignored) and give its absolute
  path in the brief, so an agent in a worktree can read it too. Put in it
  what the agent would otherwise redo: measurements with the command, the
  commit or working-tree state and the numbers (baselines, timings, "Time by
  section" lines), what was tried and ruled out and why, decisions taken, and
  `file:line` pointers. Say in the brief which numbers to trust rather than
  re-measure. The agent appends its own findings, so a follow-up agent reads
  one file instead of a chat history. It also adds "Review notes" (what each
  file's change is for, the risky spots as `file:line`, departures from the
  brief, what the tests miss, whether cases changed); its reply stays to
  status and the path. For mechanical pieces (CSS, copy, content lists,
  test updates after a rule change) say "no review notes" in the brief. Read
  the notes only when reviewing logic, then review from them and the diff of
  the spots they name, not by re-reading every changed file. Delete the file
  once the task is committed.
- **Split once the design is settled and the first piece lands.** Before
  briefing the rest, suggest starting a session for it that reads the plan
  doc, delegates to implementers itself and commits; this session keeps only
  the design.
- Keep design decisions, ambiguous bugs and cross-cutting refactors in the
  main session.
- Keep command output small: run tests, builds and `check-cases` quietly
  (`2>&1 | tail -20`, or a pass/fail count) and only re-run with full output
  when something fails. Never dump a whole file or log into context to look
  at one part; use Grep or Read with offset and limit.
- Run layout rules and flows with `npm run e2e`. Run look checks through the `browser-check` agent and ask
  for a short pass/fail report, so screenshots stay out of the main context.
- **Short path to a screen.** Looking: open `#dev/<id>` when `src/dev/CLAUDE.md` lists a preview, and give `browser-check` that URL only. Playing, or proving one click: load a save built on that run that lands on the screen, or one real action before the click. Do not solve puzzles, walk rooms, or play earlier rounds to get there. The click being proved still goes through the real UI. See `e2e/CLAUDE.md`.
- After each commit, or when context is large, suggest starting a new session.
  Also suggest it when the topic changes (say, from one minigame's rules to
  theme content). Suggest only; don't write handoff files or split unasked.
  The suggestion names the handoff documents worth writing (file name and
  what goes in each; skip what's already in the repo) and the sessions to
  start (what each does, which docs it reads first, a one-line starting
  prompt). A `UserPromptSubmit` hook (`.claude/hooks/session-length.mjs`)
  adds a reminder when the transcript passes 1 MB; it is a reminder, not
  a rule that replaces judging topic drift.
  Session ideas worth starting fresh live in `docs/next-sessions.md`, each
  with a `Last touched` date and a starting prompt; a `SessionStart` hook
  (`stale-sessions.mjs`) shows them as a numbered menu on a fresh session
  ("start 3" runs that entry's starting prompt) and flags entries untouched
  for 14 days. Keep each heading short: it is the menu line. When they pick
  one, by number or name or through /next, rename this session to that
  heading before starting the work. In Cursor call rename_chat
  (cursor-app-control); in the desktop app call set_session_title. The owner
  asked for this so several open sessions stay distinguishable. When you
  suggest a split, offer to add or refresh the entry.
