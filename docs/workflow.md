# Workflow: delegating, briefs, handoffs, session length

Read this before briefing an agent or when proposing a session split. The
root `CLAUDE.md` keeps only the one-line rules.

Long sessions re-read their whole context every turn, so keep them short.

## Delegating

- Delegating is authorised and expected, even mid-iteration. Once the design
  decisions for a task are settled, and before writing the code, stop and list
  the pieces. Hand each well-defined piece to the `implementer` agent (Sonnet,
  never `general`) with a full brief (files, behaviour, how to test); it starts
  with no context. Claude Code reads `model: sonnet` from
  `.claude/agents/implementer.md`; leave that line as it is.
- In Cursor, pass one of these on the sub-session instead of inheriting the
  chat: Composer 2.5 for a mechanical brief (CSS, copy, content lists, test
  updates), or Grok 4.7 with Fast off when the brief touches the generator,
  seeds or saves. Until the owner says the usage cycle has reset (set 27 Oct
  2026; see `.cursor/rules/cursor-models-only.mdc`), stay on those Cursor
  models. Do not pass Claude, GPT, Gemini, or any other third-party model,
  and do not inherit the chat if it is one. If the tool only lists Fast
  slugs, pass `grok-4.7-high-fast`.
- Delegate: any change to more than two code files (`.ts`, `.tsx`, `.css`,
  tests; not `.md`), anything you can describe in a few sentences, and any bug
  fix with a known cause. Always delegate content lists of more than ~20
  entries, test updates after a decided rule change, and CSS or copy changes
  you can describe exactly.
- Edit directly only for one-line tweaks, for docs, or while still working out
  the design. Keep in the main session: design decisions, generator tuning that
  needs experiments, ambiguous bugs, cross-cutting refactors.
- A change the owner asks for directly in chat counts the same as a
  next-sessions entry. Once it is clear what to build, and before the first
  code edit, say in one line which pieces you're delegating and which you're
  keeping, and why.
- A `PreToolUse` hook (`.claude/hooks/delegate-reminder.mjs`) holds back,
  once, the edit that would touch a 3rd distinct file under `src/`, `e2e/` or
  `scripts/`, and asks you to delegate or say why not; the next edit goes
  through. It stays quiet once you've briefed an implementer. Scratchpad,
  docs, mockups and handoff files don't count.

## Briefs

- One layer per brief (engine and checks, then UI and e2e on a finished
  engine). Ask for reports of about 8 lines; detail goes in the handoff file.
- Brief tuning as one sweep with a results table (every setting combination),
  not one setting per round.
- A follow-up goes to a fresh agent with its own brief. Don't resume an agent
  past about 100k tokens or pile new work onto one that's running.
- **Don't re-run what a hand-back already passed.** When the implementer
  reports `npm run checks` passing after its last edit, re-run only what your
  own later edits could affect: docs need nothing, engine code needs `npm test`
  and `check-cases`.

## Tuning is its own brief, with a stop rule

- The implementer builds the mechanism and a sweep script (a grid, not a random
  walk) that imports the real builders and bots, starts from values derived by
  rule (e.g. path length about 85% of cells; turn bounds from sampled
  percentiles), and reports a baseline.
- A tuning brief edits data only, runs the sweep once or twice, and ends with a
  results table.
- The agent first runs one row the sweep calls passing through the real path
  (`check-cases`) to prove they agree.
- A round that does not improve the headline number twice running means stop
  and write "stuck" with the rejection counts.
- After each round it appends one line to the handoff file.
  `npm run checks` decides done, not its own script.
- A "none passes" result goes to the main session as a design call, then to a
  fresh implementer, never back to the old one.
- Dated lines in "Why sessions ran long" (`docs/session-log.md`) quote minutes (per agent run, per full
  check), not only tokens.

## Handoff files

Before briefing, write `.claude/handoff/<task-slug>.md` (gitignored) and give
its absolute path in the brief, so an agent in a worktree can read it too.
Skip it when the whole brief fits in about 15 lines and there are no
measurements or ruled-out attempts to pass on: put the brief straight in the
prompt (the implementer creates the file for its review notes).

- Put in it what the agent would otherwise redo: measurements with the command,
  the commit or working-tree state and the numbers (baselines, timings, "Time
  by section" lines), what was tried and ruled out and why, decisions taken,
  and `file:line` pointers. Say in the brief which numbers to trust rather than
  re-measure.
- The agent appends its own findings, so a follow-up agent reads one file
  instead of a chat history.
- It also adds "Review notes": what each file's change is for, the risky spots
  as `file:line`, departures from the brief, what the tests miss, whether cases
  changed. Its reply stays to status and the path. For mechanical pieces (CSS,
  copy, content lists, test updates after a rule change) say "no review notes"
  in the brief.
- Read the notes only when reviewing logic, then review from them and the diff
  of the spots they name, not by re-reading every changed file.
- Delete the file once the task is committed.

## Keeping context small

- Run tests, builds and `check-cases` quietly (`2>&1 | tail -20`, or a
  pass/fail count) and re-run with full output only when something fails. Never
  dump a whole file or log into context to look at one part; use Grep or Read
  with offset and limit.
- Layout rules and flows: `npm run e2e`. Look checks: the `browser-check`
  agent, asking for a short pass/fail report so screenshots stay out of the
  main context.
- Short path to a screen: see `src/dev/CLAUDE.md` and `e2e/CLAUDE.md`.

## Splitting and new sessions

- **Split once the design is settled and the first piece lands.** Before
  briefing the rest, suggest starting a session for it that reads the plan
  doc, delegates to implementers itself and commits; the current session keeps
  only the design.
- After each commit, when context is large, or when the topic changes (say,
  from one minigame's rules to theme content), suggest starting a new session.
  Suggest only; don't write handoff files or split unasked.
- The suggestion names the handoff documents worth writing (file name and what
  goes in each; skip what's already in the repo) and the sessions to start
  (what each does, which docs it reads first, a one-line starting prompt).
- A `UserPromptSubmit` hook (`.claude/hooks/session-length.mjs`) adds a
  reminder when context passes a set size (the ~80k base of tools and system
  prompt included). It is a reminder, not a rule that replaces judging topic
  drift.
- Session ideas worth starting fresh live in `docs/next-sessions.md`, each with
  a `Last touched` date and a starting prompt. The `SessionStart` hook
  (`stale-sessions.mjs`) shows them as a numbered menu and flags handoff files
  older than 3 days; how to start one (including renaming the session to the
  entry's heading) lives only in `.claude/commands/next.md`. Keep
  each heading short: it is the menu line. When you suggest a split, offer to
  add or refresh the entry.
